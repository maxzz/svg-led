import { type SectionProps } from "./9-registry";
import { Section } from "../2-controls/2-section";
import { useStyleWriter } from "./8-style-writer";
import { PropsCheck } from "./8-props-check";
import { presentationValue } from "./8-presence";
import { commonValue } from "../2-controls/1-mixed";
import { ColorRow, FILL_SWATCHES, STROKE_SWATCHES } from "../2-controls/4-0-color-row";

//---------------------------------------------------------------------------
// Stroke and fill colors

export function Section_Stroke({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    return (
        <Section title="Stroke" check={<PropsCheck mode={mode} ids={ids} nodes={nodes} props={['stroke']} label="Stroke" />}>
            <ColorRow value={commonValue(nodes, prop('stroke'))} swatches={STROKE_SWATCHES} defaultShade={4} onChange={(v) => { write.selection('stroke', v); write.defaults({ stroke: v }); }} />
        </Section>
    );
}

export function Section_Fill({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    return (
        <Section title="Fill" check={<PropsCheck mode={mode} ids={ids} nodes={nodes} props={['fill']} label="Fill" />}>
            <ColorRow value={commonValue(nodes, prop('fill'))} swatches={FILL_SWATCHES} defaultShade={1} onChange={(v) => { write.selection('fill', v); write.defaults({ fill: v }); }} />
        </Section>
    );
}

/** Value of a presentation property as shown in the panel (the SVG default when the attribute is absent) */
export function prop(p: string) {
    return (n: SectionProps['nodes'][number]) => presentationValue(n.attrs, p);
}
