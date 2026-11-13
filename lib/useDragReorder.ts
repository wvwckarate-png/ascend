'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const SLIDE_MS = 200;   // how long the other cards take to slide aside

/** Where the card being dragged is floating (screen coordinates), so the page can draw a copy under the finger. */
export type DragGhost = { id: string; left: number; top: number; width: number; height: number };

/**
 * Drag-to-reorder for a small grid/list of cards. Works with mouse and touch (pointer events), no library.
 * Spread `cardProps(id)` onto each card while `enabled`.
 *  - While a card is dragged, `ghost` says where to draw the floating copy; the card's own slot stays in the grid
 *    as the "it will land here" outline (style it using `draggingId`).
 *  - The list re-orders live as the card passes over another, and the other cards slide to their new places.
 *  - `onCommit` is called with the final order when the card is dropped. `move(id, ±1)` is the button/keyboard path.
 */
export function useDragReorder<T extends { id: string }>(items: T[], setItems: (next: T[]) => void, enabled: boolean, onCommit: (final: T[]) => void) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const dragId = useRef<string | null>(null);
  const grab = useRef({ dx: 0, dy: 0, width: 0, height: 0 });
  const order = useRef<T[]>(items);
  const moved = useRef(false);
  const lastSwap = useRef(0);
  const point = useRef({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleAgain = useRef<(id: string) => void>(() => {});
  const rects = useRef(new Map<string, { left: number; top: number }>());

  // Slide cards to their new places whenever the order changes (measure where each card was, then animate from there).
  const orderKey = items.map(x => x.id).join('|');
  useLayoutEffect(() => {
    if (!enabled) { rects.current.clear(); return; }
    const els = [...document.querySelectorAll<HTMLElement>('[data-reorder-id]')];
    els.forEach(el => el.getAnimations().forEach(a => a.cancel()));
    const next = new Map<string, { left: number; top: number }>();
    for (const el of els) { const r = el.getBoundingClientRect(); next.set(el.dataset.reorderId!, { left: r.left, top: r.top }); }
    const calm = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!calm) for (const el of els) {
      const was = rects.current.get(el.dataset.reorderId!), now = next.get(el.dataset.reorderId!)!;
      if (!was) continue;
      const dx = was.left - now.left, dy = was.top - now.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: SLIDE_MS, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    }
    rects.current = next;
  }, [orderKey, enabled]);

  // Move the dragged card's slot to whichever card is under the pointer. While the other cards are still sliding
  // from the last move it waits, then looks again — so a quick flick that stops still lands in the right place.
  const settle = useCallback((id: string) => {
    if (dragId.current !== id) return;
    const wait = SLIDE_MS + 20 - (Date.now() - lastSwap.current);
    if (wait > 0) { if (!timer.current) timer.current = setTimeout(() => { timer.current = null; settleAgain.current(id); }, wait); return; }
    const over = (document.elementFromPoint(point.current.x, point.current.y)?.closest('[data-reorder-id]') as HTMLElement | null)?.dataset.reorderId;
    if (!over || over === id) return;
    const next = [...order.current];
    const from = next.findIndex(x => x.id === id), to = next.findIndex(x => x.id === over);
    if (from < 0 || to < 0) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    order.current = next; moved.current = true; lastSwap.current = Date.now(); setItems(next);
  }, [setItems]);
  useEffect(() => { settleAgain.current = settle; }, [settle]);

  const finish = useCallback((id: string) => {
    if (dragId.current !== id) return;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    dragId.current = null; setDraggingId(null); setGhost(null);
    if (moved.current) onCommit(order.current);
  }, [onCommit]);

  const cardProps = useCallback((id: string) => {
    if (!enabled) return {};
    return {
      'data-reorder-id': id,
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;       // the arrow buttons handle themselves
        const r = e.currentTarget.getBoundingClientRect();
        grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, width: r.width, height: r.height };
        order.current = items; dragId.current = id; moved.current = false; lastSwap.current = 0;
        setDraggingId(id); setGhost({ id, left: r.left, top: r.top, width: r.width, height: r.height });
        e.currentTarget.setPointerCapture?.(e.pointerId);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (dragId.current !== id) return;
        setGhost({ id, left: e.clientX - grab.current.dx, top: e.clientY - grab.current.dy, width: grab.current.width, height: grab.current.height });
        point.current = { x: e.clientX, y: e.clientY };
        settle(id);
      },
      onPointerUp: () => finish(id),
      onPointerCancel: () => finish(id),
      style: { touchAction: 'none', cursor: draggingId === id ? 'grabbing' : 'grab', userSelect: 'none', WebkitUserSelect: 'none' } as CSSProperties,
    };
  }, [enabled, items, draggingId, finish, settle]);

  const move = useCallback((id: string, delta: -1 | 1) => {
    const from = items.findIndex(x => x.id === id), to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = [...items]; next.splice(to, 0, next.splice(from, 1)[0]);
    setItems(next); onCommit(next);
  }, [items, setItems, onCommit]);

  return { cardProps, move, draggingId, ghost };
}
