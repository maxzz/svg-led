import { useSnapshot } from "valtio";
import { Slider } from "@/ui/shadcn/slider";
import { type SectionProps } from "./9-registry";
import { CollapsibleSection } from "../2-props-panel-controls/2-section";
import { PresenceRow } from "../2-props-panel-controls/5-presence-controls";
import { appSettings } from "@/store/1-ui-settings";
import { useStyleWriter } from "./8-style-writer";
import { PropsCheck } from "./8-props-check";

import { getPresentation } from "@/svg-core";
import { MIXED, commonValue } from "../2-props-panel-controls/1-mixed";

//---------------------------------------------------------------------------

export function Section_Opacity({ mode, ids, nodes }: SectionProps) {
    const raw = commonValue(nodes, (n) => Number.parseFloat(getPresentation(n.attrs, 'opacity') ?? '1'));
    const percent = raw === MIXED || raw === undefined || Number.isNaN(raw) ? 100 : Math.round(raw * 100);
    const write = useStyleWriter(mode, ids);
    const { propertySections } = useSnapshot(appSettings);
    const set = (p: number) => {
        write.selection('opacity', String(p / 100));
        write.defaults({ opacity: p / 100 });
    };

    return (
        <CollapsibleSection
            title={`Opacity${raw === MIXED ? ' (mixed)' : ''}`}
            gutter
            check={<PropsCheck mode={mode} ids={ids} nodes={nodes} props={['opacity']} label="Opacity" />}
            open={propertySections.opacityOpen}
            onOpenChange={(open) => { appSettings.propertySections.opacityOpen = open; }}
        >
            <PresenceRow>
                <div className="flex items-center">
                    <Slider className="grow" min={0} max={100} step={1} value={[percent]} onValueChange={(v) => set(v[0])} />
                    <span className="w-8 text-right tabular-nums font-condensed">{percent}</span>
                </div>
            </PresenceRow>
        </CollapsibleSection>
    );
}
