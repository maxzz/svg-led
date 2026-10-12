import { type Attrs, fmtNum } from "@/svg-core";
import { type LastStyle } from "@/store/2-persist";

/** Attributes of a new shape. Values equal to the SVG default are left out. */
export function styleAttrs(s: LastStyle, strokeWidth: number, dashArray?: string): Attrs {
    return {
        fill: s.fill || 'none',
        stroke: s.stroke || 'none',
        'stroke-width': fmtNum(strokeWidth, 3),
        ...(dashArray ? { 'stroke-dasharray': dashArray } : {}),
        ...(s.linecap && s.linecap !== 'butt' ? { 'stroke-linecap': s.linecap } : {}),
        ...(s.linejoin && s.linejoin !== 'miter' ? { 'stroke-linejoin': s.linejoin } : {}),
        ...(s.opacity < 1 ? { opacity: fmtNum(s.opacity, 3) } : {}),
    };
}
