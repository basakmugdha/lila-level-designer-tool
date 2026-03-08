export const EVENT_GROUPS = [
  { key: 'kills', label: 'Kills', events: ['Kill', 'BotKill'] },
  { key: 'deaths', label: 'Deaths', events: ['Killed', 'BotKilled'] },
  { key: 'storm', label: 'Storm deaths', events: ['KilledByStorm'] },
  { key: 'loot', label: 'Loot', events: ['Loot'] },
] as const;

export type EventTypeFilter = Set<string>;

export function ViewOptions({
  showOnlyHumans,
  onShowOnlyHumansChange,
  eventGroupsShown,
  onEventGroupsShownChange,
  disabled,
}: {
  showOnlyHumans: boolean;
  onShowOnlyHumansChange: (v: boolean) => void;
  eventGroupsShown: EventTypeFilter;
  onEventGroupsShownChange: (set: EventTypeFilter) => void;
  disabled: boolean;
}) {
  return (
    <div className="view-options">
      <label className="view-options__row">
        <input
          type="checkbox"
          checked={showOnlyHumans}
          onChange={(e) => onShowOnlyHumansChange(e.target.checked)}
          disabled={disabled}
        />
        <span>Show only human paths</span>
      </label>
      <div className="view-options__events">
        <span className="view-options__label">Show events:</span>
        {EVENT_GROUPS.map((g) => (
          <label key={g.key} className="view-options__row view-options__row--inline">
            <input
              type="checkbox"
              checked={g.events.some((e) => eventGroupsShown.has(e))}
              onChange={() => {
                const next = new Set(eventGroupsShown);
                if (next.has(g.events[0])) g.events.forEach((e) => next.delete(e));
                else g.events.forEach((e) => next.add(e));
                onEventGroupsShownChange(next);
              }}
              disabled={disabled}
            />
            <span>{g.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
