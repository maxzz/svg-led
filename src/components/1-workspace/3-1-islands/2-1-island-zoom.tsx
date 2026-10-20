import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Minus, Plus } from "lucide-react";
import { historyState } from "@/store/3-document";
import { runCommandAtom } from "@/commands";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";
import { zoomPercentAtom } from "./9-atoms-corner-controls";
export function Island_Zoom() {
    const run = useSetAtom(runCommandAtom);
    const zoom = useAtomValue(zoomPercentAtom);
    const history = useSnapshot(historyState);

    return (<>
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
    </>);
}
