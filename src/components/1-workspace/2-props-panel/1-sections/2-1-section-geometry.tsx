import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { type SectionProps } from "./9-registry";
import { NumberField } from "../2-controls/3-number-field";

import { nodesDocBBox, setNodesBBox, useDocSnapshot } from "@/store/3-document";
import { CollapsibleSection } from "../2-controls/2-section";

//---------------------------------------------------------------------------
// Bounding box

/** Position and size of the whole selection in document units */
export function Section_BBox({ ids }: SectionProps) {
    const doc = useDocSnapshot();
    const { propertySections } = useSnapshot(appSettings);

    const bbox = nodesDocBBox(doc, ids);
    if (!bbox) {
        return null;
    }

    return (
        <CollapsibleSection
            title={ids.length > 1 ? 'Selection bounds' : 'Position and size'}
            gutter
            open={propertySections.bboxOpen}
            onOpenChange={(open) => { appSettings.propertySections.bboxOpen = open; }}
        >
            <div className="py-0.5 pl-4 pr-0.5 grid grid-cols-2 gap-1">
                <NumberField label="X" value={bbox.x} onChange={(x) => setNodesBBox(ids, { x })} />
                <NumberField label="Y" value={bbox.y} onChange={(y) => setNodesBBox(ids, { y })} />
                <NumberField label="W" value={bbox.width} min={0.01} onChange={(width) => setNodesBBox(ids, { width })} />
                <NumberField label="H" value={bbox.height} min={0.01} onChange={(height) => setNodesBBox(ids, { height })} />
            </div>
        </CollapsibleSection>
    );
}
