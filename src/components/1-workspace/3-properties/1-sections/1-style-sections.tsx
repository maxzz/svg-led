import { getPresentation } from "@/svg-core";
import { setNodesPresentation } from "@/store/3-document";
import { Slider } from "@/ui/shadcn/slider";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { ColorRow, FILL_SWATCHES, STROKE_SWATCHES } from "../2-controls/4-color-row";
import { type SectionProps } from "./0-registry";

//---------------------------------------------------------------------------
// Stroke and fill colors

export function StrokeSection({ ids, nodes }: SectionProps) {
    return (
        <Section title="Stroke">
            <ColorRow value={commonValue(nodes, prop('stroke'))} swatches={STROKE_SWATCHES} onChange={(v) => setNodesPresentation(ids, 'stroke', v)} />
        </Section>
    );
}

export function FillSection({ ids, nodes }: SectionProps) {
    return (
        <Section title="Fill">
            <ColorRow value={commonValue(nodes, prop('fill'))} swatches={FILL_SWATCHES} onChange={(v) => setNodesPresentation(ids, 'fill', v)} />
        </Section>
    );
}

function prop(p: string) {
    return (n: SectionProps['nodes'][number]) => getPresentation(n.attrs, p);
}

//---------------------------------------------------------------------------
// Stroke width

export function StrokeWidthSection({ ids, nodes }: SectionProps) {
    const raw = commonValue(nodes, prop('stroke-width'));
    const value = raw === MIXED ? MIXED : raw === undefined ? DEFAULT_STROKE_WIDTH : Number.parseFloat(raw);
    const set = (v: number) => setNodesPresentation(ids, 'stroke-width', String(v));

    return (
        <Section title="Stroke width">
            <div className="flex items-center gap-1">
                <Segmented options={WIDTH_OPTIONS} value={value === MIXED ? undefined : value} onChange={set} />
                <NumberField className="w-16" value={value} min={0} step={0.5} onChange={set} />
            </div>
        </Section>
    );
}

const DEFAULT_STROKE_WIDTH = 1.5;

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
// Stroke style

export function DashSection({ ids, nodes }: SectionProps) {
    const value = commonValue(nodes, (n) => dashStyleOf(getPresentation(n.attrs, 'stroke-dasharray')));

    function set(style: DashStyle) {
        const widths = nodes.map(
            (n) => Number.parseFloat(getPresentation(n.attrs, 'stroke-width') ?? String(DEFAULT_STROKE_WIDTH)) || DEFAULT_STROKE_WIDTH
        );
        const w = Math.max(...widths);
        const dash = style === 'solid' ? undefined : style === 'dashed' ? `${4 * w} ${3 * w}` : `${w} ${2 * w}`;
        setNodesPresentation(ids, 'stroke-dasharray', dash);
    }

    return (
        <Section title="Stroke style">
            <Segmented options={DASH_OPTIONS} value={value === MIXED ? undefined : value} onChange={set} />
        </Section>
    );
}

type DashStyle = 'solid' | 'dashed' | 'dotted';

const DASH_OPTIONS: SegmentOption<DashStyle>[] = [
    { value: 'solid', label: <DashIcon dash="" />, title: 'Solid' },
    { value: 'dashed', label: <DashIcon dash="4 2" />, title: 'Dashed' },
    { value: 'dotted', label: <DashIcon dash="1 2" />, title: 'Dotted' },
];

function DashIcon({ dash }: { dash: string; }) {
    return (
        <svg className="w-4 h-2" viewBox="0 0 16 2">
            <line x1="0" y1="1" x2="16" y2="1" stroke="currentColor" strokeWidth="2" strokeDasharray={dash || undefined} />
        </svg>
    );
}

function dashStyleOf(dash: string | undefined): DashStyle | undefined {
    if (!dash || dash === 'none') {
        return 'solid';
    }
    const [a, b] = dash.split(/[\s,]+/).map(Number);
    return a <= (b ?? a) / 1.5 ? 'dotted' : 'dashed';
}

//---------------------------------------------------------------------------
// Line caps and joins

export function CapJoinSection({ ids, nodes }: SectionProps) {
    const cap = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linecap') ?? 'butt');
    const join = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linejoin') ?? 'miter');
    return (
        <Section title="Line caps and joins">
            <Segmented options={CAP_OPTIONS} value={cap === MIXED ? undefined : cap} onChange={(v) => setNodesPresentation(ids, 'stroke-linecap', v === 'butt' ? undefined : v)} />
            <Segmented options={JOIN_OPTIONS} value={join === MIXED ? undefined : join} onChange={(v) => setNodesPresentation(ids, 'stroke-linejoin', v === 'miter' ? undefined : v)} />
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

export function OpacitySection({ ids, nodes }: SectionProps) {
    const raw = commonValue(nodes, (n) => Number.parseFloat(getPresentation(n.attrs, 'opacity') ?? '1'));
    const percent = raw === MIXED || raw === undefined || Number.isNaN(raw) ? 100 : Math.round(raw * 100);
    const set = (p: number) => setNodesPresentation(ids, 'opacity', p >= 100 ? undefined : String(p / 100));

    return (
        <Section title={`Opacity${raw === MIXED ? ' (mixed)' : ''}`}>
            <div className="flex items-center gap-2">
                <Slider className="grow" min={0} max={100} step={1} value={[percent]} onValueChange={(v) => set(v[0])} />
                <span className="w-8 text-right tabular-nums">{percent}</span>
            </div>
        </Section>
    );
}
