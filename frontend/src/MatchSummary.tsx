import type { MatchData } from './api';

export function MatchSummary({ data }: { data: MatchData | null }) {
  if (!data) return null;

  const humans = data.players.filter((p) => !p.is_bot).length;
  const bots = data.players.filter((p) => p.is_bot).length;
  let kills = 0;
  let stormDeaths = 0;
  for (const p of data.players) {
    for (const ev of p.events) {
      if (ev.event === 'Kill' || ev.event === 'BotKill') kills += 1;
      if (ev.event === 'KilledByStorm') stormDeaths += 1;
    }
  }

  return (
    <div className="match-summary">
      <span className="match-summary__item">
        <strong>{data.players.length}</strong> players ({humans} human, {bots} bot)
      </span>
      <span className="match-summary__item">
        <strong>{kills}</strong> kills
      </span>
      <span className="match-summary__item">
        <strong>{stormDeaths}</strong> storm deaths
      </span>
    </div>
  );
}
