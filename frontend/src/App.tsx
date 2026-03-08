import { useState, useEffect, useCallback } from 'react';
import { fetchMaps, fetchMatches, fetchMatch, fetchHeatmap, minimapUrl, preloadMinimap, getDaysForMap } from './api';
import type { MatchData, HeatmapData } from './api';
import { MapView } from './MapView';
import { Filters } from './Filters';
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
  const [matchesForMap, setMatchesForMap] = useState<{ match_id: string; day: string; map_id: string }[]>([]);
  const [matches, setMatches] = useState<{ match_id: string; day: string; map_id: string }[]>([]);
  const [selectedMapId, setSelectedMapId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [heatmapKind, setHeatmapKind] = useState<HeatmapKind>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showOnlyHumanPaths, setShowOnlyHumanPaths] = useState(false);
  const [eventTypesShown, setEventTypesShown] = useState<EventTypeFilter>(DEFAULT_EVENT_TYPES);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintMapsForDay, setHintMapsForDay] = useState<string[]>([]);

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
    preloadMinimap(selectedMapId);
    fetchMatches(undefined, selectedMapId)
      .then((r) => {
        setMatchesForMap(r.matches);
        const daysForMap = getDaysForMap(r.matches);
        const effectiveDay = daysForMap[0] || '';
        setSelectedDay(effectiveDay);
        setMatches(r.matches.filter((m) => m.day === effectiveDay));
        setSelectedMatchId('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load matches'))
      .finally(() => setLoadingMatches(false));
  }, [selectedMapId]);

  useEffect(() => {
    if (!selectedMapId || !matchesForMap.length) return;
    const filtered = matchesForMap.filter((m) => m.day === selectedDay);
    setMatches(filtered);
    setSelectedMatchId('');
  }, [selectedMapId, selectedDay, matchesForMap]);

  useEffect(() => {
    if (!selectedMatchId || !selectedMapId) {
      setMatchData(null);
      setHeatmapData(null);
      setHeatmapKind(null);
      return;
    }
    setLoadingMatch(true);
    setError(null);
    fetchMatch(selectedMatchId, selectedMapId)
      .then((data) => {
        setMatchData(data);
        setCurrentTimeMs(data.bounds.ts_min_ms);
        setHeatmapData(null);
        setHeatmapKind(null);
        setEventTypesShown(DEFAULT_EVENT_TYPES);
      })
      .catch((e) => {
        setMatchData(null);
        setError(e instanceof Error ? e.message : 'Failed to load match');
      })
      .finally(() => setLoadingMatch(false));
  }, [selectedMatchId, selectedMapId]);

  useEffect(() => {
    if (!heatmapKind || !selectedMatchId || !selectedMapId) {
      setHeatmapData(null);
      setHeatmapLoading(false);
      return;
    }
    setHeatmapLoading(true);
    fetchHeatmap(selectedMatchId, selectedMapId, heatmapKind)
      .then(setHeatmapData)
      .catch(() => setHeatmapData(null))
      .finally(() => setHeatmapLoading(false));
  }, [heatmapKind, selectedMatchId, selectedMapId]);

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
    const ok =
      heatmapKind === null ||
      (heatmapKind === 'traffic' && overlayAvailability.traffic) ||
      (heatmapKind === 'kills' && overlayAvailability.kills) ||
      (heatmapKind === 'deaths' && overlayAvailability.deaths);
    if (!ok) setHeatmapKind(null);
  }, [matchData, heatmapKind, overlayAvailability.traffic, overlayAvailability.kills, overlayAvailability.deaths]);

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
        <p className="app__subtitle">Explore player movement, combat, and storm deaths on the map.</p>
        <p className="app__instruction">Select a map, date, and match to view player journeys and enable playback.</p>
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
          />
        </div>
      </div>

      <div className="app__main">
        <aside className="app__legend-column" aria-label="Map legend">
          <div className="legend-column__inner">
            <span className="legend-column__title">Legend</span>
            <Legend />
          </div>
        </aside>
        <div className="app__map-area">
          <div className={`map-view${loadingMatch && selectedMatchId ? ' map-view--loading' : ''}`}>
            <MapView
              matchData={matchData}
              currentTimeMs={currentTimeMs}
              heatmap={heatmapData}
              minimapUrl={selectedMapId ? minimapUrl(selectedMapId) : ''}
              showOnlyHumanPaths={showOnlyHumanPaths}
              eventTypesShown={eventTypesShown}
            />
          </div>
        </div>
        <aside className="app__sidebar">
          <div className="card">
            <p className="card__title">Overlays</p>
            <HeatmapControls
              heatmapKind={heatmapKind}
              onHeatmapChange={setHeatmapKind}
              disabled={!matchData || loadingMatch}
              heatmapLoading={heatmapLoading}
              availableOverlays={overlayAvailability}
            />
            {matchData && (
              <div className="match-summary">
                <MatchSummary data={matchData} />
              </div>
            )}
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
