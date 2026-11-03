import { type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { snapshot, useSnapshot } from "valtio";
import {
    ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine, ClipboardPaste, Combine, Copy, CopyPlus, Expand, FileCode, FlipHorizontal, FlipVertical, Group, ImageDown,
    Layers, Moon, MousePointer2, PaintBucket, Pipette, Radius, Scan, Scissors, Spline, SquareDashedMousePointer, Split, Trash, Ungroup, Waypoints,
} from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/ui/shadcn/context-menu";
import { appSettings } from "@/store/1-ui-settings";

import { ActionItem, CommandCheckItem, CommandItem, SEP, SubMenu, renderEntries } from "./8-context-menu-ui";
import { canvasMenuKindAtom } from "./9-context-menu-atoms";

import { type SvgDoc, type SvgNode, findNode, isCompoundPath, isShapeNode } from "@/svg-core";
import { docState, isPointEditable } from "@/store/3-document";
import { ToolId, copiedStyleAtom, selectedAnchorsAtom, selectionAtom, setActiveToolAtom } from "@/store/4-editor";
import { canIsolateSelectionAtom } from "@/store/6-layers";
import { deleteSelectedAnchors, toggleSelectedAnchors } from "@/tools/tool-3-points";

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
            {kind === 'canvas' && <Entries_Canvas />}
            {kind === 'elements' && <Entries_ToolSelection />}
            {kind === 'points' && <Entries_ToolPoints />}
        </ContextMenuContent>
    );
}

//---------------------------------------------------------------------------
// Empty canvas

function Entries_Canvas() {
    const selection = useAtomValue(selectionAtom);
    const { prefs } = useSnapshot(appSettings);

    return renderEntries([
        selection.length > 0 && <CommandItem id="edit.deselect" />,
        selection.length > 0 && SEP,

        <CommandItem id="file.pasteSvg" label="Paste" icon={<ClipboardPaste className={iconClasses} />} />,
        <CommandItem id="edit.copyDrawingPng" icon={<ImageDown className={iconClasses} />} />,
        <CommandItem id="edit.copySvg" icon={<FileCode className={iconClasses} />} />,
        <CommandItem id="file.copySource" label="Copy SVG source" icon={<Copy className={iconClasses} />} />,
        SEP,

        <CommandItem id="edit.selectAll" icon={<SquareDashedMousePointer className={iconClasses} />} />,
        SEP,

        <CommandCheckItem id="view.grid" label="Show grid" checked={prefs.showGrid} />,
        <CommandCheckItem id="view.snap" label="Snap to grid" checked={prefs.snapToGrid} />,
        <CommandCheckItem id="viewbox.toggle" label="Show viewBox" checked={prefs.showViewBox} />,
        <CommandItem id="view.theme" icon={<Moon className={iconClasses} />} />,
        SEP,

        <CommandItem id="view.zoomFit" />,
        <CommandItem id="view.zoomReset" />,
        <CommandItem id="viewbox.settings" />,
    ]);
}

//---------------------------------------------------------------------------
// Right-click on an element, or inside the bbox of the selection

