import { type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { snapshot, useSnapshot } from "valtio";
import {
    ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, ClipboardPaste, Copy, CopyPlus, FlipHorizontal, FlipVertical, Group, ImageDown,
    Layers, Moon, MousePointer2, PaintBucket, Pipette, Scissors, Spline, SquareDashedMousePointer, Trash, Ungroup, Waypoints,
} from "lucide-react";
import { appSettings } from "@/store/1-ui-settings";
import { type SvgDoc, type SvgNode, findNode, isShapeNode } from "@/svg-core";
import { docState, isPointEditable } from "@/store/3-document";
import { ToolId, copiedStyleAtom, selectedAnchorsAtom, selectionAtom, setActiveToolAtom } from "@/store/4-editor";
import { deleteSelectedAnchors, toggleSelectedAnchors } from "@/tools/points";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/ui/shadcn/context-menu";
import { canvasMenuKindAtom } from "./9-atoms-context-menu";
import { ActionItem, CommandCheckItem, CommandItem, SEP, SubMenu, renderEntries } from "./1-context-menu-items";

const ic = "size-4";

/**
 * Wraps the canvas. Right-click is handled by openCanvasMenuAtom on the canvas (it picks the menu kind);
 * Radix then opens the content, which renders the entries for that kind.
 */
export function CanvasContextMenu({ children }: { children: ReactNode; }) {
    return (
        <ContextMenu>
            <ContextMenuTrigger className="absolute inset-0">
                {children}
            </ContextMenuTrigger>
            <CanvasMenuContent />
        </ContextMenu>
    );
}

function CanvasMenuContent() {
    const kind = useAtomValue(canvasMenuKindAtom);
    return (
        <ContextMenuContent className="w-64">
            {kind === 'points' && <PointsEntries />}
            {kind === 'elements' && <ElementsEntries />}
            {kind === 'canvas' && <CanvasEntries />}
        </ContextMenuContent>
    );
}

//---------------------------------------------------------------------------
// Empty canvas

function CanvasEntries() {
    const selection = useAtomValue(selectionAtom);
    const { prefs } = useSnapshot(appSettings);

    return renderEntries([
        selection.length > 0 && <CommandItem id="edit.deselect" />,
        selection.length > 0 && SEP,

        <CommandItem id="file.pasteSvg" label="Paste" icon={<ClipboardPaste className={ic} />} />,
        <CommandItem id="edit.copyDrawingPng" icon={<ImageDown className={ic} />} />,
        <CommandItem id="file.copySource" label="Copy SVG source" icon={<Copy className={ic} />} />,
        SEP,

        <CommandItem id="edit.selectAll" icon={<SquareDashedMousePointer className={ic} />} />,
        SEP,

        <CommandCheckItem id="view.grid" label="Show grid" checked={prefs.showGrid} />,
        <CommandCheckItem id="view.snap" label="Snap to grid" checked={prefs.snapToGrid} />,
        <CommandCheckItem id="viewbox.toggle" label="Show viewBox" checked={prefs.showViewBox} />,
        <CommandItem id="view.theme" icon={<Moon className={ic} />} />,
        SEP,

        <CommandItem id="view.zoomFit" />,
        <CommandItem id="view.zoomReset" />,
        <CommandItem id="viewbox.settings" />,
    ]);
}

//---------------------------------------------------------------------------
// Right-click on an element, or inside the bbox of the selection

function ElementsEntries() {
    const selection = useAtomValue(selectionAtom);
    const copiedStyle = useAtomValue(copiedStyleAtom);

    const doc = snapshot(docState).doc as SvgDoc;
    const nodes = selection.flatMap((id): SvgNode[] => { const n = findNode(doc, id)?.node; return n ? [n] : []; });
    const hasGroup = nodes.some((n) => n.kind === 'g');
    const hasShape = nodes.some((n) => isShapeNode(n));
    const canEditPoints = selection.length === 1 && isPointEditable(selection[0]);

    return renderEntries([
        <CommandItem id="edit.cut" icon={<Scissors className={ic} />} />,
        <CommandItem id="edit.copy" icon={<Copy className={ic} />} />,
        <CommandItem id="file.pasteSvg" label="Paste" icon={<ClipboardPaste className={ic} />} />,
        <CommandItem id="edit.copyPng" icon={<ImageDown className={ic} />} />,
        SEP,

        <CommandItem id="edit.copyStyle" icon={<Pipette className={ic} />} />,
        copiedStyle && <CommandItem id="edit.pasteStyle" icon={<PaintBucket className={ic} />} />,
        SEP,

        selection.length > 1 && <CommandItem id="object.group" icon={<Group className={ic} />} />,
        hasGroup && <CommandItem id="object.ungroup" icon={<Ungroup className={ic} />} />,
        hasShape && <CommandItem id="object.convertToPath" icon={<Spline className={ic} />} />,
        canEditPoints && <CommandItem id="object.editPoints" icon={<Waypoints className={ic} />} />,
        SEP,

        <SubMenu
            icon={<Layers className={ic} />}
            label="Arrange"
            items={[
                <CommandItem id="object.front" icon={<ArrowUpToLine className={ic} />} />,
                <CommandItem id="object.forward" icon={<ArrowUp className={ic} />} />,
                <CommandItem id="object.backward" icon={<ArrowDown className={ic} />} />,
                <CommandItem id="object.back" icon={<ArrowDownToLine className={ic} />} />,
            ]}
        />,
        <CommandItem id="object.flipH" icon={<FlipHorizontal className={ic} />} />,
        <CommandItem id="object.flipV" icon={<FlipVertical className={ic} />} />,
        SEP,

        <CommandItem id="viewbox.fitSelection" />,
        <CommandItem id="view.zoomSelection" />,
        SEP,

        <CommandItem id="edit.duplicate" icon={<CopyPlus className={ic} />} />,
        <CommandItem id="edit.delete" variant="destructive" icon={<Trash className={ic} />} />,
    ]);
}

//---------------------------------------------------------------------------
// Points mode: the anchors of the selected paths

function PointsEntries() {
    const anchors = useAtomValue(selectedAnchorsAtom);
    const setAnchors = useSetAtom(selectedAnchorsAtom);
    const setTool = useSetAtom(setActiveToolAtom);
    const hasAnchors = anchors.length > 0;

    return renderEntries([
        hasAnchors && (
            <ActionItem
                icon={<Trash className={ic} />}
                label="Delete points"
                shortcut="Del"
                variant="destructive"
                onSelect={() => { deleteSelectedAnchors(anchors); setAnchors([]); }}
            />
        ),
        hasAnchors && (
            <ActionItem
                icon={<Spline className={ic} />}
                label="Smooth / corner"
                onSelect={() => toggleSelectedAnchors(anchors)}
            />
        ),
        hasAnchors && SEP,

        <ActionItem
            icon={<MousePointer2 className={ic} />}
            label="Back to selection"
            shortcut="Esc"
            onSelect={() => setTool(ToolId.select)}
        />,
    ]);
}
