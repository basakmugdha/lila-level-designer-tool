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
  hintMapsForDay = [],
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
  hintMapsForDay?: string[];
}) {
  return (
    <div className="filters">
      <label className="filter-group">
        <span className="filter-group__label">Map</span>
        <select
          value={selectedMapId}
          onChange={(e) => onMapChange(e.target.value)}
          aria-label="Select map"
        >
          <option value="">— Select map —</option>
          {maps.map((m) => (
            <option key={m.id} value={m.id}>{m.id}</option>
          ))}
        </select>
      </label>
      <label className="filter-group">
        <span className="filter-group__label">Date</span>
        <select
          value={selectedDay}
          onChange={(e) => onDayChange(e.target.value)}
          aria-label="Select date"
        >
          <option value="">— Select day —</option>
          {days.map((d) => (
            <option key={d} value={d}>{d.replace('_', ' ')}</option>
          ))}
        </select>
      </label>
      <label className="filter-group">
        <span className="filter-group__label">Match</span>
        <select
          value={selectedMatchId}
          onChange={(e) => onMatchChange(e.target.value)}
          disabled={loadingMatches || !selectedMapId}
          aria-label="Select match"
          aria-busy={loadingMatches}
        >
          <option value="">— Select match —</option>
          {!loadingMatches && selectedMapId && matches.length === 0 ? (
            <option value="" disabled>
              — No matches for this date and map —
            </option>
          ) : (
            matches.map((m) => (
              <option key={m.match_id} value={m.match_id}>
                {m.match_id.slice(0, 8)}… ({m.day})
              </option>
            ))
          )}
        </select>
        {!loadingMatches && selectedMapId && selectedDay && matches.length === 0 && hintMapsForDay.length > 0 && (
          <span className="filter-group__hint">
            Try <strong>{hintMapsForDay.join(', ')}</strong> for this date.
          </span>
        )}
      </label>
    </div>
  );
}
