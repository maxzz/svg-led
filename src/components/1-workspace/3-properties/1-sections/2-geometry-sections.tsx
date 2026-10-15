import { nodesDocBBox, setNodesBBox, useDocSnapshot } from "@/store/3-document";
import { Section } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { type SectionProps } from "./0-registry";

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
