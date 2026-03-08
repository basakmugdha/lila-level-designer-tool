import type { MapInfo, MatchInfo } from './api';

/** Format match for display: use start time when available, else fallback to id + day */
function formatMatchLabel(m: MatchInfo): string {
  if (m.start_ts_ms != null) {
    const d = new Date(m.start_ts_ms);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  return `${m.match_id.slice(0, 8)}… (${m.day})`;
}

export type MatchFilterKind = 'maxKills' | 'maxLoots' | 'maxStormDeaths';

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
  matchFilter = null,
  onMatchFilterChange,
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
  matchFilter?: MatchFilterKind | null;
  onMatchFilterChange?: (kind: MatchFilterKind | null) => void;
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
          disabled={!selectedMapId || loadingMatches}
          aria-label="Select date"
        >
          <option value="">— Select day —</option>
          {days.map((d) => (
            <option key={d} value={d}>{d.replace('_', ' ')}</option>
          ))}
        </select>
      </label>
      {onMatchFilterChange && matches.length > 0 && (
        <div className="filter-group filter-group--radios">
          <span className="filter-group__label">Show match with</span>
          <div className="filter-group__radios" role="radiogroup" aria-label="Filter by stat">
            {[
              { value: 'maxKills' as const, label: 'Max Kills' },
              { value: 'maxLoots' as const, label: 'Max Loots' },
              { value: 'maxStormDeaths' as const, label: 'Max Storm Deaths' },
            ].map(({ value, label }) => (
              <label key={value} className="filter-group__radio">
                <input
                  type="radio"
                  name="matchFilter"
                  checked={matchFilter === value}
                  onChange={() => onMatchFilterChange(value)}
                  disabled={loadingMatches}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <label className="filter-group">
        <span className="filter-group__label">Match</span>
        <select
          value={selectedMatchId}
          onChange={(e) => {
            const id = e.target.value;
            onMatchChange(id);
            onMatchFilterChange?.(null);
          }}
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
                {formatMatchLabel(m)}
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
