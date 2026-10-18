import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Redo2, Undo2 } from "lucide-react";
import { historyState } from "@/store/3-document";
import { runCommandAtom } from "@/commands";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";

export function Island_Undo() {
    const run = useSetAtom(runCommandAtom);
    const history = useSnapshot(historyState);

    return (<>
        <Island>
            <button className={islandButtonClasses} title="Undo — Ctrl+Z" disabled={history.index <= 0} onClick={() => run('edit.undo')} type="button">
                <Undo2 className="size-4" />
            </button>

            <button className={islandButtonClasses} title="Redo — Ctrl+Shift+Z" disabled={history.index >= history.length - 1} onClick={() => run('edit.redo')} type="button">
                <Redo2 className="size-4" />
            </button>
        </Island>
    </>);
}
