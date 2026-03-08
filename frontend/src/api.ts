/** API base: /api when using backend, or BASE_URL + 'data/' for static (GitHub Pages). */
const USE_STATIC = import.meta.env.VITE_USE_STATIC === 'true';
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/*$/, '/');

function dataUrl(path: string): string {
  return `${BASE}data/${path.replace(/^\//, '')}`;
}

function safeMatchId(matchId: string): string {
  return matchId.replace(/\./g, '_');
}

/** Cached static index (maps, days, matches) – loaded once so all matches are available for filtering. */
type StaticIndex = { maps: MapInfo[]; days: string[]; matches: MatchInfo[] };
let staticIndexPromise: Promise<StaticIndex> | null = null;

function getStaticIndex(): Promise<StaticIndex> {
  if (!USE_STATIC) return Promise.reject(new Error('Not static mode'));
  if (!staticIndexPromise) {
    staticIndexPromise = fetch(dataUrl('index.json'))
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch index');
        return r.json();
      })
      .then((idx) => ({
        maps: idx.maps || [],
        days: idx.days || [],
        matches: (idx.matches as MatchInfo[]) || [],
      }));
  }
  return staticIndexPromise;
}

const matchCache = new Map<string, MatchData>();
const MATCH_CACHE_MAX = 20;

export type MapInfo = { id: string; minimap_url: string };
export type MatchInfo = { match_id: string; day: string; map_id: string };

export type PositionPoint = { ts_ms: number; px: number; py: number; event: string };
export type PlayerJourney = {
  user_id: string;
  is_bot: boolean;
  positions: PositionPoint[];
  events: PositionPoint[];
};
export type MatchData = {
  match_id: string;
  map_id: string;
  players: PlayerJourney[];
  bounds: { ts_min_ms: number; ts_max_ms: number };
};

export type HeatmapData = {
  map_id: string;
  kind: 'traffic' | 'kills' | 'deaths';
  grid_size: number;
  scale: number;
  grid: number[][];
  max_val: number;
};

export async function fetchMaps(): Promise<{ maps: MapInfo[] }> {
  if (USE_STATIC) {
    const idx = await getStaticIndex();
    return { maps: idx.maps };
  }
  const r = await fetch('/api/maps');
  if (!r.ok) throw new Error('Failed to fetch maps');
  return r.json();
}

export async function fetchDays(): Promise<{ days: string[] }> {
  if (USE_STATIC) {
    const idx = await getStaticIndex();
    return { days: idx.days };
  }
  const r = await fetch('/api/days');
  if (!r.ok) throw new Error('Failed to fetch days');
  return r.json();
}

export async function fetchMatches(day?: string, map_id?: string): Promise<{ matches: MatchInfo[] }> {
  if (USE_STATIC) {
    const idx = await getStaticIndex();
    let list = idx.matches;
    if (day) list = list.filter((m) => String(m.day || '').trim() === String(day).trim());
    if (map_id) list = list.filter((m) => String(m.map_id || '').trim() === String(map_id).trim());
    return { matches: list };
  }
  const params = new URLSearchParams();
  if (day) params.set('day', day);
  if (map_id) params.set('map_id', map_id);
  const r = await fetch(`/api/matches?${params}`);
  if (!r.ok) throw new Error('Failed to fetch matches');
  return r.json();
}

export async function fetchMatch(match_id: string, map_id: string): Promise<MatchData> {
  const key = `${map_id}:${match_id}`;
  const cached = matchCache.get(key);
  if (cached) return cached;

  let data: MatchData;
  if (USE_STATIC) {
    const r = await fetch(dataUrl(`match/${map_id}/${safeMatchId(match_id)}.json`));
    if (!r.ok) throw new Error('Match not found');
    data = await r.json();
  } else {
    const r = await fetch(`/api/match/${encodeURIComponent(match_id)}?map_id=${encodeURIComponent(map_id)}`);
    if (!r.ok) throw new Error('Match not found');
    data = await r.json();
  }
  matchCache.set(key, data);
  if (matchCache.size > MATCH_CACHE_MAX) {
    const first = matchCache.keys().next().value;
    if (first) matchCache.delete(first);
  }
  return data;
}

const heatmapCache = new Map<string, HeatmapData>();

export async function fetchHeatmap(match_id: string, map_id: string, kind: 'traffic' | 'kills' | 'deaths'): Promise<HeatmapData> {
  const key = `${map_id}:${match_id}:${kind}`;
  const cached = heatmapCache.get(key);
  if (cached) return cached;

  let data: HeatmapData;
  if (USE_STATIC) {
    const r = await fetch(dataUrl(`heatmap/${map_id}/${safeMatchId(match_id)}/${kind}.json`));
    if (!r.ok) throw new Error('Heatmap failed');
    data = await r.json();
  } else {
    const r = await fetch(`/api/heatmap/${encodeURIComponent(match_id)}?map_id=${encodeURIComponent(map_id)}&kind=${kind}`);
    if (!r.ok) throw new Error('Heatmap failed');
    data = await r.json();
  }
  heatmapCache.set(key, data);
  return data;
}

export function minimapUrl(mapId: string): string {
  if (USE_STATIC) {
    const ext = mapId === 'Lockdown' ? '.jpg' : '.png';
    return dataUrl(`minimaps/${mapId}${ext}`);
  }
  return `/api/minimaps/${mapId}`;
}

/** Preload minimap image so it's ready when a match is selected. Call when map changes. */
export function preloadMinimap(mapId: string): void {
  if (!mapId) return;
  const url = minimapUrl(mapId);
  const img = new Image();
  img.src = url;
}
