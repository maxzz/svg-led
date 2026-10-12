import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getPresentation } from "@/svg-core";
import { useSetAtom } from "jotai";
import { setNodesPresentation } from "@/store/3-document";
import { type DashStyle, type LastStyle, lastDashSettingAtom, lastStrokeWidthAtom, lastStyleAtom, presetDashArray } from "@/store/2-persist";
import { Slider } from "@/ui/shadcn/slider";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { ColorRow, FILL_SWATCHES, STROKE_SWATCHES } from "../2-controls/4-color-row";
import { type SectionProps } from "./0-registry";

//---------------------------------------------------------------------------
// Stroke and fill colors

/** Applies a style to the selection and remembers it for new shapes */
function useSetStyle(ids: string[]) {
    const setLastStyle = useSetAtom(lastStyleAtom);
    return function setStyle(prop: string, value: string | undefined, last: Partial<LastStyle>) {
        setNodesPresentation(ids, prop, value);
        setLastStyle(last);
    };
}

export function StrokeSection({ ids, nodes }: SectionProps) {
    const setStyle = useSetStyle(ids);
    return (
        <Section title="Stroke">
            <ColorRow value={commonValue(nodes, prop('stroke'))} swatches={STROKE_SWATCHES} onChange={(v) => setStyle('stroke', v, { stroke: v })} />
        </Section>
    );
}

