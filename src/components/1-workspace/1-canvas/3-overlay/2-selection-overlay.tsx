import { useAtomValue } from "jotai";
import { type SvgDoc, type Rect, findNode } from "@/svg-core";
import { nodesDocBBox, useDocSnapshot } from "@/store/3-document";
import { hoverNodeIdAtom, rectToScreen, selectionAtom, viewportAtom } from "@/store/4-editor";
import { type ResizeHandle } from "@/tools/9-types-tool-def";
import { RESIZE_CURSOR } from "@/tools/tool-2-select";
import { nodeScreenMatrix, outlineScreenD } from "./0-overlay-geometry";

const HANDLE = 4; // every grip; the 1px stroke sits on the edge, so it paints about 5px

const EDGES: [ResizeHandle, number, number][] = [['n', 0.5, 0], ['e', 1, 0.5], ['s', 0.5, 1], ['w', 0, 0.5]];
const CORNERS: [ResizeHandle, number, number][] = [['nw', 0, 0], ['ne', 1, 0], ['se', 1, 1], ['sw', 0, 1]];

/** Select tool: outlines of selected elements, the combined bbox, and a square grip on each corner and edge */
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

                {EDGES.map(([handle, fx, fy]) => <Grip key={handle} handle={handle} box={box} fx={fx} fy={fy} />)}
                {CORNERS.map(([handle, fx, fy]) => <Grip key={handle} handle={handle} box={box} fx={fx} fy={fy} />)}
            </>)}
        </g>
    );
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
