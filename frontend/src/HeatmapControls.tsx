export type HeatmapKind = 'traffic' | 'kills' | 'deaths';

export type OverlayAvailability = { traffic: boolean; kills: boolean; deaths: boolean };

export function HeatmapControls({
  heatmapEnabled,
  onHeatmapEnabledChange,
  heatmapKinds,
  onHeatmapKindsChange,
  disabled,
  heatmapLoading = false,
  availableOverlays = { traffic: true, kills: true, deaths: true },
}: {
  heatmapEnabled: boolean;
  onHeatmapEnabledChange: (enabled: boolean) => void;
  heatmapKinds: Set<HeatmapKind>;
  onHeatmapKindsChange: (kinds: Set<HeatmapKind>) => void;
  disabled: boolean;
  heatmapLoading?: boolean;
  availableOverlays?: OverlayAvailability;
}) {
  const toggleKind = (kind: HeatmapKind) => {
    const next = new Set(heatmapKinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    onHeatmapKindsChange(next);
  };

  return (
    <div className="heatmap-controls">
      <div className="heatmap-controls__row">
        <span className="heatmap-controls__label">Heatmap overlay</span>
        <label className="heatmap-controls__toggle">
          <input
            type="checkbox"
            checked={heatmapEnabled}
            onChange={(e) => onHeatmapEnabledChange(e.target.checked)}
            disabled={disabled}
            aria-label="Toggle heatmap overlay on or off"
          />
          <span className="heatmap-controls__toggle-slider" aria-hidden />
          <span className="heatmap-controls__toggle-label">{heatmapEnabled ? 'On' : 'Off'}</span>
        </label>
      </div>
      {heatmapEnabled && (
        <div className="heatmap-controls__options heatmap-controls__options--multi">
          <span className="heatmap-controls__sublabel">Overlays</span>
          <div className="heatmap-controls__checkboxes" role="group" aria-label="Select overlay types">
            {availableOverlays.traffic && (
              <label className={`heatmap-controls__option heatmap-controls__option--checkbox ${heatmapKinds.has('traffic') ? 'heatmap-controls__option--selected' : ''} ${disabled ? 'heatmap-controls__option--disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={heatmapKinds.has('traffic')}
                  onChange={() => toggleKind('traffic')}
                  disabled={disabled}
                />
                Traffic
              </label>
            )}
            {availableOverlays.kills && (
              <label className={`heatmap-controls__option heatmap-controls__option--checkbox ${heatmapKinds.has('kills') ? 'heatmap-controls__option--selected' : ''} ${disabled ? 'heatmap-controls__option--disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={heatmapKinds.has('kills')}
                  onChange={() => toggleKind('kills')}
                  disabled={disabled}
                />
                Kills
              </label>
            )}
            {availableOverlays.deaths && (
              <label className={`heatmap-controls__option heatmap-controls__option--checkbox ${heatmapKinds.has('deaths') ? 'heatmap-controls__option--selected' : ''} ${disabled ? 'heatmap-controls__option--disabled' : ''}`}>
                <input
                  type="checkbox"
                  checked={heatmapKinds.has('deaths')}
                  onChange={() => toggleKind('deaths')}
                  disabled={disabled}
                />
                Deaths
              </label>
            )}
          </div>
        </div>
      )}
      {heatmapLoading && heatmapEnabled && heatmapKinds.size > 0 && (
        <span className="heatmap-controls__loading" aria-live="polite">Loading…</span>
      )}
    </div>
  );
}
