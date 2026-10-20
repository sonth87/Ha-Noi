/* Wheel zoom (about the cursor), drag to pan, double-click to reset, on a scene's <svg>.
   Works on the viewBox only, so the scene's SVG is never rebuilt; zoom and centre (as fractions
   of the base frame) survive rebuilds such as a view rotation. A drag never counts as a click. */
import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent, type RefObject } from 'react';

const MAX_ZOOM = 12;

export function useZoomPan(ref: RefObject<SVGSVGElement | null>, base: string) {
  const st = useRef({ z: 1, fx: 0.5, fy: 0.5 });
  const drag = useRef<{ x: number; y: number; fx: number; fy: number; moved: boolean } | null>(null);
  const swallowClick = useRef(false);

  const apply = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const [bx = 0, by = 0, bw = 1, bh = 1] = base.split(/\s+/).map(Number);
    const s = st.current, half = 0.5 / s.z;
    s.fx = Math.min(1 - half, Math.max(half, s.fx));
    s.fy = Math.min(1 - half, Math.max(half, s.fy));
    const w = bw / s.z, h = bh / s.z;
    el.setAttribute('viewBox', `${(bx + s.fx * bw - w / 2).toFixed(2)} ${(by + s.fy * bh - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
    el.classList.toggle('zoomed', s.z > 1.01);
  }, [ref, base]);

  useLayoutEffect(apply, [apply]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect(), s = st.current;
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      const cx = s.fx + px / s.z, cy = s.fy + py / s.z;            // cursor, as a fraction of the base frame
      const z = Math.min(MAX_ZOOM, Math.max(1, s.z * Math.exp(-e.deltaY * 0.0015)));
      st.current = { z, fx: cx - px / z, fy: cy - py / z };       // keep the cursor's point under the cursor
      apply();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref, apply]);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || st.current.z <= 1.01) return;
    drag.current = { x: e.clientX, y: e.clientY, fx: st.current.fx, fy: st.current.fy, moved: false };
  };
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current, el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) { d.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); }
    if (!d.moved) return;
    const r = el.getBoundingClientRect();
    st.current.fx = d.fx - dx / r.width / st.current.z;
    st.current.fy = d.fy - dy / r.height / st.current.z;
    apply();
  };
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) { swallowClick.current = true; ref.current?.classList.remove('dragging'); ref.current?.releasePointerCapture(e.pointerId); }
  };
  const onDoubleClick = () => { st.current = { z: 1, fx: 0.5, fy: 0.5 }; apply(); };
  /** true if this click ends a drag and must be ignored */
  const consumeDragClick = () => { const s = swallowClick.current; swallowClick.current = false; return s; };

  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onDoubleClick }, consumeDragClick };
}
