import { useAtomValue } from "jotai";
import { type SvgDoc, type Rect, findNode } from "@/svg-core";
import { nodesDocBBox, useDocSnapshot } from "@/store/3-document";
import { hoverNodeIdAtom, rectToScreen, selectionAtom, viewportAtom } from "@/store/4-editor";
import { type ResizeHandle } from "@/tools/9-types-tool-def";
import { nodeScreenMatrix, outlineScreenD } from "./0-overlay-geometry";

const PAD = 4;      // gap between the selection and its bounding box
const HANDLE = 8;   // size of the corner and midpoint grips
const EDGE = 6;     // width of the invisible strip along each edge, the part of an edge that takes the pointer

const CORNERS: [ResizeHandle, number, number][] = [['nw', 0, 0], ['ne', 1, 0], ['se', 1, 1], ['sw', 0, 1]];
const EDGES: ResizeHandle[] = ['n', 'e', 's', 'w'];

const CURSOR: Record<ResizeHandle, string> = {
    nw: 'nwse-resize', se: 'nwse-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
    n: 'ns-resize', s: 'ns-resize',
    e: 'ew-resize', w: 'ew-resize',
};

/** Select tool: outlines of selected elements, the combined bbox with resize handles, and the hover outline */
export function SelectionOverlay() {
    const doc = useDocSnapshot();
    const vp = useAtomValue(viewportAtom);
    const selection = useAtomValue(selectionAtom);
    const hover = useAtomValue(hoverNodeIdAtom);
    const bbox = selection.length ? nodesDocBBox(doc, selection) : null;
    const r = bbox && rectToScreen(vp, bbox);
    const box = r && { x: r.x - PAD, y: r.y - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };

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
                {/* Combined bbox dashed rectangle */}
                <rect
                    className="stroke-(--editor-accent) pointer-events-none"
                    x={box.x} y={box.y} width={box.width} height={box.height}
                    fill="none" strokeWidth={1} strokeDasharray={dashed ? "4 3" : undefined}
                />

                {/* Edges: a thin invisible strip along each side (no visible grip), resizes only the axis perpendicular to it */}
                {EDGES.map((handle) => (
                    <rect
                        key={handle}
                        {...edgeStrip(handle, box)}
                        fill="transparent"
                        style={{ cursor: CURSOR[handle] }}
                        data-hit="resize"
                        data-handle={handle}
                    />
                ))}

                {/* Corner grips: both axes */}
                {CORNERS.map(([handle, fx, fy]) => <Grip key={handle} handle={handle} box={box} fx={fx} fy={fy} />)}
            </>)}
        </g>
    );
}

function Grip({ handle, box, fx, fy }: { handle: ResizeHandle; box: Rect; fx: number; fy: number; }) {
    return (
        <rect
            className="fill-background stroke-(--editor-accent)"
            style={{ cursor: CURSOR[handle] }}
            rx={2}
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

/** The strip along one side of the box, between the corner grips */
function edgeStrip(handle: ResizeHandle, box: Rect): Rect {
    const innerW = Math.max(0, box.width - HANDLE);
    const innerH = Math.max(0, box.height - HANDLE);
    switch (handle) {
        case 'n': return { x: box.x + HANDLE / 2, y: box.y - EDGE / 2, width: innerW, height: EDGE };
        case 's': return { x: box.x + HANDLE / 2, y: box.y + box.height - EDGE / 2, width: innerW, height: EDGE };
        case 'w': return { x: box.x - EDGE / 2, y: box.y + HANDLE / 2, width: EDGE, height: innerH };
        case 'e': return { x: box.x + box.width - EDGE / 2, y: box.y + HANDLE / 2, width: EDGE, height: innerH };
        default: return { x: 0, y: 0, width: 0, height: 0 };
    }
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
