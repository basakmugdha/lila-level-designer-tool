import { useEffect, useRef } from 'react';
import type { MatchData, HeatmapData } from './api';

const MINIMAP_SIZE = 1024;

const EVENT_COLORS: Record<string, string> = {
  Kill: '#e63946',
  Killed: '#9d0208',
  BotKill: '#f4a261',
  BotKilled: '#e76f51',
  KilledByStorm: '#6a4c93',
  Loot: '#2a9d8f',
};

export function MapView({
  matchData,
  currentTimeMs,
  heatmap,
  minimapUrl,
  showOnlyHumanPaths,
  eventTypesShown,
}: {
  matchData: MatchData | null;
  currentTimeMs: number;
  heatmap: HeatmapData | null;
  minimapUrl: string;
  showOnlyHumanPaths: boolean;
  eventTypesShown: Set<string>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matchData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(600, window.innerWidth - 32, MINIMAP_SIZE);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = size / MINIMAP_SIZE;
    ctx.clearRect(0, 0, size, size);
    // 1. Heatmap overlay (below paths)
    if (heatmap && heatmap.grid) {
      const g = heatmap.grid;
      const cellW = (size / heatmap.grid_size);
      const cellH = (size / heatmap.grid_size);
      const maxVal = heatmap.max_val || 1;
      for (let j = 0; j < heatmap.grid_size; j++) {
        for (let i = 0; i < heatmap.grid_size; i++) {
          const v = g[j][i] / maxVal;
          if (v <= 0) continue;
          let r = 0, g_ = 0, b = 0, a = 0.4 * v;
          if (heatmap.kind === 'traffic') {
            r = 0.2; g_ = 0.5; b = 1;
          } else if (heatmap.kind === 'kills') {
            r = 1; g_ = 0.2; b = 0.2;
          } else {
            r = 0.6; g_ = 0; b = 0.6;
          }
          ctx.fillStyle = `rgba(${r * 255},${g_ * 255},${b * 255},${a})`;
          ctx.fillRect(i * cellW, j * cellH, cellW + 1, cellH + 1);
        }
      }
    }

    // 2. Paths up to current time
    const humanColor = '#06d6a0';
    const botColor = '#8d99ae';
    const pathOpacity = 0.85;
    const playersToDraw = showOnlyHumanPaths ? matchData.players.filter((p) => !p.is_bot) : matchData.players;

    for (const player of playersToDraw) {
      const color = player.is_bot ? botColor : humanColor;
      ctx.strokeStyle = color;
      ctx.lineWidth = player.is_bot ? 1.5 : 2;
      ctx.globalAlpha = pathOpacity;
      ctx.beginPath();
      let first = true;
      for (const pt of player.positions) {
        if (pt.ts_ms > currentTimeMs) break;
        const x = pt.px * scale;
        const y = pt.py * scale;
        if (first) {
          ctx.moveTo(x, y);
          first = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 3. Event markers up to current time
    for (const player of matchData.players) {
      for (const ev of player.events) {
        if (ev.ts_ms > currentTimeMs) continue;
        if (eventTypesShown.size > 0 && !eventTypesShown.has(ev.event)) continue;
        const fill = EVENT_COLORS[ev.event] ?? '#888';
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const x = ev.px * scale;
        const y = ev.py * scale;
        ctx.arc(x, y, ev.event === 'Loot' ? 3 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [matchData, currentTimeMs, heatmap, minimapUrl, showOnlyHumanPaths, eventTypesShown]);

  if (!matchData) {
    return (
      <div className="map-view map-view--empty">
        <p>Select a map, date, and match to view player journeys.</p>
      </div>
    );
  }

  return (
    <div className="map-view">
      <div className="map-view__minimap" style={{ backgroundImage: `url(${minimapUrl})` }}>
        <canvas ref={canvasRef} className="map-view__canvas" width={MINIMAP_SIZE} height={MINIMAP_SIZE} />
      </div>
    </div>
  );
}
