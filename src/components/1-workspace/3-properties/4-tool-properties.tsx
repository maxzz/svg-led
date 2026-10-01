import { useAtomValue, useSetAtom } from "jotai";
import { type ToolDef, type ToolStyleOptions } from "@/tools";
import { Section } from "./2-controls/2-section";
import { NumberField } from "./2-controls/3-number-field";
import { ColorRow, FILL_SWATCHES, STROKE_SWATCHES } from "./2-controls/4-color-row";
import { activeToolDefAtom } from "./9-atoms-properties-popup";

/** Style that the active drawing tool gives to new elements */
export function ToolProperties() {
    const tool = useAtomValue(activeToolDefAtom);
    return tool.optionsAtom ? <ToolStyleEditor tool={tool as ToolDef & Required<Pick<ToolDef, 'optionsAtom'>>} key={tool.id} /> : null;
}

function ToolStyleEditor({ tool }: { tool: ToolDef & Required<Pick<ToolDef, 'optionsAtom'>>; }) {
    const options: ToolStyleOptions = useAtomValue(tool.optionsAtom);
    const setOptions = useSetAtom(tool.optionsAtom);

    return (<>
        <div className="select-none text-xs font-medium">New {tool.label.toLowerCase()} style</div>
        <Section title="Stroke">
            <ColorRow value={options.stroke} swatches={STROKE_SWATCHES} onChange={(stroke) => setOptions({ stroke })} />
        </Section>
        {tool.id !== 'line' && (
            <Section title="Fill">
                <ColorRow value={options.fill} swatches={FILL_SWATCHES} onChange={(fill) => setOptions({ fill })} />
            </Section>
        )}
        <Section title="Stroke width">
            <NumberField className="w-20" value={options.strokeWidth} min={0} step={0.5} onChange={(strokeWidth) => setOptions({ strokeWidth })} />
        </Section>
    </>);
}
