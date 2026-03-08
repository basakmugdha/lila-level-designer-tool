# Data Nuances & Edge Cases

This doc describes how the telemetry viewer handles the LILA BLACK parquet data nuances and edge cases (coordinate mapping, encoding, bot detection, timestamps), and how we verify correctness.

---

## 1. Coordinate mapping

### Spec (from README)

- Use **x** and **z** only for 2D minimap; **y** is elevation and is not used for plotting.
- Formula: `u = (x - origin_x) / scale`, `v = (z - origin_z) / scale`, then `pixel_x = u * 1024`, `pixel_y = (1 - v) * 1024` (Y flipped for image top-left origin).
- Map config: AmbroseValley (900, -370, -473), GrandRift (581, -290, -290), Lockdown (1000, -500, -500).

### Implementation

- **Backend** (`map_config.py`): `world_to_pixel(x, z, map_id)` implements the exact formula. We **clamp** resulting `(pixel_x, pixel_y)` to `[0, 1023]` so out-of-bounds world coords (e.g. outside playable area) don’t produce invalid pixels or break the heatmap grid.
- **Frontend**: Receives pixel coords from the API and draws at `(px * scale, py * scale)` where `scale = canvasSize / 1024`. No coordinate math in the client.

### Edge cases

| Case | Handling |
|------|----------|
| Unknown `map_id` | `world_to_pixel` returns `None`; that row is skipped (no point sent to frontend). |
| World coords outside map | Clamped to minimap bounds so paths/events still render on the map. |
| Missing or non-numeric x/z | `float(row["x"])` can raise; we rely on parquet schema. Could add try/except and skip row if needed. |

---

## 2. Event column (bytes encoding)

### Spec (from README)

- The `event` column is stored as **binary (bytes)** in Parquet. Decode with `.decode('utf-8')` to get readable strings.

### Implementation

- **Backend** (`data_loader.py`): `_decode_event(val)`:
  - If `isinstance(val, bytes)` → `val.decode("utf-8", errors="replace")`.
  - If `val is None` → `""`.
  - Otherwise → `str(val)` (handles already-string or other types from different parquet writers).
- Decoded event is used for:
  - Splitting into **positions** (`Position`, `BotPosition`) vs **events** (Kill, Killed, BotKill, BotKilled, KilledByStorm, Loot).
  - Heatmap kind (kills vs deaths).
  - Frontend legend and marker color.

### Edge cases

| Case | Handling |
|------|----------|
| Invalid UTF-8 | `errors="replace"` avoids crashes; replacement chars may show as odd labels. |
| Unknown event type | Treated as non-position → goes into `events[]`; frontend draws with fallback color `#888`. |
| Empty or missing event | Decoded as `""`; not in `position_events` → goes to events list; frontend can show as gray. |

---

## 3. Bot detection

### Spec (from README)

- **Human:** `user_id` is a UUID (e.g. `f4e072fa-b7af-4761-b567-1d95b7ad0108`).
- **Bot:** `user_id` is a short **numeric** ID (e.g. `1440`, `382`).

### Implementation

- **Backend**: `_is_bot(user_id)`:
  - After `str(user_id).strip()`, returns `True` only if the string is **non-empty and `.isdigit()`**.
  - UUIDs contain hyphens → `isdigit()` is False → human. Numeric strings → bot.
- **Frontend**: Human path color `#06d6a0`, bot path `#8d99ae`; line width differs slightly.

### Edge cases

| Case | Handling |
|------|----------|
| Empty or whitespace `user_id` | Treated as human (`False`) to avoid hiding bad data. |
| UUID without hyphens | Would be treated as human (non-digit). If data ever uses numeric-only “human” ids, logic would need to change. |
| Leading zeros (e.g. `"01440"`) | Still `isdigit()` → bot. |

---

## 4. Timestamps

### Spec (from README)

- `ts` is stored as **timestamp (ms)**. It represents **time elapsed within the match**, not wall-clock time. Events in the same match are ordered by `ts` to reconstruct the timeline.

