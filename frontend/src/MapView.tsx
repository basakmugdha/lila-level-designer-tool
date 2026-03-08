import { useEffect, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [displaySize, setDisplaySize] = useState(480);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setDisplaySize(Math.min(w, h));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [matchData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !matchData || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = Math.min(container.clientWidth, container.clientHeight, 1024) || 480;
    const dpr = window.devicePixelRatio || 1;
    const buffer = Math.min(size * dpr, 1024);
    canvas.width = buffer;
    canvas.height = buffer;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const scale = buffer / MINIMAP_SIZE;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // 1. Heatmap overlay (below paths)
    if (heatmap && heatmap.grid) {
      const g = heatmap.grid;
      const cellW = MINIMAP_SIZE / heatmap.grid_size;
      const cellH = MINIMAP_SIZE / heatmap.grid_size;
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
        const x = pt.px;
        const y = pt.py;
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
        ctx.arc(ev.px, ev.py, ev.event === 'Loot' ? 3 : 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [matchData, currentTimeMs, heatmap, minimapUrl, showOnlyHumanPaths, eventTypesShown, displaySize]);

  if (!matchData) {
    return (
      <div className="map-view map-view--empty">
        <div className="map-view__empty-icon" aria-hidden>🗺️</div>
        <p style={{ margin: 0 }}>Select a map, date, and match to view player journeys.</p>
        <ol className="map-view__empty-steps" role="list">
          <li><span className="step-num">1</span> Choose a <strong>Map</strong></li>
          <li><span className="step-num">2</span> Pick a <strong>Date</strong></li>
          <li><span className="step-num">3</span> Select a <strong>Match</strong></li>
        </ol>
      </div>
    );
  }

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-view__minimap" style={{ backgroundImage: minimapUrl ? `url(${minimapUrl})` : undefined }}>
        <canvas ref={canvasRef} className="map-view__canvas" width={MINIMAP_SIZE} height={MINIMAP_SIZE} />
      </div>
    </div>
  );
}
