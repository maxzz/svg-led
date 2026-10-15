import { type ComponentType } from "react";
import { type SvgNode } from "@/svg-core";

import { Section_Fill, Section_Stroke, Section_StrokeWidth } from "./1-1-section-colors-width";
import { Section_Dash } from "./1-2-section-dash";
import { Section_CapsJoins } from "./1-3-section-caps-joins";
import { Section_RectCorners } from "./1-4-section-corners";
import { Section_BBox } from "./1-6-section-geometry";
import { Section_Actions } from "./1-7-section-actions";
import { Section_Opacity } from "./1-5-section-opacity";

/** 'selection': edits the selected elements. 'newShape': edits the properties new shapes are created with. */
export type SectionMode = 'selection' | 'newShape';

export type SectionProps = {
    mode: SectionMode;
    ids: string[];
    nodes: readonly SvgNode[];   // selection: snapshots of the selected nodes, same order as ids; newShape: one stand-in node
};

export type PropertySection = {
    id: string;
    /** Shown when this returns true for the current selection (or for the stand-in node of a new shape) */
    appliesTo: (nodes: readonly SvgNode[]) => boolean;
    Component: ComponentType<SectionProps>;
    /** Only meaningful for selected elements (position, actions); hidden in the new-shape panel */
    selectionOnly?: boolean;
};

function always() {
    return true;
}
function someKind(...kinds: SvgNode['kind'][]) {
    return (nodes: readonly SvgNode[]) => nodes.some((n) => kinds.includes(n.kind));
}
function someNotKind(...kinds: SvgNode['kind'][]) {
    return (nodes: readonly SvgNode[]) => nodes.some((n) => !kinds.includes(n.kind));
}

/** Sections of the properties popup in display order; add new per-kind sections here */
export const PROPERTY_SECTIONS: readonly PropertySection[] = [
    { id: 'stroke',       /**/ appliesTo: always,                                                       /**/ Component: Section_Stroke },
    { id: 'fill',         /**/ appliesTo: someNotKind('line'),                                          /**/ Component: Section_Fill },
    { id: 'stroke-width', /**/ appliesTo: always,                                                       /**/ Component: Section_StrokeWidth },
    { id: 'dash',         /**/ appliesTo: always,                                                       /**/ Component: Section_Dash },
    { id: 'cap-join',     /**/ appliesTo: someKind('path', 'line', 'polyline', 'polygon', 'rect', 'g'), /**/ Component: Section_CapsJoins },
    { id: 'rect-corners', /**/ appliesTo: someKind('rect'),                                             /**/ Component: Section_RectCorners },
    { id: 'opacity',      /**/ appliesTo: always,                                                       /**/ Component: Section_Opacity },
    { id: 'bbox',         /**/ appliesTo: always,                                                       /**/ Component: Section_BBox, selectionOnly: true },
    { id: 'actions',      /**/ appliesTo: always,                                                       /**/ Component: Section_Actions, selectionOnly: true },
];
