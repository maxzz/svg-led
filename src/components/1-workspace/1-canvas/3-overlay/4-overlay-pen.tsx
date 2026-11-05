import { useAtomValue } from "jotai";
import { type Anchor, type SvgDoc, applyMatrix, findNode, getAnchor, pathDataToSubpaths } from "@/svg-core";
import { useDocSnapshot } from "@/store/3-document";
import { penDraftAtom, pointerDocAtom, selectionAtom, viewportAtom } from "@/store/4-editor";
import { penConvertingAnchorAtom } from "@/tools/tool-5-pen/2-pen-convert-anchor";
import { nodeScreenMatrix, outlineScreenD, pt, screenSubpaths, viewportMatrix } from "./8-overlays-math";

const ANCHOR = 4; // same box as direct-selection path points
const KNOB = 3;    // direction-handle radius; a little larger than the anchor box

/** Pen tool: anchors of the path being drawn, its last handles and the rubber-band segment to the pointer */
export function Overlay_Pen() {
    const doc = useDocSnapshot();
    const vp = useAtomValue(viewportAtom);
    const draft = useAtomValue(penDraftAtom);
    const pointer = useAtomValue(pointerDocAtom);
    const selection = useAtomValue(selectionAtom);

    if (!draft) {
        return (
            <g>
                <SelectedPathAnchors doc={doc} ids={selection} />
                <ConvertingHandles doc={doc} />
            </g>
        );
    }

    const m = nodeScreenMatrix(doc, vp, draft.nodeId);
    const loc = findNode(doc, draft.nodeId);
    if (!m || loc?.node.kind !== 'path') {
        return null;
    }

    const subs = screenSubpaths(pathDataToSubpaths(loc.node.d), m);
    const sub = subs[draft.si];
    const last = sub?.anchors[sub.anchors.length - 1];
    const p = pointer && applyMatrix(viewportMatrix(vp), pointer);

    return (
        <g>
            <Outline d={outlineScreenD(loc.node, m)} />

            {last && p && !sub.closed && (
                <path
                    d={`M${pt(last)} C${pt(last.out ?? last)} ${pt(p)} ${pt(p)}`}
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    className="stroke-(--editor-accent) pointer-events-none"
                />
            )}

            {last && <AnchorHandles anchor={last} />}
            
            <ConvertingHandles doc={doc} />

            {sub?.anchors.map(
                (a, ai) => (
                    <rect
                        key={ai}
                        data-hit="anchor"
                        data-nid={draft.nodeId}
                        data-key={`${draft.si}:${ai}`}
                        x={a.x - ANCHOR / 2}
                        y={a.y - ANCHOR / 2}
                        width={ANCHOR}
                        height={ANCHOR}
                        strokeWidth={1}
                        className={ai === sub.anchors.length - 1 ? "fill-(--editor-accent) stroke-(--editor-accent)" : "fill-background stroke-(--editor-accent)"}
                    />
                )
            )}
        </g>
    );
}

//---------------------------------------------------------------------------

/**
 * Before drawing: outlines of the selected elements and anchors of the selected paths;
 * a click on an open end continues the path, on any other anchor deletes it
 */
function SelectedPathAnchors({ doc, ids }: { doc: SvgDoc; ids: string[]; }) {
    const vp = useAtomValue(viewportAtom);
    return (<>
        {ids.map(
            (id) => {
                const loc = findNode(doc, id);
                const m = nodeScreenMatrix(doc, vp, id);
                if (!loc || !m) {
                    return null;
                }
                const subs = loc.node.kind === 'path' ? screenSubpaths(pathDataToSubpaths(loc.node.d), m) : [];
                return (
                    <g key={id}>
                        <Outline d={outlineScreenD(loc.node, m)} />
                        {subs.map(
                            (s, si) => s.anchors.map(
                                (a, ai) => (
                                    <rect
                                        data-hit="anchor"
                                        className="fill-background stroke-(--editor-accent)"
                                        x={a.x - ANCHOR / 2}
                                        y={a.y - ANCHOR / 2}
                                        width={ANCHOR}
                                        height={ANCHOR}
                                        strokeWidth={1}
                                        data-nid={id}
                                        data-key={`${si}:${ai}`}
                                        key={`${si}-${ai}`}
                                    />
                                )
                            )
                        )}
                    </g>
                );
            }
        )}
    </>);
}

//---------------------------------------------------------------------------

/** Handles of the anchor that Alt+drag is pulling out (Convert Anchor Point) */
function ConvertingHandles({ doc }: { doc: SvgDoc; }) {
    const vp = useAtomValue(viewportAtom);
    const converting = useAtomValue(penConvertingAnchorAtom);
    const loc = converting && findNode(doc, converting.nodeId);
    const m = converting && nodeScreenMatrix(doc, vp, converting.nodeId);
    if (!converting || loc?.node.kind !== 'path' || !m) {
        return null;
    }

    const anchor = getAnchor(screenSubpaths(pathDataToSubpaths(loc.node.d), m), converting.key);
    return anchor ? <AnchorHandles anchor={anchor} /> : null;
}

//---------------------------------------------------------------------------

/** Direction handles of one anchor, in screen coordinates */
function AnchorHandles({ anchor }: { anchor: Anchor; }) {
    return (<>
        {(["in", "out"] as const).map((side) => {
            const h = anchor[side];
            return h && (
                <g key={side} className="pointer-events-none">
                    <line x1={anchor.x} y1={anchor.y} x2={h.x} y2={h.y} strokeWidth={1} className="stroke-(--editor-accent)/80" />
                    <circle cx={h.x} cy={h.y} r={KNOB} strokeWidth={1} className="fill-(--editor-accent) stroke-background" />
                </g>
            );
        })}
    </>);
}

//---------------------------------------------------------------------------

function Outline({ d }: { d: string; }) {
    return <path d={d} fill="none" strokeWidth={1} className="stroke-(--editor-accent) pointer-events-none" />;
}