### Implementation

- **Backend**: `_ts_to_ms(series)`:
  - If column is **integer** (e.g. Parquet stored as int64 ms): use as-is (already milliseconds).
  - If **datetime64**: convert to nanoseconds (pandas internal), then `// 1_000_000` to get milliseconds.
- All positions and events are **sorted by `ts_ms`** before sending so the frontend can:
  - Draw paths in correct time order (no zigzags).
  - Use a single `currentTimeMs` to trim paths and show only events up to that time for playback.

### Edge cases

| Case | Handling |
|------|----------|
| Parquet TIMESTAMP_MICROS | Would be interpreted as datetime; we’d get ns then // 1_000_000 → ms. If the column were actually microseconds, we’d need // 1000; README says ms so we assume ms. |
| Mixed timezones | `pd.to_datetime(..., utc=True)` normalizes to UTC; ordering is preserved. |
| Out-of-order rows | We sort positions and events by `ts_ms` so playback and path order are correct. |

---

## 5. Filename parsing

### Spec (from README)

- Filename: `{user_id}_{match_id}.nakama-0`. Human `user_id` = UUID; bot = numeric. `match_id` includes `.nakama-0` in the filename stem (e.g. `...uuid.nakama-0`).

### Implementation

- **Backend**: `_parse_filename(name)`:
  - Requires `name.endswith(".nakama-0")`.
  - Splits on the **first** underscore: `user_id = base[:idx]`, `match_id = base[idx+1:]`.
  - Assumption: `user_id` contains no underscore (UUID has hyphens, bot is numeric). If a future `user_id` had an underscore, we’d mis-split.

### Edge cases

| Case | Handling |
|------|----------|
| No underscore in base | Returns `None`; file skipped. |
| Wrong extension | Ignored (not `.nakama-0`). |

---

## 6. Map ID and filtering

### Implementation

- **Backend**: `_normalize_map_id(raw)` returns the **canonical** key from `MAP_CONFIG` (AmbroseValley, GrandRift, Lockdown) if `raw` matches **case-insensitively** after strip; otherwise `None`.
- `list_matches` and `load_match` use this so:
  - Rows with `map_id` like `"ambrosevalley"` or `" AmbroseValley "` still match when filtering by `AmbroseValley`.
  - API always returns and expects canonical map ids.

### Edge cases

| Case | Handling |
|------|----------|
| Typo or unknown map name | `_normalize_map_id` returns `None`; file/match excluded. |
| Missing `map_id` column | Row/file skipped. |

---

## 7. Events rendered accurately

- **Position vs event split**: Only `Position` and `BotPosition` go into the path; all other 6 event types (Kill, Killed, BotKill, BotKilled, KilledByStorm, Loot) are discrete markers with distinct colors.
- **Heatmaps**: Traffic = all position points; Kills = Kill + BotKill; Deaths = Killed + BotKilled + KilledByStorm. Same pixel coords as used for paths and markers.
- **Timeline**: Slider and playback use `bounds.ts_min_ms` and `bounds.ts_max_ms`; only positions/events with `ts_ms <= currentTimeMs` are drawn, so playback reflects the actual event order after sorting.

---

## 8. Summary checklist

| Nuance | Correct? | Notes |
|--------|----------|--------|
| Coordinates (x, z) only, correct formula | Yes | Implemented per README; clamping for out-of-bounds. |
| Event bytes → string | Yes | Decode with UTF-8 replace; fallback for None/string. |
| Bot = numeric user_id | Yes | `isdigit()`; empty treated as human. |
| Timestamps in ms, match-relative | Yes | Integer ms or datetime→ms; sorted by ts_ms. |
| Paths in time order | Yes | Positions sorted by ts_ms before send. |
| Event markers and heatmaps use same coords | Yes | Same world_to_pixel pipeline; heatmap clamps in cell(). |
| map_id casing / whitespace | Yes | Normalized to canonical map id. |
