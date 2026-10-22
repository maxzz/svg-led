import { type LucideIcon, Combine, Copy, Frame, Group, Spline, Split, Trash, Ungroup } from "lucide-react";
import { type SvgNode, isCompoundPath, isShapeNode } from "@/svg-core";

//---------------------------------------------------------------------------
// Rules for the "Actions" buttons of the selection properties.
// Modeled on Excalidraw's shape action predicates: an action is shown only when its predicate
// is true for the current selection. Clickability is still decided by the command's own `enabled`.

/** Editor state that some action predicates depend on */
export type SelectionActionContext = {
    showViewBox: boolean;        // "Show the viewBox frame on the canvas" preference
};

export type SelectionActionRule = {
    /** Id of a command in `@/commands`; supplies the label, shortcut and run function */
    commandId: string;
    Icon: LucideIcon;
    /** nodes: the selected nodes that exist in the document (never empty when this is called) */
    isVisible: (nodes: readonly SvgNode[], ctx: SelectionActionContext) => boolean;
};

const always = () => true;

/** Actions in display order */
export const SELECTION_ACTION_RULES: readonly SelectionActionRule[] = [
    { commandId: 'edit.duplicate',       Icon: Copy,    isVisible: always },
    { commandId: 'edit.delete',          Icon: Trash,   isVisible: always },
    { commandId: 'object.group',         Icon: Group,   isVisible: (nodes) => nodes.length >= 2 },
    { commandId: 'object.ungroup',       Icon: Ungroup, isVisible: (nodes) => nodes.some((n) => n.kind === 'g') },
    { commandId: 'object.makeCompound',   Icon: Combine, isVisible: (nodes) => nodes.length >= 2 },
    { commandId: 'object.releaseCompound', Icon: Split,  isVisible: (nodes) => nodes.some((n) => isCompoundPath(n)) },
    { commandId: 'object.convertToPath', Icon: Spline,  isVisible: (nodes) => nodes.some((n) => isShapeNode(n)) },
    { commandId: 'viewbox.fitSelection', Icon: Frame,   isVisible: (_nodes, ctx) => ctx.showViewBox },
];