export function FillSection({ ids, nodes }: SectionProps) {
    const setStyle = useSetStyle(ids);
    return (
        <Section title="Fill">
            <ColorRow value={commonValue(nodes, prop('fill'))} swatches={FILL_SWATCHES} onChange={(v) => setStyle('fill', v, { fill: v })} />
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
    const setLastStrokeWidth = useSetAtom(lastStrokeWidthAtom);
    const set = (v: number) => {
        setNodesPresentation(ids, 'stroke-width', String(v));
        setLastStrokeWidth(v);
    };
    // Stroke width is remembered by lastStrokeWidthAtom, separately from lastStyleAtom

    return (
        <Section title="Stroke width">
            <div className="flex items-center gap-1">
                <Segmented options={WIDTH_OPTIONS} value={value === MIXED ? undefined : value} onChange={set} />
                <NumberField className="w-16" value={value} min={0} step={0.5} onChange={set} />
            </div>
        </Section>
    );
}

const DEFAULT_STROKE_WIDTH = 1;

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
    const rawDash = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-dasharray'));
    const dashText = rawDash === MIXED ? '' : normalizeDashArray(rawDash);
    const [customOpen, setCustomOpen] = useState(false);
    const setDashSetting = useSetAtom(lastDashSettingAtom);

    const widths = nodes.map(
        (n) => Number.parseFloat(getPresentation(n.attrs, 'stroke-width') ?? String(DEFAULT_STROKE_WIDTH)) || DEFAULT_STROKE_WIDTH
    );
    const w = Math.max(...widths);

    // Custom is shown when chosen explicitly, or when the current dash array isn't a preset.
    const presetTexts = [presetDashArray('dashed', w), presetDashArray('dotted', w)].map(normalizeDashArray);
    const showCustom = customOpen || (dashText !== '' && !presetTexts.includes(dashText));

    // The last choice is remembered and applied to new shapes
    function set(style: DashStyle) {
        if (style === 'custom') {
            setCustomOpen(true);
            setDashSetting({ dashStyle: 'custom' });
            return;
        }
        setCustomOpen(false);
        setNodesPresentation(ids, 'stroke-dasharray', presetDashArray(style, w));
        setDashSetting({ dashStyle: style });
    }

    // Remembers the typed array right away, so a shape drawn before the field blurs already gets it
    function previewCustom(dash: string | undefined) {
        setDashSetting({ dashStyle: 'custom', customDash: dash ?? '' });
    }

    function commitCustom(dash: string | undefined) {
        setNodesPresentation(ids, 'stroke-dasharray', dash);
        previewCustom(dash);
    }

    return (
        <Section title="Stroke style">
            <Segmented options={DASH_OPTIONS} value={showCustom ? 'custom' : value === MIXED ? undefined : value} onChange={set} />
            <AnimatePresence initial={false}>
                {showCustom && (
                    <motion.div
                        className="overflow-hidden"
                        initial={{ height: 0, opacity: 0, marginTop: -GAP_PX }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 0 }}
                        exit={{ height: 0, opacity: 0, marginTop: -GAP_PX }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        <DashArrayField
                            text={dashText}
                            mixed={rawDash === MIXED}
                            onPreview={previewCustom}
                            onCommit={commitCustom}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </Section>
    );
}

/** Must match the `gap-1.5` between children in `Section` (0.375rem). */
const GAP_PX = 6;

/** Custom dash array text input. Commits on Enter or blur, Escape reverts. */
function DashArrayField({ text, mixed, onPreview, onCommit }: { text: string; mixed: boolean; onPreview: (dash: string | undefined) => void; onCommit: (dash: string | undefined) => void; }) {
    function commit(input: HTMLInputElement) {
        if (input.value.trim() === text) {
            return;
        }
        const parsed = parseDashArray(input.value);
        if (parsed === null) {
            input.value = text; // invalid input: revert
            return;
        }
        onCommit(parsed);
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
        else if (e.key === 'Escape') {
            e.currentTarget.value = text;
            e.currentTarget.blur();
        }
    }

    return (
        <label className="px-1.5 h-7 min-w-0 text-xs bg-muted/60 focus-within:ring-1 focus-within:ring-(--editor-accent) rounded-md flex items-center gap-1">
            <span className="shrink-0 select-none text-[10px] text-muted-foreground">
                Dash
            </span>
            <input
                className="w-full min-w-0 tabular-nums bg-transparent outline-none"
                defaultValue={text}
                placeholder={mixed ? 'Mixed' : 'e.g. 6 2 1 2'}
                onChange={(e) => {
                    const parsed = parseDashArray(e.currentTarget.value);
                    parsed !== null && onPreview(parsed);
                }}
                onBlur={(e) => commit(e.currentTarget)}
                onKeyDown={onKeyDown}
                key={`${text}|${mixed}`}
            />
        </label>
    );
}

/** Canonical display form: numbers separated by single spaces ('' for solid). */
function normalizeDashArray(dash: string | undefined): string {
    if (!dash || dash === 'none') {
        return '';
    }
    return dash.split(/[\s,]+/).filter(Boolean).join(' ');
}

/**
 * Parses user input into a stroke-dasharray value.
 * Returns undefined for empty / all-zero (solid), or null when the input is invalid.
 */
function parseDashArray(raw: string): string | undefined | null {
    const text = raw.trim();
    if (text === '' || text === 'none') {
        return undefined;
    }
    const parts = text.split(/[\s,]+/).map(Number);
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) {
        return null;
    }
    if (parts.every((n) => n === 0)) {
        return undefined;
    }
    return parts.join(' ');
}

const DASH_OPTIONS: SegmentOption<DashStyle>[] = [
    { value: 'solid', label: <DashIcon dash="" />, title: 'Solid' },
    { value: 'dashed', label: <DashIcon dash="4 2" />, title: 'Dashed' },
    { value: 'dotted', label: <DashIcon dash="1 2" />, title: 'Dotted' },
    { value: 'custom', label: 'Custom', title: 'Custom dash array' },
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
    const setStyle = useSetStyle(ids);
    const cap = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linecap') ?? 'butt');
    const join = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linejoin') ?? 'miter');
    return (
        <Section title="Line caps and joins">
            <Segmented options={CAP_OPTIONS} value={cap === MIXED ? undefined : cap} onChange={(v) => setStyle('stroke-linecap', v === 'butt' ? undefined : v, { linecap: v })} />
            <Segmented options={JOIN_OPTIONS} value={join === MIXED ? undefined : join} onChange={(v) => setStyle('stroke-linejoin', v === 'miter' ? undefined : v, { linejoin: v })} />
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
    const setStyle = useSetStyle(ids);
    const set = (p: number) => setStyle('opacity', p >= 100 ? undefined : String(p / 100), { opacity: p / 100 });

    return (
        <Section title={`Opacity${raw === MIXED ? ' (mixed)' : ''}`}>
            <div className="flex items-center gap-2">
                <Slider className="grow" min={0} max={100} step={1} value={[percent]} onValueChange={(v) => set(v[0])} />
                <span className="w-8 text-right tabular-nums">{percent}</span>
            </div>
        </Section>
    );
}
