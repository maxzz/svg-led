import { type Attrs, type SvgNode, getPresentation } from "@/svg-core";
import { DEFAULT_MITER_LIMIT, DEFAULT_STROKE_WIDTH } from "@/store/2-persist";
import { type PresenceState, combinePresence } from "../2-props-panel-controls/5-presence-state";

//---------------------------------------------------------------------------
// Presence checkboxes: a property is checked when its attribute is written to the file

/**
 * SVG default of each presentation property. The panel shows it while the attribute is absent,
 * and it is written when the property's checkbox is turned on.
 */
export const SVG_DEFAULTS: Readonly<Record<string, string>> = {
    stroke: 'none',
    fill: '#000000',
    'stroke-width': String(DEFAULT_STROKE_WIDTH),
    'stroke-dasharray': 'none',
    'stroke-linecap': 'butt',
    'stroke-linejoin': 'miter',
    'stroke-miterlimit': String(DEFAULT_MITER_LIMIT),
    opacity: '1',
};

/** Value of a presentation property as the panel shows it: the attribute's value, or the SVG default when absent */
export function presentationValue(attrs: Attrs, prop: string): string {
    return getPresentation(attrs, prop) ?? SVG_DEFAULTS[prop];
}

/** Presence of all the properties across the nodes: checked when every node has every property, unchecked when none has any */
export function presenceOf(nodes: readonly SvgNode[], props: readonly string[]): PresenceState {
    return combinePresence(nodes.flatMap((n) => props.map((p) => getPresentation(n.attrs, p) !== undefined)));
}
