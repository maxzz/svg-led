import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { classNames } from "@/utils";
import { GridLayer } from "./1-grid-layer";
import { DocLayer } from "./2-doc-layer/0-doc-layer";
import { OverlayLayer } from "./3-overlay";
import { CanvasContextMenu } from "./4-context-menu/0-canvas-context-menu";
import { openCanvasMenuAtom } from "./4-context-menu/9-atoms-context-menu";
import {
    canvasCursorAtom, canvasDragOver, canvasDropAtom, canvasPointerDownAtom, canvasPointerLeaveAtom, canvasPointerMoveAtom,
    canvasPointerUpAtom, canvasReadyAtom, canvasRef,
} from "./9-atoms-canvas-root";

export function CanvasRoot() {
    const cursor = useAtomValue(canvasCursorAtom);
    const ready = useAtomValue(canvasReadyAtom);
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
                className={classNames(
                    "absolute inset-0 select-none size-full bg-background touch-none transition-opacity duration-500 ease-out",
                    ready ? "opacity-100" : "opacity-0",
                )}
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
