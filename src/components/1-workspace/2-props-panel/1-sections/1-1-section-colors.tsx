import { useSnapshot } from "valtio";
import { type SectionProps } from "./9-registry";
import { CollapsibleSection } from "../2-props-panel-controls/2-section";
import { PresenceRow } from "../2-props-panel-controls/5-presence-controls";
import { appSettings } from "@/store/1-ui-settings";
import { useStyleWriter } from "./8-style-writer";
import { PropsCheck } from "./8-props-check";
import { presentationValue } from "./8-presence";
import { commonValue } from "../2-props-panel-controls/1-mixed";
import { ColorRow, FILL_SWATCHES, STROKE_SWATCHES } from "../2-props-panel-controls/4-0-color-row";

//---------------------------------------------------------------------------
// Stroke and fill colors

export function Section_Stroke({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    const { propertySections } = useSnapshot(appSettings);
    return (
        <CollapsibleSection
            title="Stroke"
            gutter
            check={<PropsCheck mode={mode} ids={ids} nodes={nodes} props={['stroke']} label="Stroke" />}
            open={propertySections.strokeOpen}
            onOpenChange={(open) => { appSettings.propertySections.strokeOpen = open; }}
        >
            <PresenceRow>
                <ColorRow value={commonValue(nodes, prop('stroke'))} swatches={STROKE_SWATCHES} defaultShade={4} onChange={(v) => { write.selection('stroke', v); write.defaults({ stroke: v }); }} />
            </PresenceRow>
        </CollapsibleSection>
    );
}

export function Section_Fill({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    const { propertySections } = useSnapshot(appSettings);
    return (
        <CollapsibleSection
            title="Fill"
            gutter
            check={<PropsCheck mode={mode} ids={ids} nodes={nodes} props={['fill']} label="Fill" />}
            open={propertySections.fillOpen}
            onOpenChange={(open) => { appSettings.propertySections.fillOpen = open; }}
        >
            <PresenceRow>
                <ColorRow value={commonValue(nodes, prop('fill'))} swatches={FILL_SWATCHES} defaultShade={1} onChange={(v) => { write.selection('fill', v); write.defaults({ fill: v }); }} />
            </PresenceRow>
        </CollapsibleSection>
    );
}

/** Value of a presentation property as shown in the panel (the SVG default when the attribute is absent) */
export function prop(p: string) {
    return (n: SectionProps['nodes'][number]) => presentationValue(n.attrs, p);
}
