type Bounds = { ts_min_ms: number; ts_max_ms: number } | null;

export function Timeline({
  bounds,
  currentTimeMs,
  onSeek,
  playing,
  onPlayPause,
}: {
  bounds: Bounds;
  currentTimeMs: number;
  onSeek: (ms: number) => void;
  playing: boolean;
  onPlayPause: () => void;
}) {
  if (!bounds || bounds.ts_min_ms === bounds.ts_max_ms) {
    return null;
  }

  const min = bounds.ts_min_ms;
  const max = bounds.ts_max_ms;
  const range = max - min;
  const value = range ? ((currentTimeMs - min) / range) * 100 : 0;

  const formatMs = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timeline">
      <div className="timeline__controls">
        <button type="button" className="timeline__play" onClick={onPlayPause} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <span className="timeline__time">
          {formatMs(currentTimeMs - min)} / {formatMs(max - min)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={(e) => {
          const pct = Number(e.target.value) / 100;
          onSeek(min + pct * range);
        }}
        className="timeline__slider"
        aria-label="Scrub match timeline"
      />
    </div>
  );
}