function Entries_ToolSelection() {
    const selection = useAtomValue(selectionAtom);
    const copiedStyle = useAtomValue(copiedStyleAtom);
    const { prefs } = useSnapshot(appSettings);

    const doc = snapshot(docState).doc as SvgDoc;
    const nodes = selection.flatMap((id): SvgNode[] => { const n = findNode(doc, id)?.node; return n ? [n] : []; });
    const hasGroup = nodes.some((n) => n.kind === 'g');
    const hasShape = nodes.some((n) => isShapeNode(n));
    const hasPath = nodes.some((n) => n.kind === 'path');
    const hasCompound = nodes.some((n) => isCompoundPath(n));
    const canEditPoints = selection.length === 1 && isPointEditable(selection[0]);
    const canIsolate = useAtomValue(canIsolateSelectionAtom);

    return renderEntries([
        <CommandItem id="edit.cut" icon={<Scissors className={iconClasses} />} />,
        <CommandItem id="edit.copy" icon={<Copy className={iconClasses} />} />,
        <CommandItem id="file.pasteSvg" label="Paste" icon={<ClipboardPaste className={iconClasses} />} />,
        <CommandItem id="edit.copyPng" icon={<ImageDown className={iconClasses} />} />,
        <CommandItem id="edit.copySvg" icon={<FileCode className={iconClasses} />} />,
        SEP,

        <CommandItem id="edit.copyStyle" icon={<Pipette className={iconClasses} />} />,
        copiedStyle && <CommandItem id="edit.pasteStyle" icon={<PaintBucket className={iconClasses} />} />,
        SEP,

        selection.length > 1 && <CommandItem id="object.group" icon={<Group className={iconClasses} />} />,
        hasGroup && <CommandItem id="object.ungroup" icon={<Ungroup className={iconClasses} />} />,
        selection.length > 1 && <CommandItem id="object.makeCompound" icon={<Combine className={iconClasses} />} />,
        hasCompound && <CommandItem id="object.releaseCompound" icon={<Split className={iconClasses} />} />,
        hasShape && <CommandItem id="object.convertToPath" icon={<Spline className={iconClasses} />} />,
        hasPath && <CommandItem id="object.expand" icon={<Expand className={iconClasses} />} />,
        hasPath && <CommandItem id="object.offsetPath" icon={<Radius className={iconClasses} />} />,
        canEditPoints && <CommandItem id="object.editPoints" icon={<Waypoints className={iconClasses} />} />,
        canIsolate && <CommandItem id="object.isolate" icon={<Scan className={iconClasses} />} />,
        SEP,

        <SubMenu
            icon={<Layers className={iconClasses} />}
            label="Arrange"
            items={[
                <CommandItem id="object.front" icon={<ArrowUpToLine className={iconClasses} />} />,
                <CommandItem id="object.forward" icon={<ArrowUp className={iconClasses} />} />,
                <CommandItem id="object.backward" icon={<ArrowDown className={iconClasses} />} />,
                <CommandItem id="object.back" icon={<ArrowDownToLine className={iconClasses} />} />,
            ]}
        />,
        <CommandItem id="object.flipH" icon={<FlipHorizontal className={iconClasses} />} />,
        <CommandItem id="object.flipV" icon={<FlipVertical className={iconClasses} />} />,
        SEP,

        prefs.showViewBox && <CommandItem id="viewbox.fitSelection" />,
        <CommandItem id="view.zoomSelection" />,
        SEP,

        <CommandItem id="edit.duplicate" icon={<CopyPlus className={iconClasses} />} />,
        <CommandItem id="edit.delete" variant="destructive" icon={<Trash className={iconClasses} />} />,
    ]);
}

//---------------------------------------------------------------------------
// Points mode: the anchors of the selected paths

function Entries_ToolPoints() {
    const selection = useAtomValue(selectionAtom);
    const anchors = useAtomValue(selectedAnchorsAtom);
    const setAnchors = useSetAtom(selectedAnchorsAtom);
    const setTool = useSetAtom(setActiveToolAtom);
    const hasAnchors = anchors.length > 0;

    const doc = snapshot(docState).doc as SvgDoc;
    const hasPath = selection.some((id) => findNode(doc, id)?.node.kind === 'path');

    return renderEntries([
        hasAnchors && (
            <ActionItem
                icon={<Trash className={iconClasses} />}
                label="Delete points"
                shortcut="Del"
                variant="destructive"
                onSelect={() => { deleteSelectedAnchors(anchors); setAnchors([]); }}
            />
        ),
        hasAnchors && (
            <ActionItem
                icon={<Spline className={iconClasses} />}
                label="Smooth / corner"
                onSelect={() => toggleSelectedAnchors(anchors)}
            />
        ),
        hasAnchors && SEP,

        hasPath && <CommandItem id="object.expand" icon={<Expand className={iconClasses} />} />,
        hasPath && <CommandItem id="object.offsetPath" icon={<Radius className={iconClasses} />} />,
        hasPath && SEP,

        <ActionItem
            icon={<MousePointer2 className={iconClasses} />}
            label="Back to selection"
            shortcut="Esc"
            onSelect={() => setTool(ToolId.select)}
        />,
    ]);
}

const iconClasses = "size-4";
