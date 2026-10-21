import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { toolHintAtom } from "../3-2-island-main-toolbar/9-atoms-toolbar";
import { HintText } from "./1-hint-text";

/** Hint line under the toolbar for the active tool; hidden when the option is off */
export function Island_Hint() {
    const hint = useAtomValue(toolHintAtom);
    const { prefs } = useSnapshot(appSettings);

    if (!prefs.showHintIsland) return null;

    return (
        <div className="select-none px-2 text-[11px] text-muted-foreground/60 text-center">
            <HintText text={hint} />
        </div>
    );
}
