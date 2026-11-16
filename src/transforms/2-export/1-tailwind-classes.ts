import { type MarkupElement, getAttr, parseMarkup, printSvgMarkup, setAttr, walkElements } from "../0-markup/1-markup-tree";
import { isPlainNumber } from "../0-markup/3-style-object";
import { type ExportStep } from "./9-export-types";

export const tailwindClassesStep: ExportStep = {
    id: 'tailwind-classes',
    label: 'Presentation attributes as Tailwind classes',
    enabled: (options) => options.tailwind,
    apply: (svg) => attrsToTailwind(svg) ?? svg,
};

//---------------------------------------------------------------------------

/** Moves fill, stroke, opacity and the other presentation attributes of every element into its class; undefined when the SVG is not well-formed */
export function attrsToTailwind(svg: string): string | undefined {
    const nodes = parseMarkup(svg);
    if (!nodes) {
        return undefined;
    }
    walkElements(nodes, moveToClasses);
    return printSvgMarkup(nodes);
}

function moveToClasses(el: MarkupElement): void {
    const classes: string[] = [];
    for (const { name, value } of [...el.attrs]) {
        const cls = tailwindClass(name, value);
        if (cls) {
            classes.push(cls);
            setAttr(el, name, undefined);
        }
    }
    if (classes.length) {
        const existing = getAttr(el, 'class')?.trim();
        setAttr(el, 'class', [existing, ...classes].filter(Boolean).join(' '));
    }
}

//---------------------------------------------------------------------------

/** The Tailwind class for a presentation attribute; undefined for attributes that stay attributes */
export function tailwindClass(name: string, value: string): string | undefined {
    const v = value.trim();
    if (!v) {
        return undefined;
    }
    switch (name) {
        case 'fill':
        case 'stroke':
            return `${name}-${paintValue(v)}`;
        case 'stroke-width':
            if (/^\d+$/.test(v)) {
                return `stroke-${v}`;
            }
            return isPlainNumber(v) ? `stroke-[${v}]` : `[stroke-width:${arbitrary(v)}]`;
        case 'opacity': {
            const pct = v.endsWith('%') ? parseFloat(v) : parseFloat(v) * 100;
            if (Number.isFinite(pct) && Number.isInteger(Math.round(pct * 1e6) / 1e6)) {
                return `opacity-${Math.round(pct)}`;
            }
            return `opacity-[${arbitrary(v)}]`;
        }
    }
    return ARBITRARY_PROPS.has(name) ? `[${name}:${arbitrary(v)}]` : undefined;
}

/** Presentation attributes moved into Tailwind arbitrary properties, e.g. `[stroke-linecap:round]` */
const ARBITRARY_PROPS = new Set([
    'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity',
    'fill-opacity', 'fill-rule', 'clip-rule', 'paint-order', 'vector-effect', 'shape-rendering',
]);

//---------------------------------------------------------------------------

function paintValue(v: string): string {
    switch (v.toLowerCase()) {
        case 'currentcolor': return 'current';
        case 'none': return 'none';
        case 'transparent': return 'transparent';
    }
    return `[${arbitrary(v)}]`;
}

/** Arbitrary values write spaces as underscores (and escape literal underscores) */
function arbitrary(v: string): string {
    return v.replace(/_/g, '\\_').replace(/\s+/g, '_');
}
