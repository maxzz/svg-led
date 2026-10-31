import { useAtomValue } from "jotai";
import { type SvgDoc, type Rect, findNode } from "@/svg-core";
import { nodesDocBBox, useDocSnapshot } from "@/store/3-document";
import { hoverNodeIdAtom, rectToScreen, selectionAtom, viewportAtom } from "@/store/4-editor";
import { type ResizeHandle } from "@/tools/9-types-tool-def";
import { nodeScreenMatrix, outlineScreenD } from "./0-overlay-geometry";

const HANDLE = 4;      // corner grip; the 1px stroke sits on the edge, so it paints about 5px
const EDGE_LONG = 8;   // length of an edge resize rectangle, along the side
const EDGE_THICK = 4;  // thickness of that rectangle, same as the corner grip

const CORNERS: [ResizeHandle, number, number][] = [['nw', 0, 0], ['ne', 1, 0], ['se', 1, 1], ['sw', 0, 1]];
const EDGES: ResizeHandle[] = ['n', 'e', 's', 'w'];

const CORNER_CURSOR: Partial<Record<ResizeHandle, string>> = {
    nw: 'nwse-resize', se: 'nwse-resize',
    ne: 'nesw-resize', sw: 'nesw-resize',
};

/** Tailwind utilities from the cursors plugin: vertical on the top and bottom, horizontal on the sides */
const EDGE_CURSOR: Partial<Record<ResizeHandle, string>> = {
    n: 'cursor-resize-ns', s: 'cursor-resize-ns',
    e: 'cursor-resize-ew', w: 'cursor-resize-ew',
};

/** Select tool: outlines of selected elements, the combined bbox, corner grips, and one resize rectangle per edge */
export function SelectionOverlay() {
    const doc = useDocSnapshot();
    const vp = useAtomValue(viewportAtom);
    const selection = useAtomValue(selectionAtom);
    const hover = useAtomValue(hoverNodeIdAtom);
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
                <rect
                    className="stroke-(--editor-accent) pointer-events-none"
                    x={box.x} y={box.y} width={box.width} height={box.height}
                    fill="none" strokeWidth={1} strokeDasharray={dashed ? "4 3" : undefined}
                />

                {EDGES.map((handle) => <EdgeGrip key={handle} handle={handle} box={box} />)}
                {CORNERS.map(([handle, fx, fy]) => <Grip key={handle} handle={handle} box={box} fx={fx} fy={fy} />)}
            </>)}
        </g>
    );
}

function Grip({ handle, box, fx, fy }: { handle: ResizeHandle; box: Rect; fx: number; fy: number; }) {
    return (
        <rect
            className="fill-background stroke-(--editor-accent)"
            style={{ cursor: CORNER_CURSOR[handle] }}
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

/** A short rectangle centered on one side. Only this rectangle resizes that side; the rest of the edge does not. */
function EdgeGrip({ handle, box }: { handle: ResizeHandle; box: Rect; }) {
    const horizontal = handle === 'n' || handle === 's';
    const along = horizontal ? box.width : box.height;
    const long = Math.min(EDGE_LONG, Math.max(EDGE_THICK, along - HANDLE));
    const w = horizontal ? long : EDGE_THICK;
    const h = horizontal ? EDGE_THICK : long;
    const cx = box.x + (handle === 'w' ? 0 : handle === 'e' ? box.width : box.width / 2);
    const cy = box.y + (handle === 'n' ? 0 : handle === 's' ? box.height : box.height / 2);
    return (
        <rect
            className={`fill-background stroke-(--editor-accent) ${EDGE_CURSOR[handle]}`}
            strokeWidth={1}
            x={cx - w / 2}
            y={cy - h / 2}
            width={w}
            height={h}
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
