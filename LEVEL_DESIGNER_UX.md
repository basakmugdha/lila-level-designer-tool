# Level Designer UX — What’s Useful & What’s Filterable

This doc is for Level Design: what the telemetry viewer gives you, what you can filter and interact with, and what’s still missing.

---

## What the tool answers (problem statement)

| Need | How the tool helps |
|------|--------------------|
| **Where do players move?** | Paths on the minimap (green = human, gray = bot). Traffic heatmap for high-traffic areas. Timeline playback to watch movement over time. |
| **Where do fights break out?** | Kill/death event markers (red/orange). “Kills” and “Deaths” heatmap overlays. Event filters to show only Kills or only Deaths to reduce clutter. |
| **Where do people die to the storm?** | Purple “KilledByStorm” markers. “Deaths” heatmap includes storm deaths. “Show events” includes “Storm deaths” toggle. |
| **Which areas get ignored?** | Traffic heatmap: **low or no traffic = ignored**. Turn heatmap to “Traffic” and look for empty/cold areas. |

---

## What’s filterable and interactive

| Control | What it does |
|---------|----------------|
| **Map** | Choose AmbroseValley, GrandRift, or Lockdown. Minimap and data switch to that map. |
| **Date** | Filter by day (February 10–14). Match list updates to that day (and selected map). |
| **Match** | Pick one match from the list. Loads all player journeys for that match; summary and map update. |
| **Heatmap overlay** | Off / Traffic / Kills / Deaths. One at a time. Overlay shows density on the minimap. |
| **Show only human paths** | When checked, only human player paths are drawn. Bots are hidden so you can focus on real player flow. |
| **Show events** | Checkboxes: Kills, Deaths, Storm deaths, Loot. Uncheck to hide that event type on the map (e.g. only storm deaths). |
| **Timeline** | Slider + Play/Pause. Scrub or play the match; paths and markers appear up to the current time. |
| **Match summary** | After loading a match: player count (human vs bot), total kills, storm deaths. Lets you see what kind of match it is before inspecting the map. |

---

## What’s not there yet (gaps)

| Gap | Why it matters | Possible improvement |
|-----|----------------|----------------------|
| **Match discovery** | Match dropdown is a long list of IDs; hard to find “interesting” matches (e.g. most kills, most storm deaths). | Add a small index or API that surfaces “top N by kills” or “matches with storm deaths” so designers can pick meaningfully. |
| **Zoom / pan** | Minimap is fixed size; can’t zoom into a hot zone for detail. | Add zoom and pan on the map canvas (e.g. wheel zoom, drag to pan). |
| **Low-activity view** | “Ignored” areas = low traffic, but you have to infer from the traffic heatmap. | Optional “Low activity” or inverted traffic view to highlight underused areas. |
| **Compare matches** | One match at a time. Can’t compare two matches or two days side by side. | Future: second panel or overlay comparison (would need more UI and possibly backend support). |

---

## Quick workflow for Level Design

1. **Pick map + date** → see matches for that day on that map.
2. **Pick a match** → read the summary (players, kills, storm deaths).
3. **Use “Show only human paths”** if you care about real player flow more than bots.
4. **Use “Show events”** to focus (e.g. only Storm deaths to see where the zone kills people).
5. **Turn on a heatmap** (Traffic / Kills / Deaths) to see density; cold spots on Traffic = ignored areas.
6. **Use Play** or the slider to watch the match unfold and see when/where events happen.

---

**Summary:** The tool is built so a Level Designer can filter by map, date, and match; see human-only paths and filter event types; use heatmaps and timeline playback; and infer ignored areas from low traffic. The main missing pieces are better match discovery (e.g. “bloody” or “storm-heavy” matches), zoom/pan, and an explicit “low activity” view.
