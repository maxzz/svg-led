import { type SectionProps } from "./9-registry";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { useStyleWriter } from "./8-style-writer";

import { getPresentation } from "@/svg-core";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { IconCap_1_Butt, IconCap_2_Round, IconCap_3_Square, IconCorner_3_Bevel, IconCorner_1_Miter, IconCorner_2_Round } from "@/ui/icons/normal/svg-led";

//---------------------------------------------------------------------------
// Line caps and joins

export function Section_CapsJoins({ mode, ids, nodes }: SectionProps) {
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
    { value: 'butt', label: <IconCap_1_Butt />, title: 'Butt cap' },
    { value: 'round', label: <IconCap_2_Round />, title: 'Round cap' },
    { value: 'square', label: <IconCap_3_Square />, title: 'Square cap' },
];

const JOIN_OPTIONS: SegmentOption<string>[] = [
    { value: 'miter', label: <IconCorner_1_Miter />, title: 'Miter join' },
    { value: 'round', label: <IconCorner_2_Round />, title: 'Round join' },
    { value: 'bevel', label: <IconCorner_3_Bevel />, title: 'Bevel join' },
];
