import { CanvasRoot } from "../1-canvas/0-canvas-root";
import { Toolbar } from "../3-2-island-main-toolbar/0-toolbar";
import { TopRightControls } from "../3-1-islands/1-2-island-top-right";
import { PropertiesPopup } from "../2-props-panel/0-properties-popup";
import { SvgCodePanel } from "../5-svg-code-panel/0-svg-code-panel";

import { Island_MainMenu } from "../3-1-islands/1-1-island-main-menu";
import { Island_Zoom } from "../3-1-islands/2-1-island-zoom";
import { Island_Undo } from "../3-1-islands/2-2-island-undo";
import { Island_Help } from "../3-1-islands/2-3-island-help";

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
        <div className="absolute top-3 left-3 flex flex-col items-start gap-2 pointer-events-none">
            <Island_MainMenu />
            <PropertiesPopup />
        </div>

        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
            <Toolbar />
        </div>

        <div className="absolute top-3 right-3 pointer-events-none">
            <TopRightControls />
        </div>

        <div className="absolute bottom-3 left-3 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
                <Island_Zoom />
                <Island_Undo />
            </div>
        </div>

        <div className="absolute right-3 bottom-3 pointer-events-none">
            <Island_Help />
        </div>
    </>);
}
