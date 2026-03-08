export function Legend() {
  return (
    <div className="legend">
      <div className="legend__section">
        <div className="legend__paths">
          <span className="legend__item"><span className="legend__path legend__path--human" /> Human path</span>
          <span className="legend__item"><span className="legend__path legend__path--bot" /> Bot path</span>
        </div>
      </div>
      <div className="legend__section">
        <div className="legend__events">
          <span className="legend__item"><span className="legend__dot legend__dot--kill" /> Kill / BotKill</span>
          <span className="legend__item"><span className="legend__dot legend__dot--killed" /> Killed / BotKilled</span>
          <span className="legend__item"><span className="legend__dot legend__dot--storm" /> KilledByStorm</span>
          <span className="legend__item"><span className="legend__dot legend__dot--loot" /> Loot</span>
        </div>
      </div>
    </div>
  );
}
