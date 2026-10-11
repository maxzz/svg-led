import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Code, Frame } from "lucide-react";
import { appSettings } from "@/store/1-ui-settings";
import { runCommandAtom } from "@/commands";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";

export function TopRightControls() {
    const { codePanel } = useSnapshot(appSettings);
    const run = useSetAtom(runCommandAtom);

    return (
        <Island className="pointer-events-auto">
            <button className={islandButtonClasses} title="ViewBox settings" onClick={() => run('viewbox.settings')} type="button">
                <Frame className="size-4" />
            </button>
            
            <button className={islandButtonClasses} data-active={codePanel.open} title="SVG source — Ctrl+B" onClick={() => run('view.codePanel')} type="button">
                <Code className="size-4" />
            </button>
        </Island>
    );
}
