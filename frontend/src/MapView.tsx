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
  heatmaps,
  minimapUrl,
  showOnlyHumanPaths,
  eventTypesShown,
}: {
  matchData: MatchData | null;
  currentTimeMs: number;
  heatmaps: HeatmapData[];
  minimapUrl: string;
  showOnlyHumanPaths: boolean;
  eventTypesShown: Set<string>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heatmapLayerRef = useRef<HTMLCanvasElement | null>(null);
  const [viewSize, setViewSize] = useState({ w: 480, h: 480 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const mapSize = Math.max(viewSize.w, viewSize.h, 320);
  const panBounds = {
    xMin: Math.min((viewSize.w - mapSize) / 2, (mapSize - viewSize.w) / 2),
    xMax: Math.max((viewSize.w - mapSize) / 2, (mapSize - viewSize.w) / 2),
    yMin: Math.min((viewSize.h - mapSize) / 2, (mapSize - viewSize.h) / 2),
    yMax: Math.max((viewSize.h - mapSize) / 2, (mapSize - viewSize.h) / 2),
  };
  const clampPan = (p: { x: number; y: number }) => ({
    x: Math.max(panBounds.xMin, Math.min(panBounds.xMax, p.x)),
    y: Math.max(panBounds.yMin, Math.min(panBounds.yMax, p.y)),
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) setViewSize({ w, h });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [matchData]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!matchData || e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!panStartRef.current) return;
    const { x, y, panX, panY } = panStartRef.current;
    const next = clampPan({ x: panX + (e.clientX - x), y: panY + (e.clientY - y) });
    setPan(next);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerId !== undefined) (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    panStartRef.current = null;
    setIsDragging(false);
  };
  const handlePointerCancel = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    panStartRef.current = null;
    setIsDragging(false);
  };

  useEffect(() => {
    const xMin = Math.min((viewSize.w - mapSize) / 2, (mapSize - viewSize.w) / 2);
    const xMax = Math.max((viewSize.w - mapSize) / 2, (mapSize - viewSize.w) / 2);
    const yMin = Math.min((viewSize.h - mapSize) / 2, (mapSize - viewSize.h) / 2);
    const yMax = Math.max((viewSize.h - mapSize) / 2, (mapSize - viewSize.h) / 2);
    setPan((p) => ({
      x: Math.max(xMin, Math.min(xMax, p.x)),
      y: Math.max(yMin, Math.min(yMax, p.y)),
    }));
  }, [viewSize.w, viewSize.h, mapSize]);

  // Pre-render heatmaps to a single offscreen canvas (all layers composited in order)
  useEffect(() => {
    if (!heatmaps.length || heatmaps.some((h) => !h?.grid)) {
      heatmapLayerRef.current = null;
      return;
    }
    const off = document.createElement('canvas');
    off.width = MINIMAP_SIZE;
    off.height = MINIMAP_SIZE;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    for (const heatmap of heatmaps) {
      if (!heatmap?.grid) continue;
      const g = heatmap.grid;
      const cellW = MINIMAP_SIZE / heatmap.grid_size;
      const cellH = MINIMAP_SIZE / heatmap.grid_size;
      const maxVal = heatmap.max_val || 1;
      for (let j = 0; j < heatmap.grid_size; j++) {
        for (let i = 0; i < heatmap.grid_size; i++) {
          const v = g[j][i] / maxVal;
          if (v <= 0) continue;
          const alpha = 0.5 + 0.5 * v;
          let r = 0, g_ = 0, b = 0;
          if (heatmap.kind === 'traffic') {
            r = 0.15; g_ = 0.55; b = 1;
          } else if (heatmap.kind === 'kills') {
            r = 1; g_ = 0.15; b = 0.2;
          } else {
            r = 0.75; g_ = 0; b = 0.85;
          }
          ctx.fillStyle = `rgba(${r * 255},${g_ * 255},${b * 255},${alpha})`;
          ctx.fillRect(i * cellW, j * cellH, cellW + 1, cellH + 1);
        }
      }
    }
    heatmapLayerRef.current = off;
  }, [heatmaps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !matchData || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const L = mapSize;
    const dpr = window.devicePixelRatio || 1;
    const buffer = Math.min(Math.ceil(L * dpr), 2048);
    canvas.width = buffer;
    canvas.height = buffer;
    canvas.style.width = `${L}px`;
    canvas.style.height = `${L}px`;
    const scale = buffer / MINIMAP_SIZE;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // 1. Heatmap overlay (from pre-rendered layer or draw inline if not ready)
    const heatmapLayer = heatmapLayerRef.current;
    if (heatmapLayer) {
      ctx.drawImage(heatmapLayer, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    } else if (heatmaps.length > 0) {
      for (const heatmap of heatmaps) {
        if (!heatmap?.grid) continue;
        const g = heatmap.grid;
        const cellW = MINIMAP_SIZE / heatmap.grid_size;
        const cellH = MINIMAP_SIZE / heatmap.grid_size;
        const maxVal = heatmap.max_val || 1;
        for (let j = 0; j < heatmap.grid_size; j++) {
          for (let i = 0; i < heatmap.grid_size; i++) {
            const v = g[j][i] / maxVal;
            if (v <= 0) continue;
            const alpha = 0.5 + 0.5 * v;
            let r = 0, g_ = 0, b = 0;
            if (heatmap.kind === 'traffic') {
              r = 0.15; g_ = 0.55; b = 1;
            } else if (heatmap.kind === 'kills') {
              r = 1; g_ = 0.15; b = 0.2;
            } else {
              r = 0.75; g_ = 0; b = 0.85;
            }
            ctx.fillStyle = `rgba(${r * 255},${g_ * 255},${b * 255},${alpha})`;
            ctx.fillRect(i * cellW, j * cellH, cellW + 1, cellH + 1);
          }
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
  }, [matchData, currentTimeMs, heatmaps, minimapUrl, showOnlyHumanPaths, eventTypesShown, mapSize]);

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
    <div
      className="map-view map-view--pannable"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <div
        className="map-view__pan"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: mapSize,
          height: mapSize,
          marginLeft: -mapSize / 2,
          marginTop: -mapSize / 2,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        <div
          className="map-view__minimap"
          style={{
            width: mapSize,
            height: mapSize,
            backgroundImage: minimapUrl ? `url(${minimapUrl})` : undefined,
          }}
        >
          <canvas
            ref={canvasRef}
            className="map-view__canvas"
            width={MINIMAP_SIZE}
            height={MINIMAP_SIZE}
          />
        </div>
      </div>
    </div>
  );
}
