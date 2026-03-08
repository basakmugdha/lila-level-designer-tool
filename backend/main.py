"""FastAPI backend: API for matches, match data, heatmaps; serve minimaps and frontend."""
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from data_loader import list_days, list_matches, load_match, build_heatmap
from map_config import MAP_CONFIG

_repo_root = Path(__file__).resolve().parent.parent
_player_data = _repo_root / "player_data"
DATA_ROOT = Path(
    os.environ.get("PLAYER_DATA_ROOT", _player_data if _player_data.is_dir() else _repo_root)
)
MINIMAP_NAMES = {
    "AmbroseValley": "AmbroseValley_Minimap.png",
    "GrandRift": "GrandRift_Minimap.png",
    "Lockdown": "Lockdown_Minimap.jpg",
}

app = FastAPI(title="LILA BLACK Telemetry Viewer", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/maps")
def api_maps():
    """List map ids and minimap image URLs."""
    return {
        "maps": [
            {"id": mid, "minimap_url": f"/api/minimaps/{mid}"}
            for mid in MAP_CONFIG
        ]
    }


@app.get("/api/minimaps/{map_id}")
def api_minimap(map_id: str):
    """Serve minimap image for map_id."""
    if map_id not in MINIMAP_NAMES:
        raise HTTPException(404, "Unknown map_id")
    path = DATA_ROOT / "minimaps" / MINIMAP_NAMES[map_id]
    if not path.is_file():
        raise HTTPException(404, "Minimap file not found")
    return FileResponse(path)


@app.get("/api/days")
def api_days():
    return {"days": list_days()}


@app.get("/api/matches")
def api_matches(
    day: str | None = Query(None, description="Filter by day folder name"),
    map_id: str | None = Query(None, description="Filter by map"),
    include_stats: bool = Query(False, description="Include kills, loots, storm_deaths per match"),
):
    matches = list_matches(day=day, map_id=map_id, include_stats=include_stats)
    return {"matches": matches}


@app.get("/api/match/{match_id}")
def api_match(
    match_id: str,
    map_id: str = Query(..., description="Map id for this match"),
):
    data = load_match(match_id, map_id)
    if not data:
        raise HTTPException(404, "Match not found or no data")
    return data


@app.get("/api/heatmap/{match_id}")
def api_heatmap(
    match_id: str,
    map_id: str = Query(...),
    kind: str = Query("traffic", description="traffic | kills | deaths"),
):
    if kind not in ("traffic", "kills", "deaths"):
        raise HTTPException(400, "kind must be traffic, kills, or deaths")
    data = build_heatmap(match_id, map_id, kind)
    if not data:
        raise HTTPException(404, "Match not found or no data")
    return data


# Serve frontend build in production
frontend_build = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_build.is_dir():
    app.mount("/assets", StaticFiles(directory=frontend_build / "assets"), name="assets")

    @app.get("/{path:path}")
    def serve_spa(path: str):
        if path == "" or path == "index.html":
            return FileResponse(frontend_build / "index.html")
        f = frontend_build / path
        if f.is_file():
            return FileResponse(f)
        return FileResponse(frontend_build / "index.html")
