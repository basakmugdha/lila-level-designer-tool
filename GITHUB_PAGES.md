# Deploy the Telemetry Viewer on GitHub Pages

GitHub Pages serves the app as a **static site** (no backend). Data is pre-exported to JSON so anyone can use it from the browser.

**This repo:** [basakmugdha/lila-level-designer-tool](https://github.com/basakmugdha/lila-level-designer-tool)  
**Live site (after deploy):** **https://basakmugdha.github.io/lila-level-designer-tool/**

---

## 1. One-time: export static data

The site needs the contents of `frontend/public/data/` (index, match JSONs, heatmaps, minimap images). Generate them on your machine where the parquet data lives:

```bash
# From repo root (folder that contains February_10, minimaps, backend, frontend)
pip install -r backend/requirements.txt   # if needed
PLAYER_DATA_ROOT=. python scripts/export_static_data.py --limit 50
```

- **`PLAYER_DATA_ROOT`** — Path to the folder that contains `February_10`, `February_11`, …, `minimaps/`. Use `.` if you’re already in that folder.
- **`--limit 50`** — Export up to 50 matches (keeps repo smaller). Omit for full export: `python scripts/export_static_data.py`.

After this, `frontend/public/data/` will contain:

- `index.json` — list of days, maps, matches  
- `match/<map_id>/<match_id>.json` — per-match payloads  
- `heatmap/<map_id>/<match_id>/<kind>.json` — traffic/kills/deaths  
- `minimaps/` — map images  

Commit and push this folder so the GitHub Action can build the site with real data.

---

## 2. Push the repo to GitHub

For **basakmugdha/lila-level-designer-tool**, add the remote (if needed) and push:

```bash
git remote add origin https://github.com/basakmugdha/lila-level-designer-tool.git
git add .
git commit -m "Add telemetry viewer and static data"
git push -u origin main
```

If `origin` already exists, use `git remote set-url origin https://github.com/basakmugdha/lila-level-designer-tool.git` then push. The live URL will be **https://basakmugdha.github.io/lila-level-designer-tool/**.

---

## 3. Enable GitHub Pages

1. Open the repo on GitHub.  
2. Go to **Settings** → **Pages**.  
3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).  
4. Save. You don’t need to create a branch or select a branch here; the workflow handles deployment.

---

## 4. Run the deploy workflow

- **Automatic:** Every push to `main` runs the “Deploy to GitHub Pages” workflow.  
- **Manual:** **Actions** tab → “Deploy to GitHub Pages” → **Run workflow**.

When the workflow finishes, the site is live at:

**`https://basakmugdha.github.io/lila-level-designer-tool/`**

(For any repo, the pattern is `https://<username>.github.io/<repo-name>/`.)

---

## 5. If the repo name changes

The site base path is `/<repo-name>/`. The workflow passes this to the build with:

`--base=/${{ github.event.repository.name }}/`

So if you rename the repo on GitHub, the next deploy will use the new name and the site will still work at the new URL.

---

## 6. Troubleshooting

| Issue | What to do |
|-------|------------|
| **Blank page or 404** | Confirm Pages source is **GitHub Actions**. Wait for the workflow to complete and open the URL from the workflow summary (or Settings → Pages). |
| **No matches in the app** | Ensure `frontend/public/data/index.json` has a non-empty `matches` array. Re-run the export script and commit the updated `frontend/public/data/`. |
| **Minimap images missing** | Export script copies from `PLAYER_DATA_ROOT/minimaps/`. Ensure that folder exists and contains the map images, then re-run the script. |
| **Export script fails** | Set `PLAYER_DATA_ROOT` to the directory that contains `February_10`, `February_11`, etc. Install backend deps: `pip install -r backend/requirements.txt`. |

---

## Summary

1. Run `PLAYER_DATA_ROOT=. python scripts/export_static_data.py [--limit N]`.  
2. Commit and push `frontend/public/data/` (and the rest of the repo).  
3. Settings → Pages → Source: **GitHub Actions**.  
4. Push to `main` (or run the workflow).  
5. Use the URL: **https://basakmugdha.github.io/lila-level-designer-tool/**
