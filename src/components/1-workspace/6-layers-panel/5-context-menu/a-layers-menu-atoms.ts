import { atom } from "jotai";
import { type SvgDoc } from "@/svg-core";
import { defsSelectionAtom, selectionAtom, setDefsSelectionAtom } from "@/store/4-editor";
import { docProxyAtom } from "@/store/6-layers";
import { rowClickAtom } from "../a-layer-atoms/9-atoms-layers-panel";
import { type LayersMenuTarget, menuTargetIdOf, resolveMenuTarget } from "./1-menu-target";
import { type LayersMenuCommand, commandsFor, layersMenuCommands } from "./8-menu-commands-definition";

/** Row the menu was opened for (a node id or a `<defs>` item id) */
const menuTargetIdAtom = atom<string | null>(null);

/** What the menu acts on; undefined once the row is gone (deleted, or undone) */
export const layersMenuTargetAtom = atom(
    (get): LayersMenuTarget | undefined => {
        const id = get(menuTargetIdAtom);
        return id ? resolveMenuTarget(get(docProxyAtom).doc as unknown as SvgDoc, id) : undefined;
    }
);

export type LayersMenuItem = { command: LayersMenuCommand; enabled: boolean; };

/** Commands registered for the kind of the target, with their enabled state */
export const layersMenuItemsAtom = atom(
    (get): LayersMenuItem[] => {
        const target = get(layersMenuTargetAtom);
        return target
            ? commandsFor(target).map((command) => ({ command, enabled: !command.enabled || command.enabled(get, target) }))
            : [];
    }
);

/**
 * Right-click in the tree: selects the row under the pointer (unless it is selected already, so a multiple selection stays)
 * and makes it the target. Returns false when there is nothing to show, so the menu does not open.
 */
export const openLayersMenuAtom = atom(
    null,
    (get, set, el: Element): boolean => {
        const id = menuTargetIdOf(el) ?? null;
        set(menuTargetIdAtom, id);

        const target = get(layersMenuTargetAtom);
        if (!id || !target) {
            return false;
        }

        if (target.kind === 'defs-class' || target.kind === 'defs-element') {
            !get(defsSelectionAtom).includes(id) && set(setDefsSelectionAtom, [id]);
        } else {
            !get(selectionAtom).includes(id) && set(rowClickAtom, { id, shift: false, ctrl: false });
        }
        return get(layersMenuItemsAtom).length > 0;
    }
);

export const runLayersMenuCommandAtom = atom(
    null,
    (get, set, commandId: string) => {
        const target = get(layersMenuTargetAtom);
        const command = layersMenuCommands.find((c) => c.id === commandId);

        if (target && command?.targets.includes(target.kind) && (!command.enabled || command.enabled(get, target))) {
            command.run(get, set, target);
        }
    }
);
