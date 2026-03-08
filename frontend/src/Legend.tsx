export function Legend() {
  return (
    <div className="legend">
      <div className="legend__paths">
        <span className="legend__path legend__path--human" /> Human path
        <span className="legend__path legend__path--bot" /> Bot path
      </div>
      <div className="legend__events">
        <span className="legend__dot legend__dot--kill" /> Kill / BotKill
        <span className="legend__dot legend__dot--killed" /> Killed / BotKilled
        <span className="legend__dot legend__dot--storm" /> KilledByStorm
        <span className="legend__dot legend__dot--loot" /> Loot
      </div>
    </div>
  );
}
