import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";

import { type SectionProps } from "./9-registry";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { useStyleWriter } from "./8-style-writer";

import { getPresentation } from "@/svg-core";
import { type DashStyle, presetDashArray } from "@/store/2-persist";
import { MIXED, commonValue } from "../2-controls/1-mixed";
import { DEFAULT_STROKE_WIDTH } from "@/store/2-persist/3-new-shape-style-atoms";

//---------------------------------------------------------------------------
// Stroke style

export function Section_Dash({ mode, ids, nodes }: SectionProps) {
    const value = commonValue(nodes, (n) => dashStyleOf(getPresentation(n.attrs, 'stroke-dasharray')));
    const rawDash = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-dasharray'));
    const dashText = rawDash === MIXED ? '' : normalizeDashArray(rawDash);
    const [customOpen, setCustomOpen] = useState(false);
    const write = useStyleWriter(mode, ids);

    const widths = nodes.map(
        (n) => Number.parseFloat(getPresentation(n.attrs, 'stroke-width') ?? String(DEFAULT_STROKE_WIDTH)) || DEFAULT_STROKE_WIDTH
    );
    const w = Math.max(...widths);

    // Custom is shown when chosen explicitly, or when the current dash array isn't a preset.
    const presetTexts = [presetDashArray('dashed', w), presetDashArray('dotted', w)].map(normalizeDashArray);
    const showCustom = customOpen || (dashText !== '' && !presetTexts.includes(dashText));

    function set(style: DashStyle) {
        if (style === 'custom') {
            setCustomOpen(true);
            write.defaults({ dashStyle: 'custom' });
            return;
        }
        setCustomOpen(false);
        write.selection('stroke-dasharray', presetDashArray(style, w));
        write.defaults({ dashStyle: style });
    }

    // In the new-shape panel the typed array is stored right away, so a shape created before the field blurs already gets it
    function previewCustom(dash: string | undefined) {
        write.defaults({ dashStyle: 'custom', customDash: dash ?? '' });
    }

    function commitCustom(dash: string | undefined) {
        write.selection('stroke-dasharray', dash);
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
