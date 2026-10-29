import { type ComponentType } from "react";
import { type WritableAtom, useAtomValue, useSetAtom } from "jotai";
import { Copy, Crosshair, FolderPlus, Group, Scan, Trash2 } from "lucide-react";

import { canIsolateSelectionAtom, deleteSelectionAtom, duplicateSelectionAtom, groupSelectionAtom, hasLiveSelectionAtom, isolateSelectionAtom, newGroupAtom } from "@/store/6-layers";
import { locateSelectionAtom } from "./9-atoms-layers-panel";

/** Operations on layers, as at the bottom of Illustrator's Layers panel */
export function LayersBottomBar() {
    const hasSelection = useAtomValue(hasLiveSelectionAtom);
    const canIsolate = useAtomValue(canIsolateSelectionAtom);

    return (
        <div className="shrink-0 px-1 h-9 border-t flex items-center justify-end gap-0.5">
            <BarButton icon={Crosshair} title="Locate the selection in the tree" atom={locateSelectionAtom} disabled={!hasSelection} />
            <BarButton icon={Scan} title="Enter isolation mode for the selected group, or the group of the selected element" atom={isolateSelectionAtom} disabled={!canIsolate} />
            <span className="mx-1 w-px h-4 bg-border" />
            <BarButton icon={FolderPlus} title="New group" atom={newGroupAtom} />
            <BarButton icon={Group} title="Group the selection — Ctrl+G" atom={groupSelectionAtom} disabled={!hasSelection} />
            <BarButton icon={Copy} title="Duplicate the selection" atom={duplicateSelectionAtom} disabled={!hasSelection} />
            <BarButton icon={Trash2} title="Delete the selection — Delete" atom={deleteSelectionAtom} disabled={!hasSelection} />
        </div>
    );
}

type ActionAtom = WritableAtom<null, [], void>;

function BarButton({ icon: Icon, title, atom, disabled }: { icon: ComponentType<{ className?: string; }>; title: string; atom: ActionAtom; disabled?: boolean; }) {
    const run = useSetAtom(atom);
    return (
        <button
            className="size-7 text-foreground/80 hover:bg-muted disabled:opacity-40 transition-colors rounded-md flex items-center justify-center cursor-pointer disabled:cursor-default"
            title={title}
            disabled={disabled}
            onClick={() => run()}
            type="button"
        >
            <Icon className="size-4" />
        </button>
    );
}
