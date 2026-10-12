import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { GridLayer } from "./1-grid-layer";
import { DocLayer } from "./2-doc-layer/0-doc-layer";
import { OverlayLayer } from "./3-overlay";
import { CanvasContextMenu } from "./4-context-menu/0-canvas-context-menu";
import { openCanvasMenuAtom } from "./4-context-menu/9-atoms-context-menu";
import {
    canvasCursorAtom, canvasDragOver, canvasDropAtom, canvasPointerDownAtom, canvasPointerLeaveAtom, canvasPointerMoveAtom,
    canvasPointerUpAtom, canvasRef,
} from "./9-atoms-canvas-root";

export function CanvasRoot() {
    const cursor = useAtomValue(canvasCursorAtom);
    const { canvasBackground } = useSnapshot(appSettings);

    const onPointerDown = useSetAtom(canvasPointerDownAtom);
    const onPointerMove = useSetAtom(canvasPointerMoveAtom);
    const onPointerUp = useSetAtom(canvasPointerUpAtom);
    const onPointerLeave = useSetAtom(canvasPointerLeaveAtom);
    const onDrop = useSetAtom(canvasDropAtom);
    const onContextMenu = useSetAtom(openCanvasMenuAtom);

    return (
        <CanvasContextMenu>
            <svg
                ref={canvasRef}
                className="absolute inset-0 select-none size-full bg-background touch-none"
                style={{ cursor, backgroundColor: canvasBackground || undefined }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onPointerLeave={onPointerLeave}
                onDragOver={canvasDragOver}
                onDrop={onDrop}
                onContextMenu={onContextMenu}
            >
                <GridLayer />
                <DocLayer />
                <OverlayLayer />
            </svg>
        </CanvasContextMenu>
    );
}
