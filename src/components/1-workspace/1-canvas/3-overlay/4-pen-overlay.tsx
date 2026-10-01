import { useAtomValue } from "jotai";
import { type SvgDoc, applyMatrix, findNode, pathDataToSubpaths } from "@/svg-core";
import { useDocSnapshot } from "@/store/3-document";
import { penDraftAtom, pointerDocAtom, selectionAtom, viewportAtom } from "@/store/4-editor";
import { nodeScreenMatrix, pt, screenSubpaths, viewportMatrix } from "./0-overlay-geometry";

const ANCHOR = 7;

/** Pen tool: anchors of the path being drawn, its last handles and the rubber-band segment to the pointer */
export function PenOverlay() {
    const doc = useDocSnapshot();
    const vp = useAtomValue(viewportAtom);
    const draft = useAtomValue(penDraftAtom);
    const pointer = useAtomValue(pointerDocAtom);
    const selection = useAtomValue(selectionAtom);

    if (!draft) {
        return <OpenEndpoints doc={doc} ids={selection} />;
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
            {last && p && !sub.closed && (
                <path
                    d={`M${pt(last)} C${pt(last.out ?? last)} ${pt(p)} ${pt(p)}`}
                    fill="none"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    className="stroke-(--editor-accent) pointer-events-none"
                />
            )}

            {last && (["in", "out"] as const).map((side) => {
                const h = last[side];
                return h && (
                    <g key={side} className="pointer-events-none">
                        <line x1={last.x} y1={last.y} x2={h.x} y2={h.y} strokeWidth={1} className="stroke-(--editor-accent)/80" />
                        <circle cx={h.x} cy={h.y} r={3.5} className="fill-(--editor-accent)" />
                    </g>
                );
            })}

            {sub?.anchors.map((a, ai) => (
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
            ))}
        </g>
    );
}

/** Before drawing: end points of selected open paths, clickable to continue them */
function OpenEndpoints({ doc, ids }: { doc: SvgDoc; ids: string[]; }) {
    const vp = useAtomValue(viewportAtom);
    return (<>
        {ids.map((id) => {
            const loc = findNode(doc, id);
            const m = nodeScreenMatrix(doc, vp, id);
            if (loc?.node.kind !== 'path' || !m) {
                return null;
            }
            const subs = screenSubpaths(pathDataToSubpaths(loc.node.d), m);
            return subs.map((s, si) => s.closed ? null : [0, s.anchors.length - 1].map((ai) => {
                const a = s.anchors[ai];
                return a && (
                    <rect
                        key={`${id}-${si}-${ai}`}
                        data-hit="anchor"
                        data-nid={id}
                        data-key={`${si}:${ai}`}
                        x={a.x - ANCHOR / 2}
                        y={a.y - ANCHOR / 2}
                        width={ANCHOR}
                        height={ANCHOR}
                        strokeWidth={1}
                        className="fill-background stroke-(--editor-accent)"
                    />
                );
            }));
        })}
    </>);
}
