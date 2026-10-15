import { getPresentation } from "@/svg-core";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { ColorRow, FILL_SWATCHES, STROKE_SWATCHES } from "../2-controls/4-0-color-row";
import { type SectionProps } from "./9-registry";
import { useStyleWriter } from "./8-style-writer";
import { DEFAULT_STROKE_WIDTH } from "./1-2-section-dash";

//---------------------------------------------------------------------------
// Stroke and fill colors

export function StrokeSection({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    return (
        <Section title="Stroke">
            <ColorRow value={commonValue(nodes, prop('stroke'))} swatches={STROKE_SWATCHES} defaultShade={4} onChange={(v) => { write.selection('stroke', v); write.defaults({ stroke: v }); }} />
        </Section>
    );
}

export function FillSection({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    return (
        <Section title="Fill">
            <ColorRow value={commonValue(nodes, prop('fill'))} swatches={FILL_SWATCHES} defaultShade={1} onChange={(v) => { write.selection('fill', v); write.defaults({ fill: v }); }} />
        </Section>
    );
}

function prop(p: string) {
    return (n: SectionProps['nodes'][number]) => getPresentation(n.attrs, p);
}

//---------------------------------------------------------------------------
// Stroke width

export function StrokeWidthSection({ mode, ids, nodes }: SectionProps) {
    const raw = commonValue(nodes, prop('stroke-width'));
    const value = raw === MIXED ? MIXED : raw === undefined ? DEFAULT_STROKE_WIDTH : Number.parseFloat(raw);
    const write = useStyleWriter(mode, ids);
    const set = (v: number) => {
        write.selection('stroke-width', String(v));
        write.defaults({ strokeWidth: v });
    };

    return (
        <Section title="Stroke width">
            <div className="flex items-center gap-1">
                <Segmented options={WIDTH_OPTIONS} value={value === MIXED ? undefined : value} onChange={set} />
                <NumberField className="w-16" value={value} min={0} step={0.5} onChange={set} />
            </div>
        </Section>
    );
}

const WIDTH_OPTIONS: SegmentOption<number>[] = [
    { value: 1, label: <WidthIcon w={'0.75px'} />, title: 'Thin' },
    { value: 1.5, label: <WidthIcon w={2} />, title: 'Medium' },
    { value: 2, label: <WidthIcon w={4} />, title: 'Bold' },
    { value: 4, label: <WidthIcon w={6} />, title: 'Extra bold' },
];

function WidthIcon({ w }: { w: number | string; }) {
    return <span className="w-4 block bg-current rounded-full" style={{ height: w }} />;
}
