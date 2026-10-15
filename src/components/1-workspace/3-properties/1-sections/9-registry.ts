import { type ComponentType } from "react";
import { type SvgNode } from "@/svg-core";

import { FillSection, StrokeSection, StrokeWidthSection } from "./1-1-section-colors-width";
import { DashSection } from "./1-2-section-dash";
import { CapJoinSection } from "./1-3-section-cap-join";
import { RectCornersSection } from "./1-4-section-corners";
import { BBoxSection } from "./1-5-section-geometry";
import { ActionsSection } from "./1-6-section-actions";
import { OpacitySection } from "./1-7-section-opacity";

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
    { id: 'stroke',       /**/ appliesTo: always,                                                       /**/ Component: StrokeSection },
    { id: 'fill',         /**/ appliesTo: someNotKind('line'),                                          /**/ Component: FillSection },
    { id: 'stroke-width', /**/ appliesTo: always,                                                       /**/ Component: StrokeWidthSection },
    { id: 'dash',         /**/ appliesTo: always,                                                       /**/ Component: DashSection },
    { id: 'cap-join',     /**/ appliesTo: someKind('path', 'line', 'polyline', 'polygon', 'rect', 'g'), /**/ Component: CapJoinSection },
    { id: 'rect-corners', /**/ appliesTo: someKind('rect'),                                             /**/ Component: RectCornersSection },
    { id: 'opacity',      /**/ appliesTo: always,                                                       /**/ Component: OpacitySection },
    { id: 'bbox',         /**/ appliesTo: always,                                                       /**/ Component: BBoxSection, selectionOnly: true },
    { id: 'actions',      /**/ appliesTo: always,                                                       /**/ Component: ActionsSection, selectionOnly: true },
];
