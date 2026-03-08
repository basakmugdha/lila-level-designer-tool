"""Load and parse parquet files; world-to-pixel conversion."""
import os
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

from map_config import MAP_CONFIG, world_to_pixel

# Default data root: parent of backend folder
DATA_ROOT = Path(os.environ.get("PLAYER_DATA_ROOT", Path(__file__).resolve().parent.parent))
DAYS = ["February_10", "February_11", "February_12", "February_13", "February_14"]


def _normalize_map_id(raw: str) -> str | None:
    """Return canonical map_id from MAP_CONFIG if raw matches (case-insensitive, stripped)."""
    if raw is None:
        return None
    s = str(raw).strip()
    for key in MAP_CONFIG:
        if key.lower() == s.lower():
            return key
    return None


def _ts_to_ms(series):
    """Convert ts column to milliseconds (int). Handles datetime64[ns] or int (already ms)."""
    if pd.api.types.is_integer_dtype(series.dtype):
        return series.astype("int64")
    return pd.to_datetime(series, utc=True).astype("int64") // 1_000_000


def _is_bot(user_id: str) -> bool:
    """Bots have numeric user_id; humans have UUID (with hyphens). Empty string treated as human."""
    if not user_id or not str(user_id).strip():
        return False
    return str(user_id).strip().isdigit()


def _decode_event(val) -> str:
    """Event column is stored as bytes in Parquet; decode to string. Handles already-string or None."""
    if isinstance(val, bytes):
        return val.decode("utf-8", errors="replace")
    if val is None:
        return ""
    return str(val)


def _parse_filename(name: str) -> tuple[str, str] | None:
    """Return (user_id, match_id) from filename 'user_id_match_id.nakama-0'."""
    if not name.endswith(".nakama-0"):
        return None
    base = name[:- len(".nakama-0")]
    idx = base.find("_")
    if idx == -1:
        return None
    return (base[:idx], base[idx + 1 :])


def list_days() -> list[str]:
    return [d for d in DAYS if (DATA_ROOT / d).is_dir()]


def list_matches(day: str | None = None, map_id: str | None = None) -> list[dict]:
    """List unique matches. Each entry: { match_id, day, map_id } (map_id from first file)."""
    seen = {}
    days = [day] if day else list_days()
    for d in days:
        folder = DATA_ROOT / d
        if not folder.is_dir():
            continue
        for f in folder.iterdir():
            if not f.name.endswith(".nakama-0"):
                continue
            parsed = _parse_filename(f.name)
            if not parsed:
                continue
            uid, mid = parsed
            if mid in seen:
                continue
            try:
                table = pq.read_table(f)
                df = table.to_pandas()
                if df.empty or "map_id" not in df.columns:
                    continue
                row_map = _normalize_map_id(df["map_id"].iloc[0])
                if row_map is None or (map_id and row_map != map_id):
                    continue
                seen[mid] = {"match_id": mid, "day": d, "map_id": row_map}
            except Exception:
                continue
    return list(seen.values())


def load_match(match_id: str, map_id: str) -> dict | None:
    """
    Load all player journeys for a match. Returns payload for frontend:
    {
      match_id, map_id,
      players: [ { user_id, is_bot, positions: [{ts_ms, px, py, event}], events: [{ts_ms, px, py, event}] } ],
      bounds: { ts_min_ms, ts_max_ms }
    }
    """
    cfg = MAP_CONFIG.get(map_id)
    if not cfg:
        return None

    # Find all files for this match across days
    players = []
    ts_min, ts_max = None, None

    for d in list_days():
        folder = DATA_ROOT / d
        if not folder.is_dir():
            continue
        for f in folder.iterdir():
            if not f.name.endswith(".nakama-0"):
                continue
            parsed = _parse_filename(f.name)
            if not parsed or parsed[1] != match_id:
                continue
            user_id = parsed[0]
            try:
                table = pq.read_table(f)
                df = table.to_pandas()
            except Exception:
                continue
            if df.empty or "map_id" not in df.columns:
                continue
            file_map = _normalize_map_id(df["map_id"].iloc[0])
            if file_map is None or file_map != map_id:
                continue

            df["event"] = df["event"].apply(_decode_event)
            df["ts_ms"] = _ts_to_ms(df["ts"])
            if ts_min is None:
                ts_min = df["ts_ms"].min()
                ts_max = df["ts_ms"].max()
            else:
                ts_min = min(ts_min, df["ts_ms"].min())
                ts_max = max(ts_max, df["ts_ms"].max())

            positions = []
            events = []
            position_events = {"Position", "BotPosition"}
            for _, row in df.iterrows():
                try:
                    x, z = float(row["x"]), float(row["z"])
                except (TypeError, ValueError):
                    continue
                pt = world_to_pixel(x, z, map_id)
                if pt is None:
                    continue
                px, py = pt
                rec = {"ts_ms": int(row["ts_ms"]), "px": px, "py": py, "event": row["event"]}
                if row["event"] in position_events:
                    positions.append(rec)
                else:
                    events.append(rec)

            positions.sort(key=lambda r: r["ts_ms"])
            events.sort(key=lambda r: r["ts_ms"])
            players.append({
                "user_id": user_id,
                "is_bot": _is_bot(user_id),
                "positions": positions,
                "events": events,
            })

    if not players:
        return None
    return {
        "match_id": match_id,
        "map_id": map_id,
        "players": players,
        "bounds": {"ts_min_ms": int(ts_min), "ts_max_ms": int(ts_max)},
    }


def build_heatmap(match_id: str, map_id: str, kind: str) -> dict | None:
    """
    kind: 'traffic' | 'kills' | 'deaths'
    Returns grid counts for 1024x1024 (or downsampled) for overlay.
    """
    data = load_match(match_id, map_id)
    if not data:
        return None
    # Use 64x64 grid for smaller payload and smoother heatmap
    grid_size = 64
    scale = 1024 / grid_size
    grid = [[0.0] * grid_size for _ in range(grid_size)]

    def cell(px: int, py: int):
        if 0 <= px < 1024 and 0 <= py < 1024:
            i = min(int(px / scale), grid_size - 1)
            j = min(int(py / scale), grid_size - 1)
            grid[j][i] += 1

    for p in data["players"]:
        if kind == "traffic":
            for r in p["positions"]:
                cell(r["px"], r["py"])
        elif kind == "kills":
            for r in p["events"]:
                if r["event"] in ("Kill", "BotKill"):
                    cell(r["px"], r["py"])
        elif kind == "deaths":
            for r in p["events"]:
                if r["event"] in ("Killed", "BotKilled", "KilledByStorm"):
                    cell(r["px"], r["py"])

    max_val = max(max(row) for row in grid) or 1
    return {
        "map_id": map_id,
        "kind": kind,
        "grid_size": grid_size,
        "scale": scale,
        "grid": grid,
        "max_val": max_val,
    }
