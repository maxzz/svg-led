import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { CircleQuestionMark, Minus, Plus, Redo2, Undo2 } from "lucide-react";
import { historyState } from "@/store/3-document";
import { runCommandAtom } from "@/commands";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";
import { zoomPercentAtom } from "./9-atoms-corner-controls";

export function ZoomUndoControls() {
    const run = useSetAtom(runCommandAtom);
    const zoom = useAtomValue(zoomPercentAtom);
    const history = useSnapshot(historyState);

    return (
        <div className="flex items-center gap-2 pointer-events-auto">
            <Island>
                <button className={islandButtonClasses} title="Zoom out — Ctrl+-" onClick={() => run('view.zoomOut')} type="button">
                    <Minus className="size-4" />
                </button>

                <button className="px-1 min-w-14 h-9 text-xs tabular-nums hover:bg-muted rounded-md" title="Reset zoom — Ctrl+0, fit — Shift+1" onClick={() => run('view.zoomReset')} onDoubleClick={() => run('view.zoomFit')} type="button">
                    {zoom}
                </button>

                <button className={islandButtonClasses} title="Zoom in — Ctrl+=" onClick={() => run('view.zoomIn')} type="button">
                    <Plus className="size-4" />
                </button>
            </Island>

            <Island>
                <button className={islandButtonClasses} title="Undo — Ctrl+Z" disabled={history.index <= 0} onClick={() => run('edit.undo')} type="button">
                    <Undo2 className="size-4" />
                </button>

                <button className={islandButtonClasses} title="Redo — Ctrl+Shift+Z" disabled={history.index >= history.length - 1} onClick={() => run('edit.redo')} type="button">
                    <Redo2 className="size-4" />
                </button>
            </Island>
        </div>
    );
}

export function HelpButton() {
    const run = useSetAtom(runCommandAtom);
    
    return (
        <Island className="pointer-events-auto">
            <button className={islandButtonClasses} title="Help — ?" onClick={() => run('help.shortcuts')} type="button">
                <CircleQuestionMark className="size-4" />
            </button>
        </Island>
    );
}
