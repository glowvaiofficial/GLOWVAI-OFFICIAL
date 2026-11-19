import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { MAX_ZOOM, MIN_ZOOM, OSM_ATTRIBUTION, TILE_SIZE, clampZoom, panCenter, tilesFor, type LatLngLike } from '../lib/tileMath';

// The map behind the delivery pin: OpenStreetMap tiles drawn as plain <img> elements in a clipped frame, no map library.
// The pin sits at the centre; the customer drags the map under it (pointer or arrow keys), double-clicks or uses +/-.
// Controlled: `center` is the pinned coordinate, `onMoveEnd` reports the coordinate under the pin when a move finishes.

export interface PinMapProps {
  center: LatLngLike;
  zoom?: number;
  /** False until the customer has chosen a spot; the pin is then drawn faded as a hint. */
  pinned: boolean;
  onMoveEnd: (center: LatLngLike) => void;
}

const BUFFER = TILE_SIZE / 2; // spare tiles around the frame so dragging never shows a gap
const KEY_STEP = 80;
const DRAG_THRESHOLD = 3;

export const PinMap: React.FC<PinMapProps> = ({ center, zoom: startZoom = 16, pinned, onMoveEnd }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(clampZoom(startZoom));
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const read = () => setSize({ width: Math.round(el.clientWidth), height: Math.round(el.clientHeight) });
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => {
    if (keyTimer.current) clearTimeout(keyTimer.current);
  }, []);

  const tiles = useMemo(
    () => (size.width > 0 && size.height > 0 ? tilesFor(center, zoom, size.width + BUFFER * 2, size.height + BUFFER * 2) : []),
    [center, zoom, size.width, size.height],
  );

  const commit = useCallback(
    (dx: number, dy: number) => {
      setOffset({ x: 0, y: 0 });
      if (dx === 0 && dy === 0) return;
      onMoveEnd(panCenter(center, zoom, dx, dy));
    },
    [center, zoom, onMoveEnd],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) <= DRAG_THRESHOLD) return;
    d.moved = true;
    setDragging(true);
    setOffset({ x: dx, y: dy });
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (d.moved) commit(e.clientX - d.x, e.clientY - d.y);
  };

  const zoomBy = (delta: number) => setZoom((z) => clampZoom(z + delta));

  const onDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Zoom in on the spot that was clicked: move it to the centre first, then zoom.
    const dx = rect.left + rect.width / 2 - e.clientX;
    const dy = rect.top + rect.height / 2 - e.clientY;
    if (zoom < MAX_ZOOM) {
      onMoveEnd(panCenter(center, zoom, dx, dy));
      setZoom(zoom + 1);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, [number, number]> = { ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] };
    if (step[e.key]) {
      e.preventDefault();
      keyOffset.current = { x: keyOffset.current.x + step[e.key][0], y: keyOffset.current.y + step[e.key][1] };
      setOffset({ ...keyOffset.current });
      if (keyTimer.current) clearTimeout(keyTimer.current);
      keyTimer.current = setTimeout(() => {
        const { x, y } = keyOffset.current;
        keyOffset.current = { x: 0, y: 0 };
        commit(x, y);
      }, 350);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomBy(1);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      zoomBy(-1);
    }
  };

  return (
    <div className="v7-map">
      <div
        ref={frameRef}
        className={`v7-map-frame${dragging ? ' is-dragging' : ''}`}
        role="application"
        tabIndex={0}
        aria-label="Map. Drag the map, or use the arrow keys, to place the pin on your delivery location. Plus and minus change the zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
      >
        <div className="v7-map-tiles" style={{ transform: `translate(${offset.x - BUFFER}px, ${offset.y - BUFFER}px)` }} aria-hidden="true">
          {tiles.map((t) => (
            <img key={t.key} className="v7-map-tile" src={t.url} alt="" draggable={false} width={TILE_SIZE} height={TILE_SIZE} style={{ left: t.left, top: t.top }} referrerPolicy="strict-origin-when-cross-origin" />
          ))}
        </div>

        <div className={`v7-map-pin${pinned ? '' : ' is-idle'}`} aria-hidden="true">
          <svg viewBox="0 0 32 44" width="36" height="50">
            <path d="M16 1C8 1 2 7.2 2 15c0 10.5 14 28 14 28s14-17.500 14-28C30 7.200 24 1 16 1z" fill="#0057FB" stroke="#fff" strokeWidth="2" />
            <circle cx="16" cy="15" r="5.500" fill="#fff" />
          </svg>
          <span className="v7-map-pin-dot" />
        </div>

        <div className="v7-map-zoom">
          <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => zoomBy(1)}>
            <Plus size={18} />
          </button>
          <button type="button" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => zoomBy(-1)}>
            <Minus size={18} />
          </button>
        </div>

        <small className="v7-map-attr">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{OSM_ATTRIBUTION}</a>
        </small>
      </div>
    </div>
  );
};
