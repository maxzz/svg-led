import { atom } from "jotai";
import { type Point, type Rect } from "@/svg-core";

/** screen = doc * zoom + (x, y), in canvas pixels */
export type Viewport = { x: number; y: number; zoom: number; };

export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 256;

export const viewportAtom = atom<Viewport>({ x: 0, y: 0, zoom: 1 });

export const canvasSizeAtom = atom<{ width: number; height: number; }>({ width: 0, height: 0 });

//---------------------------------------------------------------------------

export function docToScreen(vp: Viewport, p: Point): Point {
    return { x: p.x * vp.zoom + vp.x, y: p.y * vp.zoom + vp.y };
}

export function screenToDoc(vp: Viewport, p: Point): Point {
    return { x: (p.x - vp.x) / vp.zoom, y: (p.y - vp.y) / vp.zoom };
}

export function rectToScreen(vp: Viewport, r: Rect): Rect {
    return { x: r.x * vp.zoom + vp.x, y: r.y * vp.zoom + vp.y, width: r.width * vp.zoom, height: r.height * vp.zoom };
}

function clampZoom(z: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

//---------------------------------------------------------------------------

/** Zooms keeping the given screen point fixed; defaults to the canvas center */
export const zoomAtAtom = atom(
    null,
    (get, set, { zoom, at }: { zoom: number; at?: Point; }) => {
        const vp = get(viewportAtom);
        const size = get(canvasSizeAtom);
        const p = at ?? { x: size.width / 2, y: size.height / 2 };
        const z = clampZoom(zoom);
        const doc = screenToDoc(vp, p);
        set(viewportAtom, { zoom: z, x: p.x - doc.x * z, y: p.y - doc.y * z });
    }
);

export const zoomByAtom = atom(
    null,
    (get, set, { factor, at }: { factor: number; at?: Point; }) => {
        set(zoomAtAtom, { zoom: get(viewportAtom).zoom * factor, at });
    }
);

export const panByAtom = atom(
    null,
    (get, set, { dx, dy }: { dx: number; dy: number; }) => {
        const vp = get(viewportAtom);
        set(viewportAtom, { ...vp, x: vp.x + dx, y: vp.y + dy });
    }
);

/**
 * Viewport that fits a document rect into the canvas with a margin in pixels.
 * `leftInset` reserves canvas pixels on the left (e.g. under the Properties panel); the content is centered in what remains.
 */
export function fitRectViewport(size: { width: number; height: number; }, rect: Rect, leftInset = 0): Viewport | null {
    if (!size.width || !size.height) {
        return null;
    }
    const margin = 80; // keeps the content clear of the floating toolbar
    const areaX = Math.min(leftInset, size.width);
    const areaW = Math.max(size.width - areaX, 1);
    const w = Math.max(rect.width, 1e-6);
    const h = Math.max(rect.height, 1e-6);
    const zoom = clampZoom(Math.min((areaW - 2 * margin) / w, (size.height - 2 * margin) / h));
    return {
        zoom,
        x: areaX + (areaW - w * zoom) / 2 - rect.x * zoom,
        y: (size.height - h * zoom) / 2 - rect.y * zoom,
    };
}

/** Fits a document rect into the canvas with a margin in pixels */
export const zoomToRectAtom = atom(
    null,
    (get, set, rect: Rect | null) => {
        const vp = rect && fitRectViewport(get(canvasSizeAtom), rect);
        vp && set(viewportAtom, vp);
    }
);
