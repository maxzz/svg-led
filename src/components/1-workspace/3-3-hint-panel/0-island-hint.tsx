import { useAtomValue } from "jotai";
import { toolHintAtom } from "../3-2-island-main-toolbar/9-atoms-toolbar";
import { HintText } from "./1-hint-text";

/** Hint line under the toolbar for the active tool */
export function Island_Hint() {
    const hint = useAtomValue(toolHintAtom);

    return (
        <div className="select-none px-2 text-[11px] text-muted-foreground/60 text-center">
            <HintText text={hint} />
        </div>
    );
}
