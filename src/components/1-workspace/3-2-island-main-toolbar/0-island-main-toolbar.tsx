import { useAtomValue, useSetAtom } from "jotai";
import { Lock, LockOpen } from "lucide-react";
import { toolLockedAtom } from "@/store/4-editor";
import { TOOLS } from "@/tools";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";
import { ToolButton } from "./1-tool-button";
import { MoreMenu } from "./2-more-menu";
import { toggleToolLockAtom, toolHintAtom } from "./9-atoms-toolbar";

export function Island_MainToolbar() {
    const hint = useAtomValue(toolHintAtom);

    return (
        <div className="flex flex-col items-center gap-2 pointer-events-none">
            <Island className="pointer-events-auto">
                <LockButton />
                <div className="mx-1 w-px h-6 bg-border" />
                {TOOLS.map(
                    (tool) => <ToolButton tool={tool} key={tool.id} />
                )}
                <div className="mx-1 w-px h-6 bg-border" />
                <MoreMenu />
            </Island>

            <div className="select-none px-2 text-[11px] text-muted-foreground/80 text-center">
                {hint}
            </div>
        </div>
    );
}

function LockButton() {
    const locked = useAtomValue(toolLockedAtom);
    const toggle = useSetAtom(toggleToolLockAtom);
    return (
        <button
            className={islandButtonClasses}
            data-active={locked}
            title="Keep the selected tool active after drawing"
            onClick={toggle}
            type="button"
        >
            {locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
        </button>
    );
}
