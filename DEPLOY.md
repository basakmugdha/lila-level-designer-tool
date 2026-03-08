# Deployment — LILA BLACK Telemetry Viewer

## Quick: Make the tool functional (local + shareable link)

- **Data location:** Parquet data lives in `player_data/` (February_10 … February_14, minimaps). The backend and export script default to `player_data/` when present, so no env var is required for local runs from the repo root.
- **Local (full parquet):** Start the backend, then the frontend. Pick **Map**, **Date**, and **Match**; the minimap, player paths, event markers, timeline, and heatmaps will work.
- **Shareable link (GitHub Pages, static):** Export static JSON once, then deploy:
  ```bash
  # From repo root (install backend deps if needed: pip install -r backend/requirements.txt)
  python3 scripts/export_static_data.py --limit 50
  ```
  Commit `frontend/public/data/`, enable GitHub Pages (Source: GitHub Actions), and push. The site will have days and matches; users pick map, date, match and use playback and heatmaps as with the local backend.

---

The app can be deployed in two ways:

- **GitHub Pages (static, no server)** — Best for a shareable public link. Data is pre-exported to JSON. See **[GITHUB_PAGES.md](GITHUB_PAGES.md)** for step-by-step setup.
- **Backend + frontend (single server)** — Backend serves API and the built frontend; data lives on the server. Options below.

---

## Option 1: Run locally (development)

**Terminal 1 — Backend** (uses `player_data/` by default if present)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Optional: export PLAYER_DATA_ROOT=/path/to/player_data   # default: repo root or repo/player_data
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend** (with proxy to backend)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the backend.

---

## Option 2: Run locally (production build)

1. Build frontend:

   ```bash
   cd frontend && npm run build
   ```

2. Run backend (serves `frontend/dist` and API):

   ```bash
   cd backend
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   export PLAYER_DATA_ROOT=/path/to/player_data
   uvicorn main:app --port 8000
   ```

3. Open **http://localhost:8000**.

---

## Option 3: Docker (single container)

1. Build frontend: `cd frontend && npm run build`
2. From repo root:

   ```bash
   docker build -t lila-telemetry .
   docker run -p 8000:8000 -v /absolute/path/to/player_data:/data lila-telemetry
   ```

3. Open **http://localhost:8000**. Share this URL (or your host’s public URL) for a shareable link.

The container expects the **player_data** folder (with `February_10`, `February_11`, …, `minimaps/`) mounted at `/data`.

---

## Option 4: Deploy to a host (shareable link)

### Render

1. Connect your repo. Create a **Web Service**.
2. **Build**: Docker (use the repo Dockerfile) or Native:
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Start command**: `cd backend && pip install -r requirements.txt && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Set **Root directory** to the repo root; set env var `PLAYER_DATA_ROOT` to the path where Render will have the data (e.g. persistent disk mount).
3. Mount or upload the `player_data` folder (February_10–14 + minimaps) so the backend can read it.
4. Render assigns a URL like `https://your-service.onrender.com` — that is your **shareable link**.

### Railway / Fly.io / Heroku

- Use the same idea: run the backend (and serve frontend from `frontend/dist`), set `PLAYER_DATA_ROOT` to the path where the parquet data and `minimaps/` live.
- If the platform doesn’t support large file storage, pre-process parquet into JSON elsewhere and serve from the app, or use a separate data store and keep only minimap images in the app.

### Static frontend + separate API

- Deploy the **backend** to any Python host (Render, Railway, etc.) and point `PLAYER_DATA_ROOT` at the data.
- Build the frontend with the API base URL set to that backend (e.g. `VITE_API_URL=https://your-api.onrender.com` and use it in `api.ts`).
- Deploy the **frontend** (e.g. Vercel, Netlify) as a static site. Your **shareable link** is the frontend URL.

---

## Checklist for a shareable link

- [ ] Backend is reachable at a public URL (or same origin as the frontend).
- [ ] `PLAYER_DATA_ROOT` points to a directory containing `February_10`, `February_11`, …, `February_14`, and `minimaps/`.
- [ ] Frontend is built and either served by the backend or deployed with the correct API base URL.
- [ ] Share the single URL (e.g. `https://your-app.onrender.com`) with Level Design.
