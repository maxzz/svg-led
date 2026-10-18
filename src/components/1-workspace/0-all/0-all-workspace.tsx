import { CanvasRoot } from "../1-canvas/0-canvas-root";
import { Toolbar } from "../3-1-island-main-toolbar/0-toolbar";
import { MainMenu } from "../3-1-island-main-toolbar/3-main-menu";
import { TopRightControls } from "../3-1-island-main-toolbar/4-top-right";
import { PropertiesPopup } from "../2-props-panel/0-properties-popup";
import { SvgCodePanel } from "../5-svg-code-panel/0-svg-code-panel";
import { ZoomUndoControls } from "../3-2-islands/1-island-zoom";
import { HelpButton } from "../3-2-islands/2-island-help";

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
            <MainMenu />
            <PropertiesPopup />
        </div>

        <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
            <Toolbar />
        </div>

        <div className="absolute top-3 right-3 pointer-events-none">
            <TopRightControls />
        </div>

        <div className="absolute bottom-3 left-3 pointer-events-none">
            <ZoomUndoControls />
        </div>

        <div className="absolute right-3 bottom-3 pointer-events-none">
            <HelpButton />
        </div>
    </>);
}
