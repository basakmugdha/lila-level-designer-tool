#!/usr/bin/env python3
"""
Export parquet data to static JSON for GitHub Pages (no backend).
Writes to frontend/public/data/: index.json, match/*.json, heatmap/*.json, minimaps.
Usage (from repo root):
  PLAYER_DATA_ROOT=. python scripts/export_static_data.py [--limit N]
"""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path

# Run from repo root; backend is in backend/
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

from map_config import MAP_CONFIG  # noqa: E402
from data_loader import list_days, list_matches, load_match, build_heatmap  # noqa: E402

OUT_DIR = REPO_ROOT / "frontend" / "public" / "data"
MINIMAP_NAMES = {
    "AmbroseValley": "AmbroseValley_Minimap.png",
    "GrandRift": "GrandRift_Minimap.png",
    "Lockdown": "Lockdown_Minimap.jpg",
}


def safe_match_id(match_id: str) -> str:
    """Safe filename: replace . with _"""
    return match_id.replace(".", "_")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Max matches to export per map (0 = all)")
    args = ap.parse_args()

    data_root = Path(os.environ.get("PLAYER_DATA_ROOT", REPO_ROOT / "player_data"))
    if not data_root.is_dir():
        data_root = REPO_ROOT
    if not (data_root / "February_10").exists():
        print("Error: February_10 not found. Set PLAYER_DATA_ROOT to the folder containing the parquet data.")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "match").mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "heatmap").mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "minimaps").mkdir(parents=True, exist_ok=True)

    days = list_days()
    maps_list = [{"id": mid, "minimap_url": f"data/minimaps/{mid}{'.jpg' if mid == 'Lockdown' else '.png'}"} for mid in MAP_CONFIG]
    matches = list_matches(day=None, map_id=None)

    if args.limit > 0:
        by_map = {}
        for m in matches:
            k = m["map_id"]
            if k not in by_map:
                by_map[k] = []
            if len(by_map[k]) < args.limit:
                by_map[k].append(m)
        matches = [m for lst in by_map.values() for m in lst]

    index = {"days": days, "maps": maps_list, "matches": matches}
    (OUT_DIR / "index.json").write_text(json.dumps(index, indent=0), encoding="utf-8")
    print(f"Wrote index.json: {len(days)} days, {len(maps_list)} maps, {len(matches)} matches")

    for i, m in enumerate(matches):
        match_id, map_id = m["match_id"], m["map_id"]
        data = load_match(match_id, map_id)
        if not data:
            continue
        safe = safe_match_id(match_id)
        match_dir = OUT_DIR / "match" / map_id
        match_dir.mkdir(parents=True, exist_ok=True)
        (match_dir / f"{safe}.json").write_text(json.dumps(data, indent=0), encoding="utf-8")

        for kind in ("traffic", "kills", "deaths"):
            hm = build_heatmap(match_id, map_id, kind)
            if hm:
                hm_dir = OUT_DIR / "heatmap" / map_id / safe
                hm_dir.mkdir(parents=True, exist_ok=True)
                (hm_dir / f"{kind}.json").write_text(json.dumps(hm, indent=0), encoding="utf-8")

        if (i + 1) % 50 == 0:
            print(f"Exported {i + 1}/{len(matches)} matches...")

    minimaps_src = data_root / "minimaps"
    for mid, fname in MINIMAP_NAMES.items():
        src = minimaps_src / fname
        if src.exists():
            ext = ".jpg" if mid == "Lockdown" else ".png"
            shutil.copy2(src, OUT_DIR / "minimaps" / f"{mid}{ext}")
    print("Copied minimaps")

    print("Done. Output in frontend/public/data/")


if __name__ == "__main__":
    main()
