import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchMaps, fetchMatches, fetchMatch, fetchHeatmap, minimapUrl, preloadMinimap, getDaysForMap, prefetchMatch } from './api';
import type { MatchData, HeatmapData, MatchInfo } from './api';
import { MapView } from './MapView';
import { Filters, type MatchFilterKind } from './Filters';
import { Timeline } from './Timeline';
import { HeatmapControls, type HeatmapKind } from './HeatmapControls';
import { Legend } from './Legend';
import { MatchSummary } from './MatchSummary';
import { ViewOptions, type EventTypeFilter } from './ViewOptions';
import './App.css';

const PLAYBACK_INTERVAL_MS = 100;
const PLAYBACK_SPEED = 0.5; // fraction of real time

const DEFAULT_EVENT_TYPES: EventTypeFilter = new Set([
  'Kill', 'Killed', 'BotKill', 'BotKilled', 'KilledByStorm', 'Loot',
]);

export default function App() {
  const [maps, setMaps] = useState<{ id: string; minimap_url: string }[]>([]);
  const [matchesForMap, setMatchesForMap] = useState<MatchInfo[]>([]);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [selectedMapId, setSelectedMapId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [heatmapDataMap, setHeatmapDataMap] = useState<Record<HeatmapKind, HeatmapData | null>>({ traffic: null, kills: null, deaths: null });
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [heatmapKinds, setHeatmapKinds] = useState<Set<HeatmapKind>>(new Set());
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showOnlyHumanPaths, setShowOnlyHumanPaths] = useState(false);
  const [eventTypesShown, setEventTypesShown] = useState<EventTypeFilter>(DEFAULT_EVENT_TYPES);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintMapsForDay, setHintMapsForDay] = useState<string[]>([]);
  const [matchFilter, setMatchFilter] = useState<MatchFilterKind>('default');

  useEffect(() => {
    Promise.all([fetchMaps()])
      .then(([mapsRes]) => {
        setMaps(mapsRes.maps);
        if (mapsRes.maps.length && !selectedMapId) setSelectedMapId(mapsRes.maps[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  useEffect(() => {
    if (!selectedMapId) {
      setMatchesForMap([]);
      setMatches([]);
      setHintMapsForDay([]);
      return;
    }
    setError(null);
    setLoadingMatches(true);
    setHintMapsForDay([]);
    setMatchFilter('default');
    preloadMinimap(selectedMapId);
    fetchMatches(undefined, selectedMapId, true)
      .then((r) => {
        setMatchesForMap(r.matches);
        const daysForMap = getDaysForMap(r.matches);
        const effectiveDay = daysForMap[0] || '';
        setSelectedDay(effectiveDay);
        setMatches(r.matches.filter((m) => m.day === effectiveDay));
        setSelectedMatchId('');
        if (r.matches.length > 0) {
          const first = r.matches[0];
          prefetchMatch(first.match_id, first.map_id);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load matches'))
      .finally(() => setLoadingMatches(false));
  }, [selectedMapId]);

  useEffect(() => {
    if (!selectedMapId || !matchesForMap.length) return;
    const filtered = matchesForMap.filter((m) => m.day === selectedDay);
    setMatches(filtered);
    setSelectedMatchId('');
    if (filtered.length > 0) {
      const first = filtered[0];
      prefetchMatch(first.match_id, first.map_id);
    }
  }, [selectedMapId, selectedDay, matchesForMap]);

  useEffect(() => {
    if (matchFilter === 'default' || matches.length === 0) return;
    const key = matchFilter === 'maxKills' ? 'kills' : matchFilter === 'maxLoots' ? 'loots' : 'storm_deaths';
    const sorted = [...matches].sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0));
    setSelectedMatchId(sorted[0].match_id);
  }, [matchFilter, matches]);

  useEffect(() => {
    if (!selectedMatchId || !selectedMapId) {
      setMatchData(null);
      setHeatmapDataMap({ traffic: null, kills: null, deaths: null });
      return;
    }
    setLoadingMatch(true);
    setError(null);
    fetchMatch(selectedMatchId, selectedMapId)
      .then((data) => {
        setMatchData(data);
        setCurrentTimeMs(data.bounds.ts_min_ms);
        setHeatmapDataMap({ traffic: null, kills: null, deaths: null });
        setEventTypesShown(DEFAULT_EVENT_TYPES);
      })
      .catch((e) => {
        setMatchData(null);
        setError(e instanceof Error ? e.message : 'Failed to load match');
      })
      .finally(() => setLoadingMatch(false));
  }, [selectedMatchId, selectedMapId]);

  useEffect(() => {
    if (!heatmapEnabled || heatmapKinds.size === 0 || !selectedMatchId || !selectedMapId) {
      setHeatmapDataMap((prev) => (Object.keys(prev).length ? { traffic: null, kills: null, deaths: null } : prev));
      setHeatmapLoading(false);
      return;
    }
    setHeatmapLoading(true);
    const kinds = Array.from(heatmapKinds);
    Promise.all(kinds.map((kind) => fetchHeatmap(selectedMatchId, selectedMapId, kind)))
      .then((results) => {
        const next: Record<HeatmapKind, HeatmapData | null> = { traffic: null, kills: null, deaths: null };
        kinds.forEach((kind, i) => {
          next[kind] = results[i] ?? null;
        });
        setHeatmapDataMap(next);
      })
      .catch(() => setHeatmapDataMap({ traffic: null, kills: null, deaths: null }))
      .finally(() => setHeatmapLoading(false));
  }, [heatmapEnabled, heatmapKinds, selectedMatchId, selectedMapId]);

  const heatmapsForView = useMemo(
    () => (heatmapEnabled ? [heatmapDataMap.traffic, heatmapDataMap.kills, heatmapDataMap.deaths].filter(Boolean) as HeatmapData[] : []),
    [heatmapEnabled, heatmapDataMap.traffic, heatmapDataMap.kills, heatmapDataMap.deaths]
  );

  const bounds = matchData?.bounds ?? null;

  const overlayAvailability = (() => {
    if (!matchData) return { traffic: false, kills: false, deaths: false };
    let traffic = false;
    let kills = false;
    let deaths = false;
    for (const p of matchData.players) {
      if (p.positions.length > 0) traffic = true;
      for (const ev of p.events) {
        if (ev.event === 'Kill' || ev.event === 'BotKill') kills = true;
        if (ev.event === 'Killed' || ev.event === 'BotKilled' || ev.event === 'KilledByStorm') deaths = true;
      }
      if (traffic && kills && deaths) break;
    }
    return { traffic, kills, deaths };
  })();

  useEffect(() => {
    if (!matchData) return;
    const next = new Set(heatmapKinds);
    if (!overlayAvailability.traffic) next.delete('traffic');
    if (!overlayAvailability.kills) next.delete('kills');
    if (!overlayAvailability.deaths) next.delete('deaths');
    if (next.size !== heatmapKinds.size) setHeatmapKinds(next);
  }, [matchData, heatmapKinds, overlayAvailability.traffic, overlayAvailability.kills, overlayAvailability.deaths]);

  const tick = useCallback(() => {
    if (!bounds) return;
    const next = currentTimeMs + PLAYBACK_INTERVAL_MS * PLAYBACK_SPEED;
    if (next >= bounds.ts_max_ms) {
      setCurrentTimeMs(bounds.ts_max_ms);
      setPlaying(false);
    } else {
      setCurrentTimeMs(next);
    }
  }, [currentTimeMs, bounds]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(tick, PLAYBACK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [playing, tick]);

  return (
    <div className="app">
      <header className="app__header">
        <h1><span className="app__brand">LILA BLACK</span> — Level Design Telemetry</h1>
        <p className="app__header-desc">Explore player movement, combat, and storm deaths on the map. Select a map, date, and match to view player journeys and enable playback.</p>
      </header>

      {error && (
        <div className="app__error" role="alert">
          {error}
        </div>
      )}

      <div className="app__controls">
        <div className="card">
          <p className="card__title">Choose match</p>
          <Filters
            maps={maps}
            days={selectedMapId ? getDaysForMap(matchesForMap) : []}
            matches={matches}
            selectedMapId={selectedMapId}
            selectedDay={selectedDay}
            selectedMatchId={selectedMatchId}
            onMapChange={(id) => { setSelectedMapId(id); setError(null); }}
            onDayChange={(d) => { setSelectedDay(d); setError(null); }}
            onMatchChange={setSelectedMatchId}
            loadingMatches={loadingMatches}
            hintMapsForDay={hintMapsForDay}
            matchFilter={matchFilter}
            onMatchFilterChange={setMatchFilter}
          />
        </div>
      </div>

      <div className="app__main">
        <aside className="app__legend-column" aria-label="Map legend">
          <div className="legend-column__inner">
            <span className="legend-column__title">Legend</span>
            <Legend />
            {matchData && (
              <div className="legend-column__summary">
                <span className="legend-column__title">Summary</span>
                <MatchSummary data={matchData} />
              </div>
            )}
          </div>
        </aside>
        <div className="app__map-area">
          <div className={`map-view${loadingMatch && selectedMatchId ? ' map-view--loading' : ''}`}>
            <MapView
              matchData={matchData}
              currentTimeMs={currentTimeMs}
              heatmaps={heatmapsForView}
              minimapUrl={selectedMapId ? minimapUrl(selectedMapId) : ''}
              showOnlyHumanPaths={showOnlyHumanPaths}
              eventTypesShown={eventTypesShown}
            />
          </div>
          {(loadingMatch && selectedMatchId) || (heatmapLoading && heatmapEnabled && heatmapKinds.size > 0) ? (
            <div className="map-loading-overlay" role="status" aria-live="polite" aria-busy="true">
              <div className="map-loading-overlay__spinner" aria-hidden />
              <span className="map-loading-overlay__text">
                {loadingMatch && selectedMatchId ? 'Loading match…' : 'Loading overlay…'}
              </span>
            </div>
          ) : null}
        </div>
        <aside className="app__sidebar">
          <div className="card">
            <p className="card__title">Overlays</p>
            <HeatmapControls
              heatmapEnabled={heatmapEnabled}
              onHeatmapEnabledChange={setHeatmapEnabled}
              heatmapKinds={heatmapKinds}
              onHeatmapKindsChange={setHeatmapKinds}
              disabled={!matchData || loadingMatch}
              heatmapLoading={heatmapLoading}
              availableOverlays={overlayAvailability}
            />
          </div>
          <div className="card">
            <p className="card__title">Display options</p>
            <ViewOptions
              showOnlyHumans={showOnlyHumanPaths}
              onShowOnlyHumansChange={setShowOnlyHumanPaths}
              eventGroupsShown={eventTypesShown}
              onEventGroupsShownChange={setEventTypesShown}
              disabled={!matchData || loadingMatch}
            />
          </div>
        </aside>
      </div>

      <Timeline
        bounds={bounds}
        currentTimeMs={currentTimeMs}
        onSeek={setCurrentTimeMs}
        playing={playing}
        onPlayPause={() => setPlaying((p) => !p)}
      />
    </div>
  );
}
