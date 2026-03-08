export type HeatmapKind = 'traffic' | 'kills' | 'deaths' | null;

export function HeatmapControls({
  heatmapKind,
  onHeatmapChange,
  disabled,
}: {
  heatmapKind: HeatmapKind;
  onHeatmapChange: (kind: HeatmapKind) => void;
  disabled: boolean;
}) {
  return (
    <div className="heatmap-controls">
      <span className="heatmap-controls__label">Heatmap overlay</span>
      <div className="heatmap-controls__options">
        <label className={`heatmap-controls__option ${heatmapKind === null ? 'heatmap-controls__option--selected' : ''} ${disabled ? 'heatmap-controls__option--disabled' : ''}`}>
          <input
            type="radio"
            name="heatmap"
            checked={heatmapKind === null}
            onChange={() => onHeatmapChange(null)}
            disabled={disabled}
          />
          Off
        </label>
        <label className={`heatmap-controls__option ${heatmapKind === 'traffic' ? 'heatmap-controls__option--selected' : ''} ${disabled ? 'heatmap-controls__option--disabled' : ''}`}>
          <input
            type="radio"
            name="heatmap"
            checked={heatmapKind === 'traffic'}
            onChange={() => onHeatmapChange('traffic')}
            disabled={disabled}
          />
          Traffic
        </label>
        <label className={`heatmap-controls__option ${heatmapKind === 'kills' ? 'heatmap-controls__option--selected' : ''} ${disabled ? 'heatmap-controls__option--disabled' : ''}`}>
          <input
            type="radio"
            name="heatmap"
            checked={heatmapKind === 'kills'}
            onChange={() => onHeatmapChange('kills')}
            disabled={disabled}
          />
          Kills
        </label>
        <label className={`heatmap-controls__option ${heatmapKind === 'deaths' ? 'heatmap-controls__option--selected' : ''} ${disabled ? 'heatmap-controls__option--disabled' : ''}`}>
          <input
            type="radio"
            name="heatmap"
            checked={heatmapKind === 'deaths'}
            onChange={() => onHeatmapChange('deaths')}
            disabled={disabled}
          />
          Deaths
        </label>
      </div>
    </div>
  );
}
