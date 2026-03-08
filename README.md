# LILA BLACK — Level Design Telemetry

View player movement, combat, and storm deaths on map minimaps. Select map, date, and match; use playback and heatmap overlays (traffic, kills, deaths).

## Run locally

**Backend** (serves API + parquet data; needs `player_data/` with parquet files, or set `PLAYER_DATA_ROOT`):

```bash
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

**Frontend** (dev; proxy to backend on port 8000):

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. For Node 18, use Node 20+ for `npm run build`.

## Static export (e.g. GitHub Pages)

From repo root, with parquet data in `player_data/`:

```bash
pip install -r backend/requirements.txt
PLAYER_DATA_ROOT=./player_data python scripts/export_static_data.py --limit 50
```

Commit `frontend/public/data/`, set `VITE_USE_STATIC=true` for the frontend build, then deploy `frontend/dist` (or use the repo’s GitHub Actions workflow).

## Data

See `player_data/README.md` for parquet schema and map config.
