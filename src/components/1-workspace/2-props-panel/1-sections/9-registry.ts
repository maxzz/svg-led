import { type ComponentType } from "react";
import { type SvgNode } from "@/svg-core";

import { Section_Fill, Section_Stroke } from "./1-1-section-colors";
import { Section_StrokeWidth } from "./1-2-section-stroke-width";
import { Section_Dash } from "./1-3-section-dash";
import { Section_CapsJoins } from "./1-4-section-caps-joins";
import { Section_RectCorners } from "./1-5-section-corners";
import { Section_BBox } from "./2-1-section-geometry";
import { Section_Actions } from "./2-3-section-actions";
import { Section_Opacity } from "./1-6-section-opacity";
import { Section_Align } from "./2-2-section-align";
import { PropertiesSeparator } from "../2-controls/6-separator";

//---------------------------------------------------------------------------
// Types

/** 'selection': edits the selected elements. 'newShape': edits the properties new shapes are created with. */
export type SectionMode = 'selection' | 'newShape';

export type SectionProps = {
    mode: SectionMode;
    ids: string[];
    nodes: readonly SvgNode[];   // selection: snapshots of the selected nodes, same order as ids; newShape: one stand-in node
};

export type PropertySection = {
    id: string;
    appliesTo: (nodes: readonly SvgNode[]) => boolean; // Shown when this returns true for the current selection (or for the stand-in node of a new shape)
    Component: ComponentType<SectionProps>;
    selectionOnly?: boolean;    // Only meaningful for selected elements (position, actions); hidden in the new-shape panel
};

//---------------------------------------------------------------------------
// Applies-to functions

function always() {
    return true;
}
function someKind(...kinds: SvgNode['kind'][]) {
    return (nodes: readonly SvgNode[]) => nodes.some((n) => kinds.includes(n.kind));
}
function someNotKind(...kinds: SvgNode['kind'][]) {
    return (nodes: readonly SvgNode[]) => nodes.some((n) => !kinds.includes(n.kind));
}
function multiple(nodes: readonly SvgNode[]) {
    return nodes.length > 1;
}

//---------------------------------------------------------------------------
// Property sections

/** Sections of the properties popup in display order; add new per-kind sections here */
export const PROPERTY_SECTIONS: readonly PropertySection[] = [
    { id: 'stroke',       /**/ appliesTo: always,                                                       /**/ Component: Section_Stroke },
    { id: 'fill',         /**/ appliesTo: someNotKind('line'),                                          /**/ Component: Section_Fill },
    { id: 'stroke-width', /**/ appliesTo: always,                                                       /**/ Component: Section_StrokeWidth },
    { id: 'dash',         /**/ appliesTo: always,                                                       /**/ Component: Section_Dash },
    { id: 'cap-join',     /**/ appliesTo: someKind('path', 'line', 'polyline', 'polygon', 'rect', 'g'), /**/ Component: Section_CapsJoins },
    { id: 'rect-corners', /**/ appliesTo: someKind('rect'),                                             /**/ Component: Section_RectCorners },
    { id: 'opacity',      /**/ appliesTo: always,                                                       /**/ Component: Section_Opacity },
    { id: 'align',        /**/ appliesTo: multiple,                                                     /**/ Component: Section_Align, selectionOnly: true },
    { id: 'bbox',         /**/ appliesTo: always,                                                       /**/ Component: Section_BBox, selectionOnly: true },
    { id: 'separator',    /**/ appliesTo: always,                                                       /**/ Component: PropertiesSeparator, selectionOnly: true },
    { id: 'actions',      /**/ appliesTo: always,                                                       /**/ Component: Section_Actions, selectionOnly: true },
];
