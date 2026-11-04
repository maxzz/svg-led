import { type Rect } from "@/svg-core";

/** Edge or center line of the selection that the elements are aligned to */
export type AlignEdge = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

export type DistributeAxis = 'horizontal' | 'vertical';

/** An element with its bounding box in document units */
export type AlignItem = { id: string; rect: Rect; };

/** Translation that moves an element to its new place */
export type AlignOffset = { id: string; dx: number; dy: number; };

/**
 * Moves every item so that its edge (or center) lines up with the same edge (or center) of the union of all items.
 * Items already in place get a zero offset.
 */
export function alignOffsets(items: readonly AlignItem[], edge: AlignEdge): AlignOffset[] {
    if (items.length < 2) {
        return [];
    }

    const minX = Math.min(...items.map((i) => i.rect.x));
    const maxX = Math.max(...items.map((i) => i.rect.x + i.rect.width));
    const minY = Math.min(...items.map((i) => i.rect.y));
    const maxY = Math.max(...items.map((i) => i.rect.y + i.rect.height));

    return items.map(({ id, rect }) => {
        const right = rect.x + rect.width;
        const bottom = rect.y + rect.height;
        switch (edge) {
            case 'left':     return { id, dx: minX - rect.x, dy: 0 };
            case 'right':    return { id, dx: maxX - right, dy: 0 };
            case 'center-h': return { id, dx: (minX + maxX) / 2 - (rect.x + right) / 2, dy: 0 };
            case 'top':      return { id, dx: 0, dy: minY - rect.y };
            case 'bottom':   return { id, dx: 0, dy: maxY - bottom };
            case 'center-v': return { id, dx: 0, dy: (minY + maxY) / 2 - (rect.y + bottom) / 2 };
        }
    });
}

/**
 * Spaces the items so that the gaps between neighbours are equal.
 * The first and the last item (by position) stay where they are; the ones in between move.
 */
export function distributeOffsets(items: readonly AlignItem[], axis: DistributeAxis): AlignOffset[] {
    if (items.length < 3) {
        return [];
    }

    const horizontal = axis === 'horizontal';
    const start = (r: Rect) => (horizontal ? r.x : r.y);
    const size = (r: Rect) => (horizontal ? r.width : r.height);

    const sorted = [...items].sort((a, b) => start(a.rect) - start(b.rect));
    const first = sorted[0].rect;
    const last = sorted[sorted.length - 1].rect;

    const span = start(last) + size(last) - start(first);
    const totalSize = sorted.reduce((sum, i) => sum + size(i.rect), 0);
    const gap = (span - totalSize) / (sorted.length - 1);

    let pos = start(first);
    return sorted.map(({ id, rect }) => {
        const d = pos - start(rect);
        pos += size(rect) + gap;
        return horizontal ? { id, dx: d, dy: 0 } : { id, dx: 0, dy: d };
    });
}
