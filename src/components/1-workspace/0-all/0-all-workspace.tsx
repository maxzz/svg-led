import { HintPlacement } from "@/store/1-ui-settings";
import { CanvasRoot } from "../1-canvas/0-canvas-root";
import { SvgCodePanel } from "../5-svg-code-panel/0-svg-code-panel";

import { Island_PropertiesPopup } from "../2-props-panel/0-island-properties-popup";
import { Island_MainToolbar } from "../3-2-island-main-toolbar/0-island-main-toolbar";
import { Island_Zoom } from "../3-1-islands/2-1-island-zoom";
import { Island_Undo } from "../3-1-islands/2-2-island-undo";
import { Island_Help } from "../3-1-islands/2-3-island-help";
import { Island_Hint } from "../3-3-hint-panel/0-island-hint";
/** The whole editor: code panel on the left, then the canvas with floating UI on top of it */
export function Workspace() {
    return (
        <div className="relative h-dvh text-xs text-foreground bg-background overflow-hidden flex">
            <SvgCodePanel />

            <div className="relative grow min-w-0">
                <CanvasRoot />
                <FloatingUi />
            </div>
        </div>
    );
}

function FloatingUi() {
    return (<>
        <div className="absolute top-3 inset-x-3 flex flex-col gap-2 pointer-events-none">
            <div className="flex flex-col items-center gap-2 pointer-events-none">
                <Island_MainToolbar />
                <Island_Hint placement={HintPlacement.top} />
            </div>

            <Island_PropertiesPopup />
        </div>

        {/* Bottom row: the hint takes the free space between the two islands, so they can't overlap */}
        <div className="absolute bottom-3 inset-x-3 flex items-end gap-2 pointer-events-none">
            <div className="shrink-0 flex items-center gap-2 pointer-events-auto">
                <Island_Zoom />
                <Island_Undo />
            </div>

            <Island_Hint placement={HintPlacement.bottom} />

            <div className="shrink-0">
                <Island_Help />
            </div>
        </div>
    </>);
}
