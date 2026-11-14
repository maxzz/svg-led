import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings, HintPlacement } from "@/store/1-ui-settings";
import { menuHintAtom } from "@/store/4-editor";
import { cn } from "@/utils/classnames";
import { toolHintAtom } from "../3-2-island-main-toolbar/9-atoms-toolbar";
import { HintText } from "./1-hint-text";

/**
 * Hint line for the active tool and hovered context menu items. Renders in its own placement slot.
 * The slot has a fixed height and keeps its place even when the hint is off,
 * so neighbouring islands never shift and the text never wraps or grows.
 */
export function Island_Hint({ placement }: { placement: HintPlacement; }) {
    const toolHint = useAtomValue(toolHintAtom);
    const menuHint = useAtomValue(menuHintAtom);
    const { prefs } = useSnapshot(appSettings);

    const showHere =
        prefs.hintPlacement === placement
        || (prefs.hintPlacement === HintPlacement.none && placement === HintPlacement.bottom && !!menuHint);

    if (!showHere) return null;

    const hint = menuHint ?? toolHint;

    return (
        <div className={cn(
            "select-none px-2 min-w-0 text-ui flex items-center",
            menuHint ? "text-muted-foreground" : "text-muted-foreground/60",
            placement === HintPlacement.top ? "h-6 w-full" : "h-9 w-full",
        )}>
            <div className="w-full text-center truncate">
                <HintText text={hint} />
            </div>
        </div>
    );
}
