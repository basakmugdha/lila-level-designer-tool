import type { MapInfo, MatchInfo } from './api';

export function Filters({
  maps,
  days,
  matches,
  selectedMapId,
  selectedDay,
  selectedMatchId,
  onMapChange,
  onDayChange,
  onMatchChange,
  loadingMatches,
}: {
  maps: MapInfo[];
  days: string[];
  matches: MatchInfo[];
  selectedMapId: string;
  selectedDay: string;
  selectedMatchId: string;
  onMapChange: (id: string) => void;
  onDayChange: (day: string) => void;
  onMatchChange: (matchId: string) => void;
  loadingMatches: boolean;
}) {
  return (
    <div className="filters">
      <label className="filter-group">
        <span>Map</span>
        <select
          value={selectedMapId}
          onChange={(e) => onMapChange(e.target.value)}
        >
          <option value="">— Select map —</option>
          {maps.map((m) => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
      </label>
      <label className="filter-group">
        <span>Date</span>
        <select
          value={selectedDay}
          onChange={(e) => onDayChange(e.target.value)}
        >
          <option value="">— Select day —</option>
          {days.map((d) => (
            <option key={d} value={d}>{d.replace('_', ' ')}</option>
          ))}
        </select>
      </label>
      <label className="filter-group">
        <span>Match</span>
        <select
          value={selectedMatchId}
          onChange={(e) => onMatchChange(e.target.value)}
          disabled={loadingMatches || !selectedMapId}
        >
          <option value="">— Select match —</option>
          {matches.map((m) => (
            <option key={m.match_id} value={m.match_id}>
              {m.match_id.slice(0, 8)}… ({m.day})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
