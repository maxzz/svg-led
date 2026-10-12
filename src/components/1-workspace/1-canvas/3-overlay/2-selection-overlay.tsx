import { useAtomValue } from "jotai";
import { type SvgDoc, findNode } from "@/svg-core";
import { nodesDocBBox, useDocSnapshot } from "@/store/3-document";
import { editingGroupIdAtom, hoverNodeIdAtom, rectToScreen, selectionAtom, viewportAtom } from "@/store/4-editor";
import { nodeScreenMatrix, outlineScreenD } from "./0-overlay-geometry";

const HANDLE = 8;

/** Select tool: outlines of selected elements, the combined bbox with resize handles, and the hover outline */
export function SelectionOverlay() {
    const doc = useDocSnapshot();
    const vp = useAtomValue(viewportAtom);
    const selection = useAtomValue(selectionAtom);
    const hover = useAtomValue(hoverNodeIdAtom);
    const editing = useAtomValue(editingGroupIdAtom);

    const bbox = selection.length ? nodesDocBBox(doc, selection) : null;
    const r = bbox && rectToScreen(vp, bbox);

    const editingBBox = editing ? nodesDocBBox(doc, [editing]) : null;
    const editingRect = editingBBox && rectToScreen(vp, editingBBox);

    // a selected group or several elements show a dashed box, a single element a solid one
    const dashed = selection.length > 1 || selection.some((id) => findNode(doc, id)?.node.kind === 'g');

    return (
        <g>
            {hover && !selection.includes(hover) && <Outline doc={doc} id={hover} className="stroke-(--editor-accent)/70" />}

            {selection.map((id) => <Outline doc={doc} id={id} key={id} className="stroke-(--editor-accent)" />)}

            {editingRect && (
                <rect
                    className="stroke-(--editor-accent) pointer-events-none"
                    x={editingRect.x - 4} y={editingRect.y - 4} width={editingRect.width + 8} height={editingRect.height + 8}
                    fill="none" strokeWidth={1} strokeDasharray="4 3"
                />
            )}

            {r && (<>
                <rect
                    className="stroke-(--editor-accent) pointer-events-none"
                    x={r.x - 4} y={r.y - 4} width={r.width + 8} height={r.height + 8}
                    fill="none" strokeWidth={1} strokeDasharray={dashed ? "4 3" : undefined}
                />
                {CORNERS.map(
                    ([corner, fx, fy]) => (
                        <rect
                            key={corner}
                            data-hit="resize"
                            data-corner={corner}
                            x={r.x - 4 + fx * (r.width + 8) - HANDLE / 2}
                            y={r.y - 4 + fy * (r.height + 8) - HANDLE / 2}
                            width={HANDLE}
                            height={HANDLE}
                            rx={2}
                            strokeWidth={1}
                            className="fill-background stroke-(--editor-accent)"
                            style={{ cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize' }}
                        />
                    )
                )}
            </>)}
        </g>
    );
}

const CORNERS = [['nw', 0, 0], ['ne', 1, 0], ['se', 1, 1], ['sw', 0, 1]] as const;

function Outline({ doc, id, className }: { doc: SvgDoc; id: string; className: string; }) {
    const vp = useAtomValue(viewportAtom);
    const loc = findNode(doc, id);
    const m = nodeScreenMatrix(doc, vp, id);
    if (!loc || !m) {
        return null;
    }
    return <path d={outlineScreenD(loc.node, m)} fill="none" strokeWidth={1} className={`${className} pointer-events-none`} />;
}
