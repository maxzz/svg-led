import { type AppStore } from "../0-app-store";
import { ToolId, activeToolIdAtom, editingGroupIdAtom, exitGroupEditingAtom, selectionAtom, setActiveToolAtom, setSelectionAtom, spaceHeldAtom } from "../4-editor";
import { getTool, toolByShortcut } from "@/tools";
import { COMMANDS, isEditableTarget, matchShortcut, nudgeSelection } from "@/commands";

/** Global shortcuts: the active tool gets the key first, then commands, then tool letters and nudging */
export function installKeyboard(store: AppStore): () => void {
    const ctx = { get: store.get, set: store.set };

    function onKeyDown(e: KeyboardEvent) {
        if (isEditableTarget(e.target)) {
            return;
        }

        if (e.key === ' ') {
            e.preventDefault();
            if (!e.repeat) {
                store.set(spaceHeldAtom, true);
            }
            return;
        }

        if (getTool(store.get(activeToolIdAtom)).onKeyDown?.(ctx, e)) {
            e.preventDefault();
            return;
        }

        for (const cmd of COMMANDS) {
            const keys = [cmd.shortcut, ...(cmd.alsoKeys ?? [])].filter(Boolean) as string[];
            if (cmd.group !== 'tools' && keys.some((k) => matchShortcut(e, k))) {
                e.preventDefault();
                if (!cmd.enabled || cmd.enabled(store.get)) {
                    void cmd.run(ctx);
                }
                return;
            }
        }

        const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
        if (plain && !e.shiftKey) {
            const tool = toolByShortcut(e.key);
            if (tool) {
                e.preventDefault();
                store.set(setActiveToolAtom, tool.id);
                return;
            }
        }

        if (plain && nudgeSelection(store.get(selectionAtom), e.key, e.shiftKey)) {
            e.preventDefault();
            return;
        }

        if (e.key === 'Escape') {
            if (store.get(activeToolIdAtom) !== ToolId.select) {
                store.set(setActiveToolAtom, ToolId.select);
            } else if (store.get(editingGroupIdAtom)) {
                store.set(exitGroupEditingAtom);
            } else {
                store.set(setSelectionAtom, []);
            }
        }
    }

    function onKeyUp(e: KeyboardEvent) {
        if (e.key === ' ') {
            store.set(spaceHeldAtom, false);
        }
    }

    function onBlur() {
        return store.set(spaceHeldAtom, false);
    }

    const controller = new AbortController();
    window.addEventListener('keydown', onKeyDown, { signal: controller.signal });
    window.addEventListener('keyup', onKeyUp, { signal: controller.signal });
    window.addEventListener('blur', onBlur, { signal: controller.signal });
    
    return () => {
        controller.abort();
    };
}
