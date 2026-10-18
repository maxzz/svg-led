import { useState } from "react";
import { type SectionProps } from "./9-registry";
import { Section, Segmented, type SegmentOption } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { useStyleWriter } from "./8-style-writer";
import { Popover, PopoverAnchor, PopoverContent } from "@/ui/shadcn/popover";
import { Slider } from "@/ui/shadcn/slider";

import { getPresentation } from "@/svg-core";
import { MIXED, commonValue, type MaybeMixed } from "../2-controls/1-mixed";
import { ColorRow, FILL_SWATCHES, STROKE_SWATCHES } from "../2-controls/4-0-color-row";
import { DEFAULT_STROKE_WIDTH, MAX_STROKE_WIDTH } from "@/store/2-persist/1-new-shape-style-atoms";

//---------------------------------------------------------------------------
// Stroke and fill colors

export function Section_Stroke({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    return (
        <Section title="Stroke">
            <ColorRow value={commonValue(nodes, prop('stroke'))} swatches={STROKE_SWATCHES} defaultShade={4} onChange={(v) => { write.selection('stroke', v); write.defaults({ stroke: v }); }} />
        </Section>
    );
}

export function Section_Fill({ mode, ids, nodes }: SectionProps) {
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

export function Section_StrokeWidth({ mode, ids, nodes }: SectionProps) {
    const raw = commonValue(nodes, prop('stroke-width'));
    const value = raw === MIXED ? MIXED : raw === undefined ? DEFAULT_STROKE_WIDTH : Number.parseFloat(raw);
    const write = useStyleWriter(mode, ids);
    const set = (v: number) => {
        write.selection('stroke-width', String(v));
        write.defaults({ strokeWidth: v });
    };

    return (
        <Section title="Stroke width">
            <div className="flex flex-wrap items-center gap-1">
                <Segmented options={WIDTH_OPTIONS} value={value === MIXED ? undefined : value} onChange={set} />
                <StrokeWidthField value={value} onChange={set} />
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

/** Stroke width field. Its popup slider opens while the field is focused. */
function StrokeWidthField({ value, onChange }: { value: MaybeMixed<number> | undefined; onChange: (value: number) => void; }) {
    /** Popup is open while the field is focused */
    const [active, setActive] = useState(false);

    const numeric = typeof value === 'number' ? value : undefined;
    /** Slider range: 0 to at least 10, or to the current value when it is larger */
    const sliderMax = Math.max(MAX_STROKE_WIDTH, numeric ?? 0);

    /** Clicks and focus moves inside the field must not close the popup */
    function keepOpenOnField(e: Event) {
        if ((e.target as Element).closest?.('[data-stroke-width-field]')) {
            e.preventDefault();
        }
    }

    return (
        <Popover open={active} onOpenChange={setActive}>
            <PopoverAnchor asChild>
                <div className="w-12 font-condensed" data-stroke-width-field onFocus={() => setActive(true)}>
                    <NumberField value={value} min={0} step={0.5} onChange={onChange} />
                </div>
            </PopoverAnchor>

            <PopoverContent
                className="p-2 w-40 flex-row rounded items-center gap-1.5"
                side="bottom"
                align="end"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onFocusOutside={keepOpenOnField}
                onPointerDownOutside={keepOpenOnField}
            >
                <Slider
                    className="min-w-0 flex-1"
                    min={0}
                    max={sliderMax}
                    step={0.1}
                    value={[numeric ?? 0]}
                    onValueChange={([v]) => onChange(v)}
                />
            </PopoverContent>
        </Popover>
    );
}
