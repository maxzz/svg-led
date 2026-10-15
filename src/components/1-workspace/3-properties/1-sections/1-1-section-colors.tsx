import { getPresentation } from "@/svg-core";
import { Slider } from "@/ui/shadcn/slider";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { ColorRow, FILL_SWATCHES, STROKE_SWATCHES } from "../2-controls/4-0-color-row";
import { type SectionProps } from "./0-registry";
import { useStyleWriter } from "./0-style-writer";
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

//---------------------------------------------------------------------------

export function OpacitySection({ mode, ids, nodes }: SectionProps) {
    const raw = commonValue(nodes, (n) => Number.parseFloat(getPresentation(n.attrs, 'opacity') ?? '1'));
    const percent = raw === MIXED || raw === undefined || Number.isNaN(raw) ? 100 : Math.round(raw * 100);
    const write = useStyleWriter(mode, ids);
    const set = (p: number) => {
        write.selection('opacity', p >= 100 ? undefined : String(p / 100));
        write.defaults({ opacity: p / 100 });
    };

    return (
        <Section title={`Opacity${raw === MIXED ? ' (mixed)' : ''}`}>
            <div className="flex items-center gap-2">
                <Slider className="grow" min={0} max={100} step={1} value={[percent]} onValueChange={(v) => set(v[0])} />
                <span className="w-8 text-right tabular-nums">{percent}</span>
            </div>
        </Section>
    );
}
