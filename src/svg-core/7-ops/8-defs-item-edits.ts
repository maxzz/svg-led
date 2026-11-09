import { type Attrs } from "../1-model/1-types";
import { scanElements } from "../3-serialize/4-source-map";
import { classOfSelector, cssDeclsOf, cssRulesOf, splitDecl } from "../3-serialize/5-defs-markup";
import { parseStyle, stringifyStyle } from "../8-style/1-presentation";
import { styleAt, takeClassRules } from "./7-defs-items";

/**
 * Edits of `<defs>` items that the layers context menu runs: deleting an element or a class, and applying a class
 * to elements (its declarations become their attributes). Pure: markup in, markup out; attributes are changed in place.
 */

export type CssProp = { prop: string; value: string; };

//---------------------------------------------------------------------------
// Delete

/** Removes the element at pre-order `index` (with the elements inside it) and the white space in front of it */
export function deleteDefsElementMarkup(inner: string, index: number): string {
    const r = scanElements(inner)[index];
    if (!r) {
        return inner;
    }
    const gap = /\s*$/.exec(inner.slice(0, r.start))?.[0].length ?? 0;
    return inner.slice(0, r.start - gap) + inner.slice(r.end);
}

/** Removes the rules of class `name` from the `<style>` element `styleIndex`; a rule shared with other classes keeps the others */
export function deleteDefsClassMarkup(inner: string, styleIndex: number, name: string): string {
    const st = styleAt(inner, styleIndex);
    const taken = st && takeClassRules(st.css, name);
    return st && taken ? inner.slice(0, st.open) + taken.css + inner.slice(st.close) : inner;
}

//---------------------------------------------------------------------------
// Apply

/**
 * Declarations of class `name` of the `<style>` element `styleIndex` that are in effect, in order:
 * only rules that name the class with an active selector, and only declarations that are not commented out.
 */
export function activeClassDecls(inner: string, styleIndex: number, name: string): CssProp[] {
    const st = styleAt(inner, styleIndex);
    if (!st) {
        return [];
    }
    return cssRulesOf(st.css)
        .filter((rule) => rule.selectors.some((sel) => {
            const cls = classOfSelector(sel);
            return cls?.name === name && !cls.deactivated;
        }))
        .flatMap((rule) => cssDeclsOf(st.css, rule))
        .filter((d) => !d.off)
        .map((d) => splitDecl(d.text))
        .filter((d) => d.prop && d.value);
}

/** True when the `class` attribute lists `name` */
export function hasClassToken(attrs: Attrs, name: string): boolean {
    return attrs.class?.trim().split(/\s+/).includes(name) ?? false;
}

/**
 * Removes the class `name` from the `class` attribute and keeps the other class names.
 * The attribute itself is removed when no other class name is left.
 */
export function removeClassToken(attrs: Attrs, name: string): void {
    const rest = (attrs.class?.trim().split(/\s+/) ?? []).filter((t) => t && t !== name);
    if (rest.length) {
        attrs.class = rest.join(' ');
    } else {
        delete attrs.class;
    }
}

/**
 * Writes the declarations of a class onto an element, so the element looks the same without the stylesheet.
 * The element keeps the class, so the class can be applied again after its rule changes.
 * - a presentation property becomes an attribute (a class beats an attribute, so it overwrites one);
 * - any other property (and an `!important` one) goes into the `style` attribute;
 * - a property already in the `style` attribute stays as it is, because inline style beats a class.
 */
export function applyClassDecls(attrs: Attrs, decls: readonly CssProp[]): void {
    const style = parseStyle(attrs.style ?? '');
    const inline = new Set(Object.keys(style));

    for (const { prop, value } of decls) {
        const important = IMPORTANT.test(value);
        if (inline.has(prop) && !important) {
            continue;
        }
        const plain = value.replace(IMPORTANT, '');
        if (PRESENTATION_ATTRS.has(prop) && !important) {
            attrs[prop] = plain;
        } else {
            style[prop] = plain;
        }
    }

    const text = stringifyStyle(style);
    if (text) {
        attrs.style = text;
    } else {
        delete attrs.style;
    }
}

const IMPORTANT = /\s*!important\s*$/i;

/** CSS properties that SVG also accepts as attributes of the same name */
const PRESENTATION_ATTRS: ReadonlySet<string> = new Set([
    'alignment-baseline', 'baseline-shift', 'clip', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters',
    'color-rendering', 'cursor', 'direction', 'display', 'dominant-baseline', 'fill', 'fill-opacity', 'fill-rule', 'filter',
    'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight',
    'image-rendering', 'letter-spacing', 'lighting-color', 'marker-end', 'marker-mid', 'marker-start', 'mask', 'opacity', 'overflow',
    'paint-order', 'pointer-events', 'shape-rendering', 'stop-color', 'stop-opacity', 'stroke', 'stroke-dasharray', 'stroke-dashoffset',
    'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'text-anchor', 'text-decoration',
    'text-rendering', 'unicode-bidi', 'vector-effect', 'visibility', 'word-spacing', 'writing-mode',
]);
