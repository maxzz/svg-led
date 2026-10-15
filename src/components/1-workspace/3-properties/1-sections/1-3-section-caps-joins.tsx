import { type SectionProps } from "./9-registry";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { useStyleWriter } from "./8-style-writer";

import { getPresentation } from "@/svg-core";
import { DEFAULT_MITER_LIMIT } from "@/store/2-persist";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { IconCap_1_Butt, IconCap_2_Round, IconCap_3_Square, IconCorner_3_Bevel, IconCorner_1_Miter, IconCorner_2_Round } from "@/ui/icons/normal/svg-led";

//---------------------------------------------------------------------------
// Line caps and joins

export function Section_CapsJoins({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    const cap = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linecap') ?? 'butt');
    const join = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linejoin') ?? 'miter');
    const miterlimit = commonValue(nodes, (n) => Number(getPresentation(n.attrs, 'stroke-miterlimit') ?? DEFAULT_MITER_LIMIT));

    // The miter limit only affects miter joins, so its input is disabled for round and bevel
    const miterApplies = join === MIXED || join === 'miter';

    return (
        <Section title="Line caps and joins">
            <div className="flex items-center gap-1">
                <RowPrefix>Cap</RowPrefix>
                <Segmented options={CAP_OPTIONS} value={cap === MIXED ? undefined : cap} onChange={(v) => { write.selection('stroke-linecap', v === 'butt' ? undefined : v); write.defaults({ linecap: v }); }} />
            </div>
            <div className="flex items-center gap-1">
                <RowPrefix>Corner</RowPrefix>
                <Segmented options={JOIN_OPTIONS} value={join === MIXED ? undefined : join} onChange={(v) => { write.selection('stroke-linejoin', v === 'miter' ? undefined : v); write.defaults({ linejoin: v }); }} />
                <NumberField
                    className="ml-auto w-16"
                    label="Limit"
                    value={miterlimit}
                    min={1}
                    step={0.5}
                    disabled={!miterApplies}
                    onChange={(v) => { write.selection('stroke-miterlimit', v === DEFAULT_MITER_LIMIT ? undefined : String(v)); write.defaults({ miterlimit: v }); }}
                />
            </div>
        </Section>
    );
}

function RowPrefix({ children }: { children: string; }) {
    return (
        <span className="w-11 shrink-0 select-none text-[10px] text-muted-foreground">
            {children}
        </span>
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
