import { useAtomValue } from "jotai";
import { toolHintAtom } from "../3-2-island-main-toolbar/9-atoms-toolbar";

/** Hint line under the toolbar for the active tool */
export function Island_Tool() {
    const hint = useAtomValue(toolHintAtom);

    return (
        <div className="select-none px-2 text-[11px] text-muted-foreground/80 text-center">
            {hint}
        </div>
    );
}
