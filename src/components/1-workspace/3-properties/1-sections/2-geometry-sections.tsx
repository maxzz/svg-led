import { type RectNode } from "@/svg-core";
import { commitHistory, getNodeProxy, nodesDocBBox, setNodesBBox, useDocSnapshot } from "@/store/3-document";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { Section } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { type SectionProps } from "./0-registry";
import { useStyleWriter } from "./0-style-writer";

//---------------------------------------------------------------------------
// Bounding box

/** Position and size of the whole selection in document units */
export function BBoxSection({ ids }: SectionProps) {
    const doc = useDocSnapshot();
    
    const bbox = nodesDocBBox(doc, ids);
    if (!bbox) {
        return null;
    }

    return (
        <Section title={ids.length > 1 ? 'Selection bounds' : 'Position and size'}>
            <div className="grid grid-cols-2 gap-1">
                <NumberField label="X" value={bbox.x} onChange={(x) => setNodesBBox(ids, { x })} />
                <NumberField label="Y" value={bbox.y} onChange={(y) => setNodesBBox(ids, { y })} />
                <NumberField label="W" value={bbox.width} min={0.01} onChange={(width) => setNodesBBox(ids, { width })} />
                <NumberField label="H" value={bbox.height} min={0.01} onChange={(height) => setNodesBBox(ids, { height })} />
            </div>
        </Section>
    );
}

//---------------------------------------------------------------------------
// Rect corners

export function RectCornersSection({ mode, ids, nodes }: SectionProps) {
    const rects = nodes.filter((n): n is RectNode => n.kind === 'rect');
    const rx = commonValue(rects, (r) => r.rx);
    const ry = commonValue(rects, (r) => r.ry);
    const write = useStyleWriter(mode, ids);

    function set(key: 'rx' | 'ry', value: number, both: boolean) {
        if (mode === 'newShape') {
            // the radius new rectangles are created with; each shape is clamped to its size when drawn
            write.defaults(key === 'rx' ? (both ? { rx: value, ry: value } : { rx: value }) : { ry: value });
            return;
        }
        for (const r of rects) {
            const node = getNodeProxy(r.id) as RectNode | undefined;
            if (node) {
                const max = key === 'rx' ? node.width / 2 : node.height / 2;
                node[key] = Math.min(value, max);
                if (both) {
                    node.ry = Math.min(value, node.height / 2);
                }
            }
        }
        commitHistory({ mergeKey: `corners:${ids.join(',')}` });
    }

    const linked = rx !== MIXED && rx === ry;

    return (
        <Section title="Corner radius">
            <div className="grid grid-cols-2 gap-1">
                <NumberField label="rx" value={rx} min={0} onChange={(v) => set('rx', v, linked)} />
                <NumberField label="ry" value={ry} min={0} onChange={(v) => set('ry', v, false)} />
            </div>
        </Section>
    );
}
