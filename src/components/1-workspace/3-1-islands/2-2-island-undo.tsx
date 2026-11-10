import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import { Redo2, Undo2 } from "lucide-react";
import { historyState, modifiedState } from "@/store/3-document";
import { saveDocToStorage } from "@/store/5-controllers";
import { runCommandAtom } from "@/commands";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";

export function Island_Undo() {
    const run = useSetAtom(runCommandAtom);
    const history = useSnapshot(historyState);
    const modified = useSnapshot(modifiedState);

    return (<>
        <Island className="relative">
            <button className={islandButtonClasses} title="Undo — Ctrl+Z" disabled={history.index <= 0} onClick={() => run('edit.undo')} type="button">
                <Undo2 className="size-4" />
            </button>

            <button className={islandButtonClasses} title="Redo — Ctrl+Shift+Z" disabled={history.index >= history.length - 1} onClick={() => run('edit.redo')} type="button">
                <Redo2 className="size-4" />
            </button>

            {modified.storage && <UnsavedIndicator />}
        </Island>
    </>);
}

/** Overlay dot under the Undo/Redo buttons (absolute, so the island keeps its size). Click saves the document to local storage. */
function UnsavedIndicator() {
    const onClick = () => {
        if (!saveDocToStorage()) {
            toast.error('Could not save the document to local storage');
        }
    };

    return (
        <button
            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-3 flex items-center justify-center cursor-pointer"
            title="Unsaved changes — click to save to local storage"
            aria-label="Unsaved changes. Save to local storage"
            onClick={onClick}
            type="button"
        >
            <span className="size-1.5 bg-(--editor-accent) rounded-full" />
        </button>
    );
}
