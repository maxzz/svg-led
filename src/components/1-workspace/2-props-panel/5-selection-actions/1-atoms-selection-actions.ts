import { atom } from "jotai";
import { type LucideIcon } from "lucide-react";
import { type SvgDoc, type SvgNode, findNode } from "@/svg-core";
import { displayShortcut, getCommand } from "@/commands";
import { docState } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { atomWithValtio } from "@/store/atom-with-valtio";
import { appSettings } from "@/store/1-ui-settings";
import { type SelectionActionContext, SELECTION_ACTION_RULES } from "./0-selection-action-rules";

//---------------------------------------------------------------------------
// Jotai state for the selection actions

/** The Valtio document as a Jotai atom, so derived atoms update when the document changes */
const docAtom = atomWithValtio(docState);

/** The Valtio app settings as a Jotai atom, so the action list updates when a preference changes */
const settingsAtom = atomWithValtio(appSettings);

/** Selected nodes that exist in the document, in selection order */
export const selectedNodesAtom = atom((get): SvgNode[] => {
    const doc = get(docAtom).doc as unknown as SvgDoc;
    const nodes: SvgNode[] = [];
    for (const id of get(selectionAtom)) {
        const loc = findNode(doc, id);
        if (loc) {
            nodes.push(loc.node);
        }
    }
    return nodes;
});

export type SelectionActionItem = {
    commandId: string;
    Icon: LucideIcon;
    label: string;
    title: string;
    enabled: boolean;
};

/** Actions to render for the current selection, in display order; empty when nothing is selected */
export const selectionActionItemsAtom = atom((get): SelectionActionItem[] => {
    const nodes = get(selectedNodesAtom);
    if (!nodes.length) {
        return [];
    }

    const ctx: SelectionActionContext = { showViewBox: get(settingsAtom).prefs.showViewBox };

    const items: SelectionActionItem[] = [];
    for (const rule of SELECTION_ACTION_RULES) {
        const cmd = getCommand(rule.commandId);
        if (!cmd || !rule.isVisible(nodes, ctx)) {
            continue;
        }
        items.push({
            commandId: rule.commandId,
            Icon: rule.Icon,
            label: cmd.label,
            title: cmd.shortcut ? `${cmd.label} — ${displayShortcut(cmd.shortcut)}` : cmd.label,
            enabled: !cmd.enabled || cmd.enabled(get),
        });
    }
    return items;
});
