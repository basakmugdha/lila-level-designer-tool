"""Load and parse parquet files; world-to-pixel conversion."""
import os
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq

from map_config import MAP_CONFIG, MINIMAP_SIZE

# Default data root: repo/player_data if it exists, else parent of backend folder
_repo_root = Path(__file__).resolve().parent.parent
_player_data = _repo_root / "player_data"
DATA_ROOT = Path(
    os.environ.get("PLAYER_DATA_ROOT", _player_data if _player_data.is_dir() else _repo_root)
)
DAYS = ["February_10", "February_11", "February_12", "February_13", "February_14"]


def _world_to_pixel_series(df: pd.DataFrame, map_id: str) -> tuple[pd.Series, pd.Series]:
    """Vectorized world-to-pixel for a dataframe with x, z columns. Returns (px, py) series."""
    cfg = MAP_CONFIG.get(map_id)
    if not cfg:
        return pd.Series(dtype=int), pd.Series(dtype=int)
    scale = cfg["scale"]
    ox = cfg["origin_x"]
    oz = cfg["origin_z"]
    u = (df["x"].astype(float) - ox) / scale
    v = (df["z"].astype(float) - oz) / scale
    px = (u * MINIMAP_SIZE).astype(int).clip(0, MINIMAP_SIZE - 1)
    py = ((1 - v) * MINIMAP_SIZE).astype(int).clip(0, MINIMAP_SIZE - 1)
    return px, py


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


def _downsample_positions(positions: list[dict], interval_ms: int = 300, max_points: int = 1200) -> list[dict]:
    """Keep at most one point per interval_ms, cap at max_points. Preserves first and last."""
    if len(positions) <= max_points:
        return positions
    if len(positions) <= 2:
        return positions
    result = [positions[0]]
    last_ts = positions[0]["ts_ms"]
    for i in range(1, len(positions) - 1):
        if len(result) >= max_points:
            break
        pt = positions[i]
        if pt["ts_ms"] - last_ts >= interval_ms:
            result.append(pt)
            last_ts = pt["ts_ms"]
    if len(positions) > 1 and (not result or result[-1] is not positions[-1]):
        result.append(positions[-1])
    return result


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
    """Return all configured days so the date dropdown is consistent; days without data will show no matches."""
    return list(DAYS)


    return list(seen.values())


def get_match_stats(match_id: str, map_id: str) -> dict | None:
    """Return { kills, loots, storm_deaths } for a match by reading only event column. Returns None if match not found."""
    kills = loots = storm_deaths = 0
    found = False
    required_cols = ["event", "map_id"]
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
            found = True
            try:
                table = pq.read_table(f, columns=required_cols)
                df = table.to_pandas()
            except Exception:
                continue
            if df.empty or "map_id" not in df.columns:
                continue
            file_map = _normalize_map_id(df["map_id"].iloc[0])
            if file_map is None or file_map != map_id:
                continue
            df["event"] = df["event"].apply(_decode_event)
            for ev in df["event"]:
                if ev in ("Kill", "BotKill"):
                    kills += 1
                elif ev == "Loot":
                    loots += 1
                elif ev == "KilledByStorm":
                    storm_deaths += 1
    return {"kills": kills, "loots": loots, "storm_deaths": storm_deaths} if found else None


def list_matches(day: str | None = None, map_id: str | None = None, include_stats: bool = False) -> list[dict]:
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
                table = pq.read_table(f, columns=["map_id"])
                df = table.to_pandas()
                if df.empty or "map_id" not in df.columns:
                    continue
                row_map = _normalize_map_id(df["map_id"].iloc[0])
                if row_map is None or (map_id and row_map != map_id):
                    continue
                seen[mid] = {"match_id": mid, "day": d, "map_id": row_map}
            except Exception:
                continue
    result = list(seen.values())
    if include_stats:
        for m in result:
            stats = get_match_stats(m["match_id"], m["map_id"])
            if stats:
                m["kills"] = stats["kills"]
                m["loots"] = stats["loots"]
                m["storm_deaths"] = stats["storm_deaths"]
    return result


def load_match(match_id: str, map_id: str, downsample: bool = True) -> dict | None:
    """
    Load all player journeys for a match. Returns payload for frontend:
    {
      match_id, map_id,
      players: [ { user_id, is_bot, positions: [{ts_ms, px, py, event}], events: [...] } ],
      bounds: { ts_min_ms, ts_max_ms }
    }
    If downsample=True (default), positions are downsampled for faster load; use downsample=False for heatmaps.
    """
    cfg = MAP_CONFIG.get(map_id)
    if not cfg:
        return None

    position_events = {"Position", "BotPosition"}
    players = []
    ts_min, ts_max = None, None
    required_cols = ["x", "z", "ts", "event", "map_id"]

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
                table = pq.read_table(f, columns=required_cols)
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
            px_ser, py_ser = _world_to_pixel_series(df, map_id)
            df["px"] = px_ser
            df["py"] = py_ser

            if ts_min is None:
                ts_min = int(df["ts_ms"].min())
                ts_max = int(df["ts_ms"].max())
            else:
                ts_min = min(ts_min, int(df["ts_ms"].min()))
                ts_max = max(ts_max, int(df["ts_ms"].max()))

            pos_mask = df["event"].isin(position_events)
            positions_df = df.loc[pos_mask, ["ts_ms", "px", "py", "event"]].sort_values("ts_ms")
            events_df = df.loc[~pos_mask, ["ts_ms", "px", "py", "event"]]

            positions = [
                {"ts_ms": int(r["ts_ms"]), "px": int(r["px"]), "py": int(r["py"]), "event": r["event"]}
                for r in positions_df.to_dict("records")
            ]
            events = [
                {"ts_ms": int(r["ts_ms"]), "px": int(r["px"]), "py": int(r["py"]), "event": r["event"]}
                for r in events_df.to_dict("records")
            ]
            if downsample:
                positions = _downsample_positions(positions, interval_ms=300, max_points=1200)
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
        "bounds": {"ts_min_ms": ts_min, "ts_max_ms": ts_max},
    }


def build_heatmap(match_id: str, map_id: str, kind: str) -> dict | None:
    """
    kind: 'traffic' | 'kills' | 'deaths'
    Returns grid counts for 1024x1024 (or downsampled) for overlay.
    """
    data = load_match(match_id, map_id, downsample=False)
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
