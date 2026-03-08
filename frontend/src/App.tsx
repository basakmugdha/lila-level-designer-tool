import { useState, useEffect, useCallback } from 'react';
import { fetchMaps, fetchDays, fetchMatches, fetchMatch, fetchHeatmap, minimapUrl } from './api';
import type { MatchData, HeatmapData } from './api';
import { MapView } from './MapView';
import { Filters } from './Filters';
import { Timeline } from './Timeline';
import { HeatmapControls, type HeatmapKind } from './HeatmapControls';
import { Legend } from './Legend';
import { MatchSummary } from './MatchSummary';
import { ViewOptions, type EventTypeFilter } from './ViewOptions';

const PLAYBACK_INTERVAL_MS = 100;
const PLAYBACK_SPEED = 0.5; // fraction of real time

const DEFAULT_EVENT_TYPES: EventTypeFilter = new Set([
  'Kill', 'Killed', 'BotKill', 'BotKilled', 'KilledByStorm', 'Loot',
]);

export default function App() {
  const [maps, setMaps] = useState<{ id: string; minimap_url: string }[]>([]);
  const [days, setDays] = useState<string[]>([]);
  const [matches, setMatches] = useState<{ match_id: string; day: string; map_id: string }[]>([]);
  const [selectedMapId, setSelectedMapId] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [heatmapKind, setHeatmapKind] = useState<HeatmapKind>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showOnlyHumanPaths, setShowOnlyHumanPaths] = useState(false);
  const [eventTypesShown, setEventTypesShown] = useState<EventTypeFilter>(DEFAULT_EVENT_TYPES);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchMaps(), fetchDays()])
      .then(([mapsRes, daysRes]) => {
        setMaps(mapsRes.maps);
        setDays(daysRes.days);
        if (mapsRes.maps.length && !selectedMapId) setSelectedMapId(mapsRes.maps[0].id);
        if (daysRes.days.length && !selectedDay) setSelectedDay(daysRes.days[0]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  useEffect(() => {
    if (!selectedMapId) {
      setMatches([]);
      return;
    }
    setLoadingMatches(true);
    fetchMatches(selectedDay || undefined, selectedMapId)
      .then((r) => {
        setMatches(r.matches);
        setSelectedMatchId('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load matches'))
      .finally(() => setLoadingMatches(false));
  }, [selectedMapId, selectedDay]);

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
      return;
    }
    fetchHeatmap(selectedMatchId, selectedMapId, heatmapKind)
      .then(setHeatmapData)
      .catch(() => setHeatmapData(null));
  }, [heatmapKind, selectedMatchId, selectedMapId]);

  const bounds = matchData?.bounds ?? null;

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
        <p className="app__subtitle">Explore player movement, combat, and storm deaths on the map. Pick a map, date, and match to view journeys and heatmaps.</p>
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
            days={days}
            matches={matches}
            selectedMapId={selectedMapId}
            selectedDay={selectedDay}
            selectedMatchId={selectedMatchId}
            onMapChange={setSelectedMapId}
            onDayChange={setSelectedDay}
            onMatchChange={setSelectedMatchId}
            loadingMatches={loadingMatches}
          />
        </div>
        <div className="card">
          <p className="card__title">Overlays</p>
          <HeatmapControls
            heatmapKind={heatmapKind}
            onHeatmapChange={setHeatmapKind}
            disabled={!matchData || loadingMatch}
          />
          {matchData && (
            <div className="match-summary">
              <MatchSummary data={matchData} />
            </div>
          )}
        </div>
      </div>

      <div className="app__main">
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
        <aside className="app__sidebar">
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
          <div className="card">
            <p className="card__title">Legend</p>
            <Legend />
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
