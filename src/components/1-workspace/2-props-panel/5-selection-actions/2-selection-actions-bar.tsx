import { useAtomValue, useSetAtom } from "jotai";
import { runCommandAtom } from "@/commands";
import { optionButtonClasses } from "../2-controls/2-section";
import { type SelectionActionItem, selectionActionItemsAtom } from "./1-atoms-selection-actions";

/** Buttons for the selected elements; only the actions that apply to the current selection are rendered */
export function SelectionActionsBar() {
    const items = useAtomValue(selectionActionItemsAtom);

    return (
        <div className="flex flex-wrap gap-1">
            {items.map((item) => <SelectionActionButton item={item} key={item.commandId} />)}
        </div>
    );
}

function SelectionActionButton({ item }: { item: SelectionActionItem; }) {
    const run = useSetAtom(runCommandAtom);
    const { Icon } = item;

    return (
        <button className={optionButtonClasses} disabled={!item.enabled} title={item.title} aria-label={item.label} onClick={() => run(item.commandId)} type="button">
            <Icon className="size-3.5" />
        </button>
    );
}
