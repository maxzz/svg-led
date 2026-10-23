import { type SvgNode } from "@/svg-core";
import { PresenceCheckbox } from "../2-props-panel-controls/5-presence-controls";
import { type SectionMode } from "./9-registry";
import { useStyleWriter } from "./8-style-writer";
import { presenceOf } from "./8-presence";

/**
 * Presence checkbox of one or more properties of the selection.
 * Not shown in the new-shape panel: a new shape has no file yet, so there is nothing to write.
 */
export function PropsCheck({ mode, ids, nodes, props, label }: {
    mode: SectionMode; ids: string[]; nodes: readonly SvgNode[]; props: readonly string[]; label: string;
}) {
    const write = useStyleWriter(mode, ids);
    if (mode !== 'selection') {
        return null;
    }
    return <PresenceCheckbox state={presenceOf(nodes, props)} label={label} onChange={(on) => write.presence(props, on)} />;
}
