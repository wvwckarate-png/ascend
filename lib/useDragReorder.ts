'use client';
import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

/**
 * Drag-to-reorder for a small grid/list of cards. Works with mouse and touch (pointer events), no library.
 * Spread `cardProps(id)` onto each card while `enabled`; the list re-orders live as a card is dragged over another,
 * and `onCommit` is called with the final order when the card is dropped. `move(id, ±1)` is the button/keyboard path.
 */
export function useDragReorder<T extends { id: string }>(items: T[], setItems: (next: T[]) => void, enabled: boolean, onCommit: (final: T[]) => void) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const order = useRef<T[]>(items);
  const moved = useRef(false);

  const cardProps = useCallback((id: string) => {
    if (!enabled) return {};
    return {
      'data-reorder-id': id,
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest('button')) return;       // the arrow buttons handle themselves
        order.current = items; dragId.current = id; moved.current = false; setDraggingId(id);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (dragId.current !== id) return;
        const over = (document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-reorder-id]') as HTMLElement | null)?.dataset.reorderId;
        if (!over || over === id) return;
        const next = [...order.current];
        const from = next.findIndex(x => x.id === id), to = next.findIndex(x => x.id === over);
        if (from < 0 || to < 0) return;
        next.splice(to, 0, next.splice(from, 1)[0]);
        order.current = next; moved.current = true; setItems(next);
      },
      onPointerUp: () => { if (dragId.current === id) { dragId.current = null; setDraggingId(null); if (moved.current) onCommit(order.current); } },
      onPointerCancel: () => { if (dragId.current === id) { dragId.current = null; setDraggingId(null); if (moved.current) onCommit(order.current); } },
      style: { touchAction: 'none', cursor: draggingId === id ? 'grabbing' : 'grab', userSelect: 'none' } as CSSProperties,
    };
  }, [enabled, items, setItems, onCommit, draggingId]);

  const move = useCallback((id: string, delta: -1 | 1) => {
    const from = items.findIndex(x => x.id === id), to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = [...items]; next.splice(to, 0, next.splice(from, 1)[0]);
    setItems(next); onCommit(next);
  }, [items, setItems, onCommit]);

  return { cardProps, move, draggingId };
}
