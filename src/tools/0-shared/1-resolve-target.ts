import { type CanvasTarget, type ResizeHandle } from "../1-types";

/**
 * Finds what the pointer is over from data attributes:
 * overlay elements carry data-hit (+ data-nid, data-key, data-side, data-handle),
 * document elements carry data-nid on every rendered node.
 */
export function resolveTarget(el: Element | null): CanvasTarget {
    if (!el) {
        return { type: 'none' };
    }

    const hit = el.closest<HTMLElement | SVGElement>('[data-hit]');
    if (hit) {
        const d = hit.dataset;
        switch (d.hit) {
            case 'anchor':
                return { type: 'anchor', nodeId: d.nid!, key: d.key! };
            case 'handle':
                return { type: 'handle', nodeId: d.nid!, key: d.key!, side: d.side === 'in' ? 'in' : 'out' };
            case 'shape-handle':
                return { type: 'shape-handle', nodeId: d.nid!, key: d.key! };
            case 'resize':
                return { type: 'resize', handle: d.handle as ResizeHandle };
        }
    }

    let leafId: string | undefined;
    let topId: string | undefined;
    let cur: Element | null = el.closest('[data-nid]');
    while (cur) {
        const id = (cur as SVGElement).dataset.nid;
        if (id) {
            leafId ??= id;
            topId = id;
        }
        cur = cur.parentElement?.closest('[data-nid]') ?? null;
    }

    return leafId && topId ? { type: 'node', topId, leafId } : { type: 'none' };
}
