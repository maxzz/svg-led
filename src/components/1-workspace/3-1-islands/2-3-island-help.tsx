import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { CircleQuestionMark, Code, Layers } from "lucide-react";
import { appSettings } from "@/store/1-ui-settings";
import { runCommandAtom } from "@/commands";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";
import { IconViewBoxSettings, viewBoxActiveClasses } from "@/ui/icons/normal/svg-led";
import { ViewBoxSettingsPopover } from "@/components/4-dialogs/8-5-viewbox-settings/0-viewbox-settings-dialog";
import { ViewBoxDimsLabel } from "./2-4-viewbox-dims-label";

export function Island_Help() {
    const { codePanel, layersPanel, prefs } = useSnapshot(appSettings);
    const run = useSetAtom(runCommandAtom);
    
    return (
        <Island className="pointer-events-auto">
            <ViewBoxDimsLabel />

            <ViewBoxSettingsPopover>
                <button className={islandButtonClasses} title="ViewBox settings" type="button">
                    <IconViewBoxSettings className="size-4.5" activeClasses={prefs.showViewBox ? viewBoxActiveClasses : undefined} />
                </button>
            </ViewBoxSettingsPopover>

            <button className={islandButtonClasses} data-active={codePanel.open} title="SVG source — Ctrl+B" onClick={() => run('view.codePanel')} type="button">
                <Code className="size-4" />
            </button>

            <button className={islandButtonClasses} data-active={layersPanel.open} title="Layers — Ctrl+Shift+L" onClick={() => run('view.layersPanel')} type="button">
                <Layers className="size-4" />
            </button>

            <button className={islandButtonClasses} title="Help — ?" onClick={() => run('help.shortcuts')} type="button">
                <CircleQuestionMark className="size-4" />
            </button>
        </Island>
    );
}
