import { type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { type Getter, atom } from "jotai";
import { toast } from "sonner";
import { appStore } from "@/store/0-app-store";
import { appSettings } from "@/store/1-ui-settings";
import { docState, insertSvgMarkup, loadSvgFile } from "@/store/3-document";
import {
    ToolId, activeToolIdAtom, canvasSizeAtom, editingGroupIdAtom, hoverNodeIdAtom, isPanningAtom, panByAtom, pointerDocAtom, pruneSelectionAtom,
    screenToDoc, setSelectionAtom, spaceHeldAtom, viewportAtom, zoomByAtom, zoomToFitAtom,
} from "@/store/4-editor";
import { type Point } from "@/svg-core";
import { type ToolPointerEvent, getTool, resolveTarget, selectionUnitId } from "@/tools";
import { PROPERTIES_POPUP_RIGHT_EDGE_PX } from "@/components/1-workspace/3-properties/9-atoms-properties-popup";

type CanvasPointerEvent = ReactPointerEvent<SVGSVGElement>;

let pan: { x: number; y: number; } | null = null;
let toolGesture = false;

/** Pointer-down click count: `detail` is 0 on pointerdown in some browsers, so the count is tracked here */
const DOUBLE_CLICK_MS = 500;
const DOUBLE_CLICK_PX = 5;
let lastDown = { time: -Infinity, x: 0, y: 0, count: 0 };

function nextClickCount(screen: Point): number {
    const now = performance.now();
    const near = Math.hypot(screen.x - lastDown.x, screen.y - lastDown.y) <= DOUBLE_CLICK_PX;
    const count = near && now - lastDown.time <= DOUBLE_CLICK_MS ? lastDown.count + 1 : 1;
    lastDown = { time: now, x: screen.x, y: screen.y, count };
    return count;
}

function canvasPoint(e: { clientX: number; clientY: number; currentTarget: Element; }) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function toToolEvent(get: Getter, e: CanvasPointerEvent): ToolPointerEvent {
    const screen = canvasPoint(e);
    return {
        screen,
        doc: screenToDoc(get(viewportAtom), screen),
        button: e.button,
        shift: e.shiftKey,
        alt: e.altKey,
        ctrl: e.ctrlKey || e.metaKey,
        clickCount: 1,                  // set on pointer down, see nextClickCount
        target: resolveTarget(e.target as Element),
    };
}

//---------------------------------------------------------------------------

export const canvasPointerDownAtom = atom(
    null,
    (get, set, e: CanvasPointerEvent) => {
        if (e.button === 2) {
            return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        (document.activeElement as HTMLElement | null)?.blur?.(); // keyboard shortcuts go to the canvas, not to a focused input

        const toolId = get(activeToolIdAtom);
        if (e.button === 1 || get(spaceHeldAtom) || toolId === ToolId.hand) {
            e.preventDefault();
            pan = { x: e.clientX, y: e.clientY };
            set(isPanningAtom, true);
            return;
        }
        if (e.button !== 0) {
            return;
        }

        toolGesture = true;
        set(hoverNodeIdAtom, null);
        const ev = toToolEvent(get, e);
        ev.clickCount = nextClickCount(ev.screen);
        getTool(toolId).onPointerDown?.({ get, set }, ev);
    }
);

export const canvasPointerMoveAtom = atom(
    null,
    (get, set, e: CanvasPointerEvent) => {
        if (pan) {
            set(panByAtom, { dx: e.clientX - pan.x, dy: e.clientY - pan.y });
            pan = { x: e.clientX, y: e.clientY };
            return;
        }

        const ev = toToolEvent(get, e);
        set(pointerDocAtom, ev.doc);

        if (toolGesture) {
            getTool(get(activeToolIdAtom)).onPointerMove?.({ get, set }, ev);
            return;
        }

        const t = ev.target;
        const hover = t.type === 'node'
            ? (get(activeToolIdAtom) === ToolId.points ? t.leafId : selectionUnitId(docState.doc, t.leafId, get(editingGroupIdAtom)))
            : null;
        if (get(hoverNodeIdAtom) !== hover) {
            set(hoverNodeIdAtom, hover);
        }
    }
);

export const canvasPointerUpAtom = atom(
    null,
    (get, set, e: CanvasPointerEvent) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        if (pan) {
            pan = null;
            set(isPanningAtom, false);
            return;
        }
        if (toolGesture) {
            toolGesture = false;
            getTool(get(activeToolIdAtom)).onPointerUp?.({ get, set }, toToolEvent(get, e));
        }
    }
);

export const canvasPointerLeaveAtom = atom(
    null,
    (_get, set) => {
        set(hoverNodeIdAtom, null);
        set(pointerDocAtom, null);
    }
);

//---------------------------------------------------------------------------

export const canvasCursorAtom = atom(
    (get) => {
        if (get(isPanningAtom)) {
            return 'grabbing';
        }
        if (get(spaceHeldAtom)) {
            return 'grab';
        }
        return getTool(get(activeToolIdAtom)).cursor;
    }
);

// Drag and drop of SVG files or markup

export function canvasDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
}

export const canvasDropAtom = atom(
    null,
    async (_get, set, e: DragEvent) => {
        e.preventDefault();
        const file = Array.from(e.dataTransfer.files).find((f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'));
        if (file) {
            const rv = await loadSvgFile(file);
            if (rv.ok) {
                set(setSelectionAtom, []);
                set(zoomToFitAtom);
            } else if ('error' in rv) {
                toast.error(`Cannot open ${file.name}: ${rv.error}`);
            }
            return;
        }
        const text = e.dataTransfer.getData('text/plain');
        if (text.includes('<')) {
            const ids = insertSvgMarkup(text);
            ids ? set(setSelectionAtom, ids) : toast.error('Dropped text is not SVG markup');
            set(pruneSelectionAtom);
        }
    }
);

// Mount: size tracking, initial fit, non-passive wheel listener

let fitted = false;

/** False until the first fit to the viewBox has set the viewport; the canvas stays transparent until then */
export const canvasReadyAtom = atom(false);

/** Stable ref callback (module-level, so React calls it only on mount and unmount) */
export function canvasRef(el: SVGSVGElement | null) {
    if (!el) {
        return;
    }

    const ro = new ResizeObserver(
        ([entry]) => {
            const { width, height } = entry.contentRect;
            appStore.set(canvasSizeAtom, { width, height });
            if (!fitted && width > 0 && height > 0) {
                fitted = true;
                appStore.set(zoomToFitAtom, { leftInset: appSettings.prefs.fitAvoidsProperties ? PROPERTIES_POPUP_RIGHT_EDGE_PX : 0 });
                appStore.set(canvasReadyAtom, true);
            }
        }
    );
    ro.observe(el);

    const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        const at = { x: e.clientX - r.left, y: e.clientY - r.top };
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;

        if (e.shiftKey && !e.ctrlKey) {
            appStore.set(panByAtom, { dx: -(e.deltaY || e.deltaX) * unit, dy: 0 });
            return;
        }
        
        const speed = e.ctrlKey ? 0.01 : 0.0015; // ctrl+wheel is a trackpad pinch
        appStore.set(zoomByAtom, { factor: Math.exp(-e.deltaY * unit * speed), at });
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
        ro.disconnect();
        el.removeEventListener('wheel', onWheel);
    };
}
