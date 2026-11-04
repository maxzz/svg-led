import { useAtomValue } from "jotai";
import { type SvgDoc, type Rect, findNode } from "@/svg-core";
import { nodesDocBBox, useDocSnapshot } from "@/store/3-document";
import { canvasSizeAtom, hoverNodeIdAtom, rectToScreen, selectionAtom, viewportAtom } from "@/store/4-editor";
import { type ResizeHandle } from "@/tools/9-types-tool-def";
import { RESIZE_CURSOR, ROTATE_TOOLTIP_GAP, rotateBandD, rotateReadoutAtom, selectionGripsHiddenAtom } from "@/tools/tool-2-select";
import { nodeScreenMatrix, outlineScreenD } from "./8-overlays-math";

const HANDLE = 4; // every grip; rotation starts just outside this square (see ROTATE_INNER_PX)

const EDGES: [ResizeHandle, number, number][] = [['n', 0.5, 0], ['e', 1, 0.5], ['s', 0.5, 1], ['w', 0, 0.5]];
const CORNERS: [ResizeHandle, number, number][] = [['nw', 0, 0], ['ne', 1, 0], ['se', 1, 1], ['sw', 0, 1]];

/** Select tool: outlines of selected elements, the combined bbox, and a square grip on each corner and edge */
export function Overlay_Selection() {
    const doc = useDocSnapshot();
    const vp = useAtomValue(viewportAtom);
    const selection = useAtomValue(selectionAtom);
    const hover = useAtomValue(hoverNodeIdAtom);
    const hideGrips = useAtomValue(selectionGripsHiddenAtom);
    const bbox = selection.length ? nodesDocBBox(doc, selection) : null;
    const box = bbox && rectToScreen(vp, bbox);

    // a selected group or several elements show a dashed box, a single element a solid one
    const dashed = selection.length > 1 || selection.some((id) => findNode(doc, id)?.node.kind === 'g');

    return (
        <g>
            {hover && !selection.includes(hover) && (
                <Outline doc={doc} id={hover} className="stroke-(--editor-accent)/70" />
            )}

            {selection.map(
                (id) => <Outline doc={doc} id={id} key={id} className="stroke-(--editor-accent)" />
            )}

            {box && (<>
                <path d={rotateBandD(box)} fill="black" fillOpacity={0} fillRule="evenodd" pointerEvents="visibleFill" data-hit="rotate" />
                <rect
                    className="stroke-(--editor-accent) pointer-events-none"
                    x={box.x} y={box.y} width={box.width} height={box.height}
                    fill="none" strokeWidth={1} strokeDasharray={dashed ? "4 3" : undefined}
                />

                {!hideGrips && EDGES.map(([handle, fx, fy]) => <Grip key={handle} handle={handle} box={box} fx={fx} fy={fy} />)}
                {!hideGrips && CORNERS.map(([handle, fx, fy]) => <Grip key={handle} handle={handle} box={box} fx={fx} fy={fy} />)}
            </>)}

            <RotateTooltip />
        </g>
    );
}

/** Degrees follow the pointer while a rotation drag is active. The label is 8px and sits 16px from the cursor. */
function RotateTooltip() {
    const readout = useAtomValue(rotateReadoutAtom);
    const canvas = useAtomValue(canvasSizeAtom);
    if (!readout) {
        return null;
    }

    const width = tooltipWidth(readout.label);
    let x = readout.x + ROTATE_TOOLTIP_GAP;
    let y = readout.y - TOOLTIP_H / 2;
    if (canvas.width > 0 && x + width > canvas.width - 2) {
        x = readout.x - ROTATE_TOOLTIP_GAP - width;
    }
    if (canvas.height > 0) {
        y = Math.min(Math.max(1, y), Math.max(1, canvas.height - TOOLTIP_H - 1));
    }

    return (
        <g className="pointer-events-none" transform={`translate(${x} ${y})`}>
            <rect width={width} height={TOOLTIP_H} strokeWidth={1} className="fill-background stroke-foreground/40" />
            <text
                x={width / 2}
                y={TOOLTIP_H / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                className="font-sans fill-foreground"
                style={{ fontSize: 8 }}
            >
                {readout.label}
            </text>
        </g>
    );
}

const TOOLTIP_H = 12;
const TOOLTIP_PAD_X = 3;

function tooltipWidth(label: string): number {
    const ctx = measureCtx();
    if (!ctx) {
        return Math.ceil(label.length * 4.8) + TOOLTIP_PAD_X * 2;
    }
    ctx.font = '8px Assistant, sans-serif';
    return Math.ceil(ctx.measureText(label).width) + TOOLTIP_PAD_X * 2;
}

let measure: CanvasRenderingContext2D | null | undefined;

function measureCtx(): CanvasRenderingContext2D | null {
    if (measure !== undefined) {
        return measure;
    }
    measure = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    return measure;
}

/** A square centered on a corner or on the middle of an edge. Only this square resizes; the rest of the edge does not. */
function Grip({ handle, box, fx, fy }: { handle: ResizeHandle; box: Rect; fx: number; fy: number; }) {
    return (
        <rect
            className={`fill-background stroke-(--editor-accent) ${RESIZE_CURSOR[handle]}`}
            strokeWidth={1}
            x={box.x + fx * box.width - HANDLE / 2}
            y={box.y + fy * box.height - HANDLE / 2}
            width={HANDLE}
            height={HANDLE}
            data-hit="resize"
            data-handle={handle}
        />
    );
}

function Outline({ doc, id, className }: { doc: SvgDoc; id: string; className: string; }) {
    const vp = useAtomValue(viewportAtom);
    const loc = findNode(doc, id);
    const m = nodeScreenMatrix(doc, vp, id);
    if (!loc || !m) {
        return null;
    }
    return <path d={outlineScreenD(loc.node, m)} fill="none" strokeWidth={1} className={`${className} pointer-events-none`} />;
}
