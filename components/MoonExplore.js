import { useRef, useState } from "react";
import { discToImagePercent } from "../lib/moonImageGeometry";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export default function MoonExplore({ imageSrc, fallbackSrc, landmarks, onClose }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState(null);
  const [imgSrc, setImgSrc] = useState(imageSrc);

  const pointers = useRef(new Map());
  const gesture = useRef({ startDist: null, startScale: 1, dragStart: null, translateStart: null });

  function clampTranslate(t, s) {
    const maxOffset = (s - 1) * 120;
    return {
      x: clamp(t.x, -maxOffset, maxOffset),
      y: clamp(t.y, -maxOffset, maxOffset),
    };
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      gesture.current.dragStart = { x: e.clientX, y: e.clientY };
      gesture.current.translateStart = translate;
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      gesture.current.startDist = distance(pts[0], pts[1]);
      gesture.current.startScale = scale;
    }
  }

  function handlePointerMove(e) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && gesture.current.startDist) {
      const pts = Array.from(pointers.current.values());
      const dist = distance(pts[0], pts[1]);
      const nextScale = clamp(gesture.current.startScale * (dist / gesture.current.startDist), MIN_SCALE, MAX_SCALE);
      setScale(nextScale);
    } else if (pointers.current.size === 1 && gesture.current.dragStart) {
      const dx = e.clientX - gesture.current.dragStart.x;
      const dy = e.clientY - gesture.current.dragStart.y;
      setTranslate(
        clampTranslate(
          { x: gesture.current.translateStart.x + dx, y: gesture.current.translateStart.y + dy },
          scale
        )
      );
    }
  }

  function handlePointerUp(e) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current.startDist = null;
    if (pointers.current.size === 0) gesture.current.dragStart = null;
  }

  function handleWheel(e) {
    e.preventDefault();
    setScale((s) => clamp(s - e.deltaY * 0.002, MIN_SCALE, MAX_SCALE));
  }

  function handleDoubleClick() {
    if (scale > 1.2) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }

  return (
    <div className="explore-overlay" onClick={() => setSelected(null)}>
      <button className="explore-close" onClick={onClose} aria-label="Close explore view">
        ✕
      </button>

      <div
        className="explore-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className="explore-transform"
          style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})` }}
        >
          <img
            src={imgSrc}
            alt="Zoomable view of the Moon"
            className="explore-image"
            draggable={false}
            onError={() => setImgSrc(fallbackSrc)}
          />
          {landmarks.map((l) => {
            const { leftPct, topPct } = discToImagePercent(l.x, l.y);
            return (
              <button
                key={l.name}
                className="explore-dot"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(l);
                }}
                aria-label={l.name}
              />
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="explore-popover" onClick={(e) => e.stopPropagation()}>
          <div className="explore-popover-title">{selected.name}</div>
          <div className="explore-popover-type">{selected.type}</div>
          <p className="explore-popover-note">{selected.note}</p>
          <button className="explore-popover-close" onClick={() => setSelected(null)}>
            Close
          </button>
        </div>
      )}

      <p className="explore-hint">Pinch or scroll to zoom · drag to pan · tap a dot for details</p>
    </div>
  );
}
