import { getPresentation } from "@/svg-core";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { type SectionProps } from "./9-registry";
import { useStyleWriter } from "./8-style-writer";

//---------------------------------------------------------------------------
// Line caps and joins

export function CapJoinSection({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    const cap = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linecap') ?? 'butt');
    const join = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linejoin') ?? 'miter');
    return (
        <Section title="Line caps and joins">
            <Segmented options={CAP_OPTIONS} value={cap === MIXED ? undefined : cap} onChange={(v) => { write.selection('stroke-linecap', v === 'butt' ? undefined : v); write.defaults({ linecap: v }); }} />
            <Segmented options={JOIN_OPTIONS} value={join === MIXED ? undefined : join} onChange={(v) => { write.selection('stroke-linejoin', v === 'miter' ? undefined : v); write.defaults({ linejoin: v }); }} />
        </Section>
    );
}

const CAP_OPTIONS: SegmentOption<string>[] = [
    { value: 'butt', label: 'Butt' },
    { value: 'round', label: 'Round' },
    { value: 'square', label: 'Square' },
];

const JOIN_OPTIONS: SegmentOption<string>[] = [
    { value: 'miter', label: 'Miter' },
    { value: 'round', label: 'Round' },
    { value: 'bevel', label: 'Bevel' },
];
