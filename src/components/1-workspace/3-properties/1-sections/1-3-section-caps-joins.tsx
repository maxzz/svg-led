import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { type SectionProps } from "./9-registry";
import { type SegmentOption, Section, Segmented, segmentButtonClasses, segmentGroupClasses } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { useStyleWriter } from "./8-style-writer";
import { Popover, PopoverAnchor, PopoverContent } from "@/ui/shadcn/popover";
import { Slider } from "@/ui/shadcn/slider";

import { getPresentation } from "@/svg-core";
import { DEFAULT_MITER_LIMIT, MAX_MITER_LIMIT } from "@/store/2-persist";
import { type MaybeMixed, MIXED, commonValue } from "../2-controls/1-mixed";
import { IconCap_1_Butt, IconCap_2_Round, IconCap_3_Square, IconCorner_3_Bevel, IconCorner_1_Miter, IconCorner_2_Round } from "@/ui/icons/normal/svg-led";
import { classNames } from "@/utils";

//---------------------------------------------------------------------------
// Line caps and joins

export function Section_CapsJoins({ mode, ids, nodes }: SectionProps) {
    const write = useStyleWriter(mode, ids);
    const cap = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linecap') ?? 'butt');
    const join = commonValue(nodes, (n) => getPresentation(n.attrs, 'stroke-linejoin') ?? 'miter');
    const miterlimit = commonValue(nodes, (n) => Number(getPresentation(n.attrs, 'stroke-miterlimit') ?? DEFAULT_MITER_LIMIT));

    const miterApplies = join === MIXED || join === 'miter'; // The miter limit only affects miter joins, so its field is hidden for round and bevel

    return (
        <Section title="Line caps and joins">
            <div className="flex items-center 1gap-1">
                <RowPrefix>
                    Cap
                </RowPrefix>
                <Segmented
                    className={segmentGroupClasses}
                    buttonClassName={classNames(segmentButtonClasses, "h-6.5 px-0.75")}
                    options={CAP_OPTIONS} value={cap === MIXED ? undefined : cap}
                    onChange={(v) => { write.selection('stroke-linecap', v === 'butt' ? undefined : v); write.defaults({ linecap: v }); }}
                />
            </div>

            <div className="flex items-center 1gap-1">
                <RowPrefix>
                    Corner
                </RowPrefix>
                <Segmented
                    className={segmentGroupClasses}
                    buttonClassName={classNames(segmentButtonClasses, "h-6.5 px-0.75")}
                    options={JOIN_OPTIONS}
                    value={join === MIXED ? undefined : join}
                    onChange={(v) => { write.selection('stroke-linejoin', v === 'miter' ? undefined : v); write.defaults({ linejoin: v }); }}
                />
                <MiterLimitField
                    visible={miterApplies}
                    value={miterlimit}
                    onChange={(v) => { write.selection('stroke-miterlimit', v === DEFAULT_MITER_LIMIT ? undefined : String(v)); write.defaults({ miterlimit: v }); }}
                />
            </div>
        </Section>
    );
}

/** Miter limit field. Shown only for miter joins and animated in and out; its popup slider opens while the field is focused. */
function MiterLimitField({ visible, value, onChange }: { visible: boolean; value: MaybeMixed<number> | undefined; onChange: (value: number) => void; }) {
    /** Popup is open while the field is focused */
    const [active, setActive] = useState(false);

    const numeric = typeof value === 'number' ? value : undefined;
    /** Slider range: 1 to at least 10, or to the current value when it is larger */
    const sliderMax = Math.max(MAX_MITER_LIMIT, numeric ?? 0);

    /** Clicks and focus moves inside the field must not close the popup */
    function keepOpenOnField(e: Event) {
        if ((e.target as Element).closest?.('[data-miter-field]')) {
            e.preventDefault();
        }
    }

    return (
        <AnimatePresence initial={false}>
            {visible && (
                <motion.div
                    className="ml-auto -my-0.5 p-0.5 overflow-hidden"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    <Popover open={active && visible} onOpenChange={setActive}>
                        <PopoverAnchor asChild>
                            <div className="w-16" data-miter-field onFocus={() => setActive(true)}>
                                <NumberField
                                    label="Limit"
                                    value={value}
                                    min={1}
                                    step={0.5}
                                    onChange={onChange}
                                />
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
                                min={1}
                                max={sliderMax}
                                step={0.5}
                                value={[numeric ?? DEFAULT_MITER_LIMIT]}
                                onValueChange={([v]) => onChange(v)}
                            />
                        </PopoverContent>
                    </Popover>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function RowPrefix({ children }: { children: string; }) {
    return (
        <span className="w-10 shrink-0 select-none text-[10px] text-muted-foreground">
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
