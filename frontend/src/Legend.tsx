export function Legend() {
  return (
    <div className="legend">
      <div className="legend__section">
        <div className="legend__paths">
          <div className="legend__item">
            <span className="legend__path legend__path--human" aria-hidden />
            <span className="legend__text">
              <span className="legend__label">Human path</span>
              <span className="legend__desc">Movement trail of a human player</span>
            </span>
          </div>
          <div className="legend__item">
            <span className="legend__path legend__path--bot" aria-hidden />
            <span className="legend__text">
              <span className="legend__label">Bot path</span>
              <span className="legend__desc">Movement trail of a bot (AI)</span>
            </span>
          </div>
        </div>
      </div>
      <div className="legend__section">
        <div className="legend__events">
          <div className="legend__item">
            <span className="legend__dot legend__dot--kill" aria-hidden />
            <span className="legend__text">
              <span className="legend__label">Kills (Kill / BotKill)</span>
              <span className="legend__desc">Killer’s location when a kill occurred</span>
            </span>
          </div>
          <div className="legend__item">
            <span className="legend__dot legend__dot--killed" aria-hidden />
            <span className="legend__text">
              <span className="legend__label">Deaths (Killed / BotKilled)</span>
              <span className="legend__desc">Where a player died in combat</span>
            </span>
          </div>
          <div className="legend__item">
            <span className="legend__dot legend__dot--storm" aria-hidden />
            <span className="legend__text">
              <span className="legend__label">Storm death</span>
              <span className="legend__desc">Died to the shrinking zone</span>
            </span>
          </div>
          <div className="legend__item">
            <span className="legend__dot legend__dot--loot" aria-hidden />
            <span className="legend__text">
              <span className="legend__label">Loot</span>
              <span className="legend__desc">Item pickup location</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
