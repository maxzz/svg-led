import { Slider } from "@/ui/shadcn/slider";
import { type SectionProps } from "./9-registry";
import { Section } from "../2-controls/2-section";
import { useStyleWriter } from "./8-style-writer";

import { getPresentation } from "@/svg-core";
import { MIXED, commonValue } from "../2-controls/1-mixed";

//---------------------------------------------------------------------------

export function Section_Opacity({ mode, ids, nodes }: SectionProps) {
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
