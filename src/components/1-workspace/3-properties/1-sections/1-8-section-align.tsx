import { type ReactNode } from "react";
import { type SectionProps } from "./9-registry";
import { Section, optionButtonClasses } from "../2-controls/2-section";

import { type AlignEdge, type DistributeAxis, alignNodes, distributeNodes } from "@/align";
import {
    IconAlign_1_1_Left, IconAlign_1_2_CenterH, IconAlign_1_3_Right,
    IconAlign_2_1_Top, IconAlign_2_2_CenterV, IconAlign_2_3_Bottom,
    IconAlign_3_1_DistributeH, IconAlign_3_2_DistributeV,
} from "@/ui/icons/normal/svg-led";

//---------------------------------------------------------------------------
// Align and distribute

const ALIGN_BUTTONS: { edge: AlignEdge; title: string; icon: ReactNode; }[] = [
    { edge: 'left',     title: 'Align left',               icon: <IconAlign_1_1_Left className="size-3.5" /> },
    { edge: 'center-h', title: 'Align horizontal centers', icon: <IconAlign_1_2_CenterH className="size-3.5" /> },
    { edge: 'right',    title: 'Align right',              icon: <IconAlign_1_3_Right className="size-3.5" /> },
    { edge: 'top',      title: 'Align top',                icon: <IconAlign_2_1_Top className="size-3.5" /> },
    { edge: 'center-v', title: 'Align vertical centers',   icon: <IconAlign_2_2_CenterV className="size-3.5" /> },
    { edge: 'bottom',   title: 'Align bottom',             icon: <IconAlign_2_3_Bottom className="size-3.5" /> },
];

const DISTRIBUTE_BUTTONS: { axis: DistributeAxis; title: string; icon: ReactNode; }[] = [
    { axis: 'horizontal', title: 'Distribute horizontally', icon: <IconAlign_3_1_DistributeH className="size-3.5" /> },
    { axis: 'vertical',   title: 'Distribute vertically',   icon: <IconAlign_3_2_DistributeV className="size-3.5" /> },
];

/** Align buttons need two elements; distribute needs three */
export function Section_Align({ ids }: SectionProps) {
    const canAlign = ids.length >= 2;
    const canDistribute = ids.length >= 3;

    return (
        <Section title="Align">
            <div className="flex flex-wrap gap-1">
                {ALIGN_BUTTONS.map(({ edge, title, icon }) => (
                    <button className={optionButtonClasses} disabled={!canAlign} title={title} aria-label={title} onClick={() => alignNodes(ids, edge)} type="button" key={edge}>
                        {icon}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-1">
                {DISTRIBUTE_BUTTONS.map(({ axis, title, icon }) => (
                    <button className={optionButtonClasses} disabled={!canDistribute} title={title} aria-label={title} onClick={() => distributeNodes(ids, axis)} type="button" key={axis}>
                        {icon}
                    </button>
                ))}
            </div>
        </Section>
    );
}
