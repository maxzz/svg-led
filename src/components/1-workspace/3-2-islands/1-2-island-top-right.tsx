import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { Code, Frame } from "lucide-react";
import { appSettings } from "@/store/1-ui-settings";
import { runCommandAtom } from "@/commands";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";
import { ViewBoxSettingsPopover } from "@/components/4-dialogs/8-5-viewbox-settings/0-viewbox-settings-dialog";

export function TopRightControls() {
    const { codePanel } = useSnapshot(appSettings);
    const run = useSetAtom(runCommandAtom);

    return (
        <Island className="pointer-events-auto">
            <ViewBoxSettingsPopover>
                <button className={islandButtonClasses} title="ViewBox settings" type="button">
                    <Frame className="size-4" />
                </button>
            </ViewBoxSettingsPopover>
            
            <button className={islandButtonClasses} data-active={codePanel.open} title="SVG source — Ctrl+B" onClick={() => run('view.codePanel')} type="button">
                <Code className="size-4" />
            </button>
        </Island>
    );
}
