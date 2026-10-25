import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { type SectionProps } from "./9-registry";
import { useSnapshot } from "valtio";
import { CollapsibleSection, Segmented, segmentSizeClasses, type SegmentOption } from "../2-props-panel-controls/2-section";
import { PresenceRow } from "../2-props-panel-controls/5-presence-controls";
import { ComboField } from "../2-props-panel-controls/3-1-combo-field";
import { notice } from "@/ui/local-ui/7-toaster";
import { appSettings, forgetDashArray, rememberDashArray } from "@/store/1-ui-settings";
import { useStyleWriter } from "./8-style-writer";
import { PropsCheck } from "./8-props-check";

import { getPresentation } from "@/svg-core";
import { type DashStyle, presetDashArray } from "@/store/2-persist";
import { MIXED, commonValue } from "../2-props-panel-controls/1-mixed";
import { DEFAULT_STROKE_WIDTH } from "@/store/2-persist/1-new-shape-style-atoms";

//---------------------------------------------------------------------------
// Stroke style

export function Section_Dash({ mode, ids, nodes }: SectionProps) {
    const value = commonValue(nodes, (n) => dashStyleOf(getPresentation(n.attrs, 'stroke-dasharray')));
    const rawDash = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-dasharray'));
    const dashText = rawDash === MIXED ? '' : normalizeDashArray(rawDash);
    const [customOpen, setCustomOpen] = useState(false);
    const [preCustomDash, setPreCustomDash] = useState(''); // Dash array that was in place when Custom was chosen
    const write = useStyleWriter(mode, ids);
    const { propertySections, dashHistory } = useSnapshot(appSettings);

    const widths = nodes.map(
        (n) => Number.parseFloat(getPresentation(n.attrs, 'stroke-width') ?? String(DEFAULT_STROKE_WIDTH)) || DEFAULT_STROKE_WIDTH
    );
    const w = Math.max(...widths);

    // Custom is shown when chosen explicitly, or when the current dash array isn't a preset.
    const presetTexts = [presetDashArray('dashed', w), presetDashArray('dotted', w)].map(normalizeDashArray);
    const showCustom = customOpen || (dashText !== '' && !presetTexts.includes(dashText));

    function set(style: DashStyle) {
        if (style === 'custom') {
            if (!showCustom) {
                setPreCustomDash(dashText);
            }
            setCustomOpen(true);
            write.defaults({ dashStyle: 'custom' });
            return;
        }
        setCustomOpen(false);
        // Solid is written as `none`, so the checkbox shows that the dash array is set
        write.selection('stroke-dasharray', presetDashArray(style, w) ?? 'none');
        write.defaults({ dashStyle: style });
    }

    // In the new-shape panel the typed array is stored right away, so a shape created before the field blurs already gets it
    function previewCustom(dash: string | undefined) {
        write.defaults({ dashStyle: 'custom', customDash: dash ?? '' });
    }

    function commitCustom(dash: string | undefined) {
        write.selection('stroke-dasharray', dash ?? 'none');
        previewCustom(dash);
    }

    /** A dash array the user typed or picked from history: applies it and remembers it */
    function commitTyped(dash: string | undefined) {
        commitCustom(dash);
        if (dash) {
            rememberDashArray(dash);
        }
    }

    /** Escape from an invalid entry: restores the value from before Custom was chosen (Solid if there was none) */
    function restorePreCustom() {
        const dash = preCustomDash;
        if (!dash) {
            set('solid');
            return;
        }
        const preset = (['dashed', 'dotted'] as const).find((s) => normalizeDashArray(presetDashArray(s, w)) === dash);
        if (preset) {
            set(preset);
            return;
        }
        commitCustom(dash);
    }

    return (
        <CollapsibleSection
            title="Stroke style"
            gutter
            check={<PropsCheck mode={mode} ids={ids} nodes={nodes} props={['stroke-dasharray']} label="Stroke style" />}
            open={propertySections.strokeStyleOpen}
            onOpenChange={(open) => { appSettings.propertySections.strokeStyleOpen = open; }}
        >
            <PresenceRow>
                <div className="flex flex-col gap-1.5">
                    <Segmented
                        options={DASH_OPTIONS}
                        value={showCustom ? 'custom' : value === MIXED ? undefined : value}
                        onChange={set}
                        buttonClassName={segmentSizeClasses}
                    />

                    <AnimatePresence initial={false}>
                        {showCustom && (
                            <motion.div
                                className="overflow-hidden px-0.5"
                                initial={{ height: 0, opacity: 0, marginTop: -GAP_PX, paddingTop: 0, paddingBottom: 0 }}
                                animate={{ height: 'auto', opacity: 1, marginTop: -RING_PX, paddingTop: RING_PX, paddingBottom: RING_PX }}
                                exit={{ height: 0, opacity: 0, marginTop: -GAP_PX, paddingTop: 0, paddingBottom: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                            >
                                <DashArrayField
                                    text={dashText}
                                    mixed={rawDash === MIXED}
                                    history={dashHistory}
                                    onPreview={previewCustom}
                                    onCommit={commitTyped}
                                    onEscape={restorePreCustom}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </PresenceRow>
        </CollapsibleSection>
    );
}


const GAP_PX = 6; // Must match the `gap-1.5` between children in `Section` (0.375rem).
const RING_PX = 2; // Space around the custom field so its focus ring isn't clipped by `overflow-hidden`; the top margin is offset by it so the visual gap is unchanged.

/**
 * Custom dash array input with a history of recently used values.
 * Invalid input stays in the field with a toast; Escape restores the pre-Custom value (see `onEscape`).
 */
function DashArrayField({ text, mixed, history, onPreview, onCommit, onEscape }: {
    text: string;
    mixed: boolean;
    history: readonly string[];
    onPreview: (dash: string | undefined) => void;
    onCommit: (dash: string | undefined) => void;
    onEscape: () => void;
}) {
    return (
        <ComboField
            label="Dash"
            value={text}
            items={history}
            onChange={(raw) => {
                const parsed = parseDashArray(raw);
                parsed !== null && onPreview(parsed);
            }}
            onCommit={(raw) => {
                const parsed = parseDashArray(raw);
                if (parsed === null) {
                    warnInvalidDash(raw);
                    return false;
                }
                if (normalizeDashArray(parsed) !== text) {
                    onCommit(parsed);
                }
                return true;
            }}
            onRemoveItem={forgetDashArray}
            onEscape={onEscape}
        />
    );
}

function warnInvalidDash(raw: string) {
    notice.warning(
        <div className="flex flex-col gap-1">
            <div>
                <span className={warningSpanClasses}>{raw.trim()}</span> is not a valid dash array.
            </div>
            <div className="opacity-80 text-pretty leading-5">
                Use non-negative numbers separated by spaces or commas, e.g. <span className={warningSpanClasses}>6 2</span>, <span className={warningSpanClasses}>4 2 1 2</span> or <span className={warningSpanClasses}>5, 3</span>.
            </div>
        </div>
    );
}

const warningSpanClasses = "px-1 bg-background/20 border border-background/40 rounded";

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
    { value: 'custom', label: <span className="px-1.5">Custom</span>, title: 'Custom dash array' },
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
