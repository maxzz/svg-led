import { useAtomValue, useSetAtom } from "jotai";
import { Lock, LockOpen } from "lucide-react";
import { toolLockedAtom } from "@/store/4-editor";
import { TOOLS } from "@/tools";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";
import { Island_MainMenu } from "./1-2-menu-main";
import { ToolButton } from "./8-tool-button";
import { MoreMenu } from "./1-1-menu-more-tools";
import { ToolHint } from "../3-3-hint-panel/0-hint-panel";
import { toggleToolLockAtom } from "./9-atoms-toolbar";

export function Island_MainToolbar() {
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
                <Island_MainMenu />
            </Island>

            <ToolHint />
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
