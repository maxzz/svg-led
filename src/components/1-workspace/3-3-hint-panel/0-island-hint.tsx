import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings, HintPlacement } from "@/store/1-ui-settings";
import { cn } from "@/utils/classnames";
import { toolHintAtom } from "../3-2-island-main-toolbar/9-atoms-toolbar";
import { HintText } from "./1-hint-text";

/**
 * Hint line for the active tool. Renders only in its own placement slot.
 * The slot has a fixed height and keeps its place even when the hint is off,
 * so neighbouring islands never shift and the text never wraps or grows.
 */
export function Island_Hint({ placement }: { placement: HintPlacement; }) {
    const hint = useAtomValue(toolHintAtom);
    const { prefs } = useSnapshot(appSettings);

    if (prefs.hintPlacement !== placement) return null;

    return (
        <div className={cn(
            "select-none min-w-0 px-2 text-ui text-muted-foreground/60 flex items-center",
            placement === HintPlacement.top ? "h-6 w-full" : "h-9 w-full",
        )}>
            <div className="w-full truncate text-center">
                <HintText text={hint} />
            </div>
        </div>
    );
}
