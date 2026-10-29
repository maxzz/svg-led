import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/ui/shadcn/button";
import { X } from "lucide-react";
import { appSettings } from "@/store/1-ui-settings";

import { LayersTree } from "./1-0-layers-tree";
import { LayersBottomBar } from "./1-3-layers-bottom-bar";
import { LayersDragGhost, LayersDropIndicator, rowDragCancelAtom, rowDragMoveAtom, rowDragUpAtom } from "./2-reorder";
import { isLayersPanelResizingAtom, layersResizeDownAtom, layersResizeMoveAtom, layersResizeUpAtom } from "./9-atoms-layers-panel";

/** Layers of the document as a tree, slides out from the right edge */
export function LayersPanel() {
    const { layersPanel } = useSnapshot(appSettings);
    const resizing = useAtomValue(isLayersPanelResizingAtom);

    return (
        <AnimatePresence initial={false}>
            {layersPanel.open && (
                <motion.aside
                    className="relative shrink-0 h-full bg-background border-l overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: layersPanel.width }}
                    exit={{ width: 0 }}
                    transition={resizing ? { duration: 0 } : SLIDE}
                >
                    <div className="h-full flex flex-col" style={{ width: layersPanel.width }}>
                        <PanelHeader />

                        <TreeScroller />
                        
                        <LayersBottomBar />
                    </div>
                    <ResizeHandle />
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

const SLIDE = { type: 'spring', stiffness: 420, damping: 40 } as const;

//---------------------------------------------------------------------------

function PanelHeader() {
    return (
        <div className="shrink-0 px-3 h-7 border-b flex items-center gap-2">
            <span className="text-xs font-bold">Layers</span>
            <Button className="ml-auto" variant="ghost" size="icon-xs" onClick={() => { appSettings.layersPanel.open = false; }} title="Close — Ctrl+Shift+L">
                <X />
            </Button>
        </div>
    );
}

//---------------------------------------------------------------------------

/** Scrollable tree; rows start a reorder drag on pointer down, and this container follows it until the drop */
function TreeScroller() {
    const move = useSetAtom(rowDragMoveAtom);
    const up = useSetAtom(rowDragUpAtom);
    const cancel = useSetAtom(rowDragCancelAtom);

    return (
        <div
            className="relative grow min-h-0 overflow-y-auto overflow-x-hidden"
            data-layers-scroll
            onPointerMove={(e) => move({ pointerId: e.pointerId, buttons: e.buttons, clientX: e.clientX, clientY: e.clientY })}
            onPointerUp={() => up()}
            onPointerCancel={() => cancel()}
        >
            <LayersTree />
            <LayersDropIndicator />
            <LayersDragGhost />
        </div>
    );
}

//---------------------------------------------------------------------------

function ResizeHandle() {
    const down = useSetAtom(layersResizeDownAtom);
    const move = useSetAtom(layersResizeMoveAtom);
    const up = useSetAtom(layersResizeUpAtom);

    return (
        <div
            className="absolute top-0 left-0 w-1.5 h-full hover:bg-(--editor-accent)/30 active:bg-(--editor-accent)/50 transition-colors cursor-col-resize touch-none"
            onPointerDown={(e) => down({ clientX: e.clientX, pointerId: e.pointerId, target: e.currentTarget })}
            onPointerMove={(e) => move({ clientX: e.clientX })}
            onPointerUp={() => up()}
            onPointerCancel={() => up()}
        />
    );
}
