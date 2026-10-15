import { useRef, useState } from "react";
import { Button } from "@/ui/shadcn/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/ui/shadcn/popover";
import { Slider } from "@/ui/shadcn/slider";
import { Link, Unlink } from "lucide-react";

import { Section } from "../2-controls/2-section";
import { NumberField } from "../2-controls/3-number-field";
import { commitHistory, getNodeProxy } from "@/store/3-document";
import { commonValue } from "../2-controls/1-mixed";
import { useStyleWriter } from "./8-style-writer";
import { type RectNode } from "@/svg-core";
import { type SectionProps } from "./9-registry";

//---------------------------------------------------------------------------
// Rect corners

export function RectCornersSection({ mode, ids, nodes }: SectionProps) {
    const rects = nodes.filter((n): n is RectNode => n.kind === 'rect');
    const rx = commonValue(rects, (r) => r.rx);
    const ry = commonValue(rects, (r) => r.ry);
    const write = useStyleWriter(mode, ids);

    /** Field whose popup is open (focused); null when closed */
    const [active, setActive] = useState<CornerKey | null>(null);
    /** When on, rx and ry change together */
    const [linked, setLinked] = useState(false);
    /** ry of each shape (by id) as it was before linking, restored on unlink */
    const savedRy = useRef<Map<string, number> | null>(null);

    function set(key: CornerKey, value: number, both: boolean) {
        if (mode === 'newShape') {
            // the radius new rectangles are created with; each shape is clamped to its size when drawn
            write.defaults(both ? { rx: value, ry: value } : key === 'rx' ? { rx: value } : { ry: value });
            return;
        }
        for (const r of rects) {
            const node = getNodeProxy(r.id) as RectNode | undefined;
            if (node) {
                if (key === 'rx' || both) {
                    node.rx = Math.min(value, node.width / 2);
                }
                if (key === 'ry' || both) {
                    node.ry = Math.min(value, node.height / 2);
                }
            }
        }
        commitHistory({ mergeKey: `corners:${ids.join(',')}` });
    }

    /** Opens the popup on a field; when it appears, the link button shows whether rx and ry are equal */
    function openOn(key: CornerKey) {
        if (active === null) {
            setLinked(typeof rx === 'number' && rx === ry);
        }
        setActive(key);
    }

    /** Sets ry of each shape, clamped to its height; in the new-shape panel it sets the default instead */
    function writeRy(next: (r: RectNode) => number) {
        if (mode === 'newShape') {
            rects[0] && write.defaults({ ry: next(rects[0]) });
            return;
        }
        for (const r of rects) {
            const node = getNodeProxy(r.id) as RectNode | undefined;
            if (node) {
                node.ry = Math.min(next(r), node.height / 2);
            }
        }
        commitHistory();
    }

    function toggleLink() {
        if (!linked) {
            savedRy.current = new Map(rects.map((r) => [r.id, r.ry]));
            writeRy((r) => r.rx); // ry adopts rx
        }
        else {
            writeRy((r) => savedRy.current?.get(r.id) ?? r.ry); // ry goes back to its value before linking
            savedRy.current = null;
        }
        setLinked(!linked);
    }

    /** Slider range: half of the largest size among the selected rects (or 100 when there are none) */
    const sliderMax = rects.length ? Math.max(1, ...rects.map((r) => (active === 'ry' ? r.height : r.width) / 2)) : 100;
    const activeValue = active === 'ry' ? ry : rx;

    /** Clicks and focus moves between the two fields must not close the popup */
    function keepOpenOnField(e: Event) {
        if ((e.target as Element).closest?.('[data-corner-field]')) {
            e.preventDefault();
        }
    }

    return (
        <Section title="Corner radius">
            <Popover open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
                <PopoverAnchor asChild>
                    <div className="grid grid-cols-2 gap-1">
                        <div className="contents" data-corner-field onFocus={() => openOn('rx')}>
                            <NumberField label="rx" value={rx} min={0} onChange={(v) => set('rx', v, linked)} />
                        </div>
                        <div className="contents" data-corner-field onFocus={() => openOn('ry')}>
                            <NumberField label="ry" value={ry} min={0} onChange={(v) => set('ry', v, linked)} />
                        </div>
                    </div>
                </PopoverAnchor>

                <PopoverContent
                    className="p-2 w-(--radix-popper-anchor-width) flex-row items-center gap-1.5"
                    side="bottom"
                    align="start"
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
                        value={[typeof activeValue === 'number' ? activeValue : 0]}
                        onValueChange={([v]) => active && set(active, v, linked)}
                    />
                    <Button
                        variant={linked ? 'secondary' : 'ghost'}
                        size="icon-xs"
                        aria-pressed={linked}
                        title={linked ? 'Unlink rx and ry' : 'Link rx and ry'}
                        onClick={toggleLink}
                    >
                        {linked ? <Link /> : <Unlink />}
                    </Button>
                </PopoverContent>
            </Popover>
        </Section>
    );
}

type CornerKey = 'rx' | 'ry';
