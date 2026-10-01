import { useAtomValue } from "jotai";
import {
    type Anchor, type Matrix, type SubPath, type SvgDoc, applyMatrix, findNode, getShapeHandles, isShapeNode, pathDataToSubpaths,
} from "@/svg-core";
import { useDocSnapshot } from "@/store/3-document";
import { anchorsOfNode, hoverNodeIdAtom, selectedAnchorsAtom, selectionAtom, viewportAtom } from "@/store/4-editor";
import { pointsOptionsAtom } from "@/tools/points/options";
import { nodeScreenMatrix, outlineScreenD, screenSubpaths } from "./0-overlay-geometry";

const ANCHOR = 7;
const KNOB = 3.5;

/** Points mode: outlines, anchors (squares), direction handles (lines with round knobs) and native shape handles */
export function PointsOverlay() {
    const doc = useDocSnapshot();
    const vp = useAtomValue(viewportAtom);
    const selection = useAtomValue(selectionAtom);
    const hover = useAtomValue(hoverNodeIdAtom);

    return (
        <g>
            {hover && !selection.includes(hover) && <HoverOutline doc={doc} id={hover} />}
            {selection.map((id) => {
                const m = nodeScreenMatrix(doc, vp, id);
                return m ? <NodePoints doc={doc} id={id} m={m} key={id} /> : null;
            })}
        </g>
    );
}

function HoverOutline({ doc, id }: { doc: SvgDoc; id: string; }) {
    const vp = useAtomValue(viewportAtom);
    const loc = findNode(doc, id);
    const m = nodeScreenMatrix(doc, vp, id);
    if (!loc || !m) {
        return null;
    }
    return <path d={outlineScreenD(loc.node, m)} fill="none" strokeWidth={1} className="stroke-(--editor-accent)/60 pointer-events-none" />;
}

function NodePoints({ doc, id, m }: { doc: SvgDoc; id: string; m: Matrix; }) {
    const selectedAnchors = useAtomValue(selectedAnchorsAtom);
    const { showAllHandles } = useAtomValue(pointsOptionsAtom);
    const loc = findNode(doc, id);
    if (!loc) {
        return null;
    }
    const node = loc.node;
    const selected = anchorsOfNode(selectedAnchors, id);

    const outline = <path d={outlineScreenD(node, m)} fill="none" strokeWidth={1} className="stroke-(--editor-accent) pointer-events-none" />;

    if (node.kind === 'path') {
        const subs = screenSubpaths(pathDataToSubpaths(node.d), m);
        return (
            <g>
                {outline}
                <PathHandles subs={subs} nodeId={id} selected={selected} showAll={showAllHandles} />
                <PathAnchors subs={subs} nodeId={id} selected={selected} />
            </g>
        );
    }

    if (isShapeNode(node)) {
        return (
            <g>
                {outline}
                {getShapeHandles(node).map((h) => {
                    const p = applyMatrix(m, h);
                    const isSel = selected.has(`h:${h.key}`);
                    const size = h.role === 'radius' ? 6 : ANCHOR;
                    return (
                        <rect
                            key={h.key}
                            data-hit="shape-handle"
                            data-nid={id}
                            data-key={h.key}
                            x={p.x - size / 2}
                            y={p.y - size / 2}
                            width={size}
                            height={size}
                            transform={h.role === 'radius' ? `rotate(45 ${p.x} ${p.y})` : undefined}
                            strokeWidth={1}
                            className={isSel ? "fill-(--editor-accent) stroke-(--editor-accent)" : "fill-background stroke-(--editor-accent)"}
                            style={{ cursor: 'move' }}
                        />
                    );
                })}
            </g>
        );
    }

    return outline;
}

function PathAnchors({ subs, nodeId, selected }: { subs: SubPath[]; nodeId: string; selected: Set<string>; }) {
    return (<>
        {subs.map((s, si) => s.anchors.map((a, ai) => {
            const key = `${si}:${ai}`;
            const isSel = selected.has(key);
            const isFirst = ai === 0 && !s.closed;
            return (
                <rect
                    key={key}
                    data-hit="anchor"
                    data-nid={nodeId}
                    data-key={key}
                    x={a.x - ANCHOR / 2}
                    y={a.y - ANCHOR / 2}
                    width={ANCHOR}
                    height={ANCHOR}
                    strokeWidth={isFirst ? 1.5 : 1}
                    className={isSel ? "fill-(--editor-accent) stroke-(--editor-accent)" : "fill-background stroke-(--editor-accent)"}
                    style={{ cursor: 'move' }}
                />
            );
        }))}
    </>);
}

/**
 * Like Illustrator: handles are shown for selected anchors and for the facing handles of their neighbors
 * (the ones that shape the adjacent segments); `showAll` shows every handle.
 */
function PathHandles({ subs, nodeId, selected, showAll }: { subs: SubPath[]; nodeId: string; selected: Set<string>; showAll: boolean; }) {
    const items: { key: string; anchor: Anchor; side: 'in' | 'out'; }[] = [];

    subs.forEach(
        (s, si) => {
            const n = s.anchors.length;
            s.anchors.forEach(
                (a, ai) => {
                    const self = selected.has(`${si}:${ai}`);
                    const prevSel = selected.has(`${si}:${(ai - 1 + n) % n}`) && (ai > 0 || s.closed);
                    const nextSel = selected.has(`${si}:${(ai + 1) % n}`) && (ai < n - 1 || s.closed);
                    if (a.in && (showAll || self || prevSel)) {
                        items.push({ key: `${si}:${ai}`, anchor: a, side: 'in' });
                    }
                    if (a.out && (showAll || self || nextSel)) {
                        items.push({ key: `${si}:${ai}`, anchor: a, side: 'out' });
                    }
                }
            );
        }
    );

    return (<>
        {items.map(({ key, anchor, side }) => {
            const h = anchor[side]!;
            return (
                <g key={`${key}-${side}`}>
                    <line x1={anchor.x} y1={anchor.y} x2={h.x} y2={h.y} strokeWidth={1} className="stroke-(--editor-accent)/80 pointer-events-none" />
                    <circle
                        data-hit="handle"
                        data-nid={nodeId}
                        data-key={key}
                        data-side={side}
                        cx={h.x}
                        cy={h.y}
                        r={KNOB}
                        strokeWidth={1}
                        className="fill-(--editor-accent) stroke-background"
                        style={{ cursor: 'pointer' }}
                    />
                </g>
            );
        })}
    </>);
}
