import { useState } from "react";
import { type SectionProps } from "./9-registry";
import { useSnapshot } from "valtio";
import { CollapsibleSection, Segmented, segmentSizeClasses, type SegmentOption } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { PresenceRow } from "../2-controls/5-presence-controls";
import { appSettings } from "@/store/1-ui-settings";
import { useStyleWriter } from "./8-style-writer";
import { PropsCheck } from "./8-props-check";
import { Popover, PopoverAnchor, PopoverContent } from "@/ui/shadcn/popover";
import { Slider } from "@/ui/shadcn/slider";
import { MIXED, commonValue, type MaybeMixed } from "../2-controls/1-mixed";
import { DEFAULT_STROKE_WIDTH, MAX_STROKE_WIDTH } from "@/store/2-persist/1-new-shape-style-atoms";
import { prop } from "./1-1-section-colors";

//---------------------------------------------------------------------------
// Stroke width

export function Section_StrokeWidth({ mode, ids, nodes }: SectionProps) {
    const raw = commonValue(nodes, prop('stroke-width'));
    const value = raw === MIXED ? MIXED : raw === undefined ? DEFAULT_STROKE_WIDTH : Number.parseFloat(raw);
    const write = useStyleWriter(mode, ids);
    const { propertySections } = useSnapshot(appSettings);
    const set = (v: number) => {
        write.selection('stroke-width', String(v));
        write.defaults({ strokeWidth: v });
    };

    return (
        <CollapsibleSection
            title="Stroke width"
            gutter
            check={<PropsCheck mode={mode} ids={ids} nodes={nodes} props={['stroke-width']} label="Stroke width" />}
            open={propertySections.strokeWidthOpen}
            onOpenChange={(open) => { appSettings.propertySections.strokeWidthOpen = open; }}
        >
            <PresenceRow>
                <div className="flex flex-wrap items-center gap-1">
                    <Segmented
                        options={WIDTH_OPTIONS}
                        value={value === MIXED ? undefined : value}
                        onChange={set}
                        buttonClassName={segmentSizeClasses}
                    />
                    <StrokeWidthField value={value} onChange={set} />
                </div>
            </PresenceRow>
        </CollapsibleSection>
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
                    <NumberField className="h-5.5 rounded" value={value} min={0} step={0.5} onChange={onChange} />
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
