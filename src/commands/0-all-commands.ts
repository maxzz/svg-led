import { toast } from "sonner";
import { isShapeNode } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import {
    type FileResult, commitHistory, convertToPath, copyPngToClipboard, copySvgToClipboard, createEmptyDoc, deleteNodes, docState, docToText, duplicateNodes,
    exportPng, exportSvgDownload, flipNodes, getNodeProxy, groupNodes, historyState, isPointEditable, moveNodes,
    nodesToText, openSvgFile, readNodeStyle, reorderNodes, saveSvgFile, saveSvgFileAs, ungroupNodes, writeNodesStyle,
    canExpandPaths, expandPaths,
    canMakeCompoundPath, makeCompoundPath, canReleaseCompoundPath, releaseCompoundPaths,
} from "@/store/3-document";
import {
    ToolId, activeToolIdAtom, copiedStyleAtom, redoAtom, selectionAtom, setActiveToolAtom, setSelectionAtom, undoAtom, zoomByAtom,
    zoomResetAtom, zoomToFitAtom, zoomToSelectionAtom,
} from "@/store/4-editor";
import {
    exitIsolationToAtom, getIsolationScope, hasHidden, hasLocked, hideSelectionAtom, insertMarkupAtTop, isPickable, isolateSelectionAtom,
    isolationRootChildren, lockSelectionAtom, selectionCanIsolate, showAllAtom, unlockAllAtom,
} from "@/store/6-layers";
import { TOOLS } from "@/tools";
import { sourceTextForSave } from "@/store/5-controllers";
import { doAsyncExecuteConfirmDialogAtom } from "@/components/4-dialogs/8-1-confirmation/9-types-confirmation";
import { fitViewBoxDialogAtom } from "@/components/4-dialogs/8-4-fit-viewbox/9-types-fit-viewbox";
import { isOpenViewBoxSettingsDialogAtom } from "@/components/4-dialogs/8-5-viewbox-settings/a-types-viewbox-settings";
import { isOpenShortcutsHelpDialogAtom } from "@/components/4-dialogs/8-6-shortcuts-help/9-types-shortcuts-help";
import { isOpenCommandPaletteAtom } from "@/components/4-dialogs/8-7-command-palette/9-types-command-palette";
import { isOpenFindOnCanvasAtom } from "@/components/4-dialogs/8-8-find-on-canvas/9-types-find-on-canvas";
import { isOpenOptionsDialogAtom } from "@/components/4-dialogs/8-3-options/9-types-options";
import { isOpenScrapsDialogAtom } from "@/components/4-dialogs/8-9-scraps/9-types-scraps";
import { openOffsetPathDialogAtom } from "@/components/4-dialogs/8-10-offset-path/9-atoms-offset-path";
import { PROPERTIES_POPUP_RIGHT_EDGE_PX } from "@/components/1-workspace/2-props-panel/9-atoms-properties-popup";
import { renameSelectionAtom } from "@/components/1-workspace/6-layers-panel/3-rename/9-atoms-rename";
import { type Command } from "./9-command-types";

const hasSelection = (get: Parameters<NonNullable<Command['enabled']>>[0]) => get(selectionAtom).length > 0;

function reportFile(rv: FileResult, okMessage?: string) {
    if (rv.ok) {
        okMessage && toast.success(okMessage);
    } else if ('error' in rv) {
        toast.error(rv.error);
    }
}

const FILE: Command[] = [
    {
        id: 'file.open', label: 'Open...', group: 'file', shortcut: 'Ctrl+O',
        description: 'Open an SVG file from disk',
        run: async ({ set }) => {
            const rv = await openSvgFile();
            if (rv.ok) {
                set(setSelectionAtom, []);
                set(zoomToFitAtom);
            }
            reportFile(rv);
        },
    },
    { id: 'file.save', label: 'Save', group: 'file', shortcut: 'Ctrl+S', description: 'Save changes to the current SVG file', run: async () => reportFile(await saveSvgFile(sourceTextForSave()), 'Saved') },
    { id: 'file.saveAs', label: 'Save as...', group: 'file', shortcut: 'Ctrl+Shift+S', description: 'Save the SVG document to a new file', run: async () => reportFile(await saveSvgFileAs(sourceTextForSave()), 'Saved') },
    { id: 'file.exportSvg', label: 'Export SVG', group: 'file', description: 'Download the drawing as an SVG file', run: () => exportSvgDownload(sourceTextForSave()) },
    { id: 'file.exportPng1', label: 'Export PNG (1x)', group: 'file', shortcut: 'Ctrl+Shift+E', description: 'Export the drawing as a 1x PNG image', run: async () => reportFile(await exportPng(1)) },
    { id: 'file.exportPng2', label: 'Export PNG (2x)', group: 'file', description: 'Export the drawing as a 2x PNG image', run: async () => reportFile(await exportPng(2)) },
    { id: 'file.exportPng4', label: 'Export PNG (4x)', group: 'file', description: 'Export the drawing as a 4x PNG image', run: async () => reportFile(await exportPng(4)) },
    {
        id: 'file.copySource', label: 'Copy SVG source', group: 'file',
        description: 'Copy the full SVG document source code to the clipboard',
        run: async () => {
            await navigator.clipboard.writeText(docToText());
            toast.success('SVG source copied');
        },
    },
    {
        id: 'file.pasteSvg', label: 'Paste SVG from clipboard', group: 'file', keywords: 'import insert',
        description: 'Insert SVG markup from the clipboard onto the canvas',
        run: async ({ get, set }) => {
            try {
                const ids = insertMarkupAtTop(get, await navigator.clipboard.readText());
                ids ? set(setSelectionAtom, ids) : toast.error('The clipboard does not contain SVG markup');
            } catch (e) {
                toast.error(String(e));
            }
        },
    },
    { id: 'file.scraps', label: 'Scraps...', group: 'file', shortcut: 'Ctrl+E', keywords: 'saved snippets library storage load', description: 'Open the saved SVG scraps library', run: ({ set }) => set(isOpenScrapsDialogAtom, true) },
    {
        id: 'file.reset', label: 'Reset the canvas', group: 'file', keywords: 'new clear',
        description: 'Clear the canvas and start a new empty document',
        run: async ({ set }) => {
            const ok = await set(doAsyncExecuteConfirmDialogAtom, {
                title: 'Reset the canvas',
                message: 'This removes everything from the canvas. You can undo it with Ctrl+Z.',
                buttonOk: 'Reset',
                buttonCancel: 'Cancel',
            });
            if (ok) {
                docState.doc = createEmptyDoc();
                docState.fileName = 'untitled.svg';
                commitHistory({ origin: 'load' });
                set(setSelectionAtom, []);
                set(zoomToFitAtom);
            }
        },
    },
];

const EDIT: Command[] = [
    { id: 'edit.undo', label: 'Undo', group: 'edit', shortcut: 'Ctrl+Z', description: 'Undo the last change', enabled: () => historyState.index > 0, run: ({ set }) => set(undoAtom) },
    { id: 'edit.redo', label: 'Redo', group: 'edit', shortcut: 'Ctrl+Shift+Z', alsoKeys: ['Ctrl+Y'], description: 'Redo the previously undone change', enabled: () => historyState.index < historyState.length - 1, run: ({ set }) => set(redoAtom) },
    {
        id: 'edit.delete', label: 'Delete', group: 'edit', shortcut: 'Delete', alsoKeys: ['Backspace'], enabled: hasSelection,
        description: 'Remove the selected elements from the canvas',
        run: ({ get, set }) => {
            deleteNodes(get(selectionAtom));
            set(setSelectionAtom, []);
        },
    },
    {
        id: 'edit.duplicate', label: 'Duplicate', group: 'edit', shortcut: 'Ctrl+D', enabled: hasSelection,
        description: 'Create an offset copy of the selected elements',
        run: ({ get, set }) => {
            const ids = duplicateNodes(get(selectionAtom), 10);
            set(setSelectionAtom, ids);
            commitHistory(); // duplicateNodes does not commit because Alt+drag commits after the move
        },
    },
    // Cut and Copy have no shortcut here: the native clipboard events (see store/5-controllers/3-clipboard.ts) handle Ctrl+X and Ctrl+C
    {
        id: 'edit.cut', label: 'Cut', group: 'edit', enabled: hasSelection,
        description: 'Copy the selected elements as SVG and remove them from the canvas',
        run: async ({ get, set }) => {
            const ids = get(selectionAtom);
            try {
                await navigator.clipboard.writeText(nodesToText(ids));
            } catch (e) {
                toast.error(String(e));
                return;
            }
            deleteNodes(ids);
            set(setSelectionAtom, []);
        },
    },
    {
        id: 'edit.copy', label: 'Copy', group: 'edit', enabled: hasSelection,
        description: 'Copy the selected elements as SVG to the clipboard',
        run: async ({ get }) => {
            try {
                await navigator.clipboard.writeText(nodesToText(get(selectionAtom)));
            } catch (e) {
                toast.error(String(e));
            }
        },
    },
    {
        id: 'edit.copyPng', label: 'Copy to clipboard as PNG', group: 'edit', enabled: hasSelection, keywords: 'image bitmap',
        description: 'Render the selected elements as a PNG image to the clipboard',
        run: async ({ get }) => reportFile(await copyPngToClipboard(get(selectionAtom)), 'PNG copied'),
    },
    {
        id: 'edit.copyDrawingPng', label: 'Copy drawing as PNG', group: 'edit', keywords: 'image bitmap all',
        description: 'Render the whole drawing as a PNG image to the clipboard',
        run: async () => reportFile(await copyPngToClipboard(), 'PNG copied'),
    },
    {
        id: 'edit.copySvg', label: 'Copy to clipboard as SVG', group: 'edit', keywords: 'vector markup source all',
        description: 'Copy the selected elements, or the whole drawing, as SVG to the clipboard',
        run: async ({ get }) => reportFile(
            await copySvgToClipboard(get(selectionAtom), { useViewBox: appSettings.prefs.showViewBox }),
            'SVG copied',
        ),
    },
    {
        id: 'edit.copyStyle', label: 'Copy style', group: 'edit', enabled: hasSelection, keywords: 'fill stroke attributes',
        description: 'Copy fill, stroke, and opacity from the first selected element',
        run: ({ get, set }) => {
            const style = readNodeStyle(get(selectionAtom)[0]);
            style && set(copiedStyleAtom, style);
        },
    },
    {
        id: 'edit.pasteStyle', label: 'Paste style', group: 'edit', keywords: 'fill stroke attributes',
        description: 'Apply the copied fill, stroke, and opacity to the selected elements',
        enabled: (get) => hasSelection(get) && get(copiedStyleAtom) !== null,
        run: ({ get }) => {
            const style = get(copiedStyleAtom);
            style && writeNodesStyle(get(selectionAtom), style);
        },
    },
    {
        id: 'edit.selectAll', label: 'Select all', group: 'edit', shortcut: 'Ctrl+A',
        description: 'Select all pickable elements in the current scope',
        run: ({ get, set }) => {
            set(setActiveToolAtom, ToolId.select);
            const isolated = getIsolationScope(get);
            const doc = docState.doc;
            set(setSelectionAtom, isolationRootChildren(doc, isolated).map((n) => n.id).filter((id) => isPickable(doc, id, isolated)));
        },
    },
    { id: 'edit.deselect', label: 'Deselect', group: 'edit', description: 'Clear the current selection', enabled: hasSelection, run: ({ set }) => set(setSelectionAtom, []) },
];

const OBJECT: Command[] = [
    {
        id: 'object.group', label: 'Group', group: 'object', shortcut: 'Ctrl+G', enabled: (get) => get(selectionAtom).length > 0,
        description: 'Combine the selected elements into a group',
        run: ({ get, set }) => {
            const id = groupNodes(get(selectionAtom));
            id ? set(setSelectionAtom, [id]) : toast.info('Only elements with the same parent can be grouped');
        },
    },
    {
        id: 'object.ungroup', label: 'Ungroup', group: 'object', shortcut: 'Ctrl+Shift+G', enabled: hasSelection,
        description: 'Dissolve the selected groups and keep their child elements',
        run: ({ get, set }) => set(setSelectionAtom, ungroupNodes(get(selectionAtom))),
    },
    {
        id: 'object.makeCompound', label: 'Make compound path', group: 'object', keywords: 'combine join holes',
        description: 'Combine the selected shapes and paths into one compound path',
        enabled: (get) => canMakeCompoundPath(get(selectionAtom)),
        run: ({ get, set }) => {
            const id = makeCompoundPath(get(selectionAtom));
            id && set(setSelectionAtom, [id]);
        },
    },
    {
        id: 'object.releaseCompound', label: 'Release compound path', group: 'object', keywords: 'split separate subpaths',
        description: 'Split compound paths back into separate path elements',
        enabled: (get) => canReleaseCompoundPath(get(selectionAtom)),
        run: ({ get, set }) => {
            const ids = releaseCompoundPaths(get(selectionAtom));
            ids.length && set(setSelectionAtom, ids);
        },
    },
    {
        id: 'object.convertToPath', label: 'Convert to path', group: 'object', shortcut: 'Ctrl+Shift+P', keywords: 'outline',
        description: 'Convert basic shapes into editable paths',
        enabled: (get) => get(selectionAtom).some((id) => { const n = getNodeProxy(id); return !!n && isShapeNode(n); }),
        run: ({ get }) => convertToPath(get(selectionAtom)),
    },
    {
        id: 'object.expand', label: 'Expand', group: 'object', keywords: 'stroke outline fill appearance',
        description: 'Outline stroked paths into filled shapes',
        enabled: (get) => canExpandPaths(get(selectionAtom)),
        run: ({ get, set }) => {
            const prev = get(selectionAtom);
            const next = expandPaths(prev);
            if (next && (next.length !== prev.length || next.some((id, i) => id !== prev[i]))) {
                set(setSelectionAtom, next);
            }
        },
    },
    {
        id: 'object.offsetPath', label: 'Offset path...', group: 'object', keywords: 'outset inset parallel miter round',
        description: 'Create an outset or inset contour parallel to the selected paths',
        enabled: (get) => get(selectionAtom).some((id) => getNodeProxy(id)?.kind === 'path'),
        run: ({ set }) => set(openOffsetPathDialogAtom),
    },
    { id: 'object.front', label: 'Bring to front', group: 'object', shortcut: 'Ctrl+Shift+]', description: 'Move the selected elements in front of all siblings', enabled: hasSelection, run: ({ get }) => reorderNodes(get(selectionAtom), 'front') },
    { id: 'object.forward', label: 'Bring forward', group: 'object', shortcut: 'Ctrl+]', description: 'Move the selected elements one step forward', enabled: hasSelection, run: ({ get }) => reorderNodes(get(selectionAtom), 'forward') },
    { id: 'object.backward', label: 'Send backward', group: 'object', shortcut: 'Ctrl+[', description: 'Move the selected elements one step backward', enabled: hasSelection, run: ({ get }) => reorderNodes(get(selectionAtom), 'backward') },
    { id: 'object.back', label: 'Send to back', group: 'object', shortcut: 'Ctrl+Shift+[', description: 'Move the selected elements behind all siblings', enabled: hasSelection, run: ({ get }) => reorderNodes(get(selectionAtom), 'back') },
    { id: 'object.flipH', label: 'Flip horizontal', group: 'object', keywords: 'mirror', description: 'Mirror the selected elements horizontally', enabled: hasSelection, run: ({ get }) => flipNodes(get(selectionAtom), 'x') },
    { id: 'object.flipV', label: 'Flip vertical', group: 'object', keywords: 'mirror', description: 'Mirror the selected elements vertically', enabled: hasSelection, run: ({ get }) => flipNodes(get(selectionAtom), 'y') },
    {
        id: 'object.editPoints', label: 'Edit points', group: 'object', keywords: 'direct selection anchors handles',
        description: 'Switch to Direct selection to edit anchor points and handles',
        enabled: (get) => { const ids = get(selectionAtom); return ids.length === 1 && isPointEditable(ids[0]); },
        run: ({ set }) => set(setActiveToolAtom, ToolId.points),
    },
    {
        id: 'object.isolate', label: 'Enter isolation mode', group: 'object', keywords: 'isolate group object element edit inside layers',
        description: 'Focus on the selected element and dim everything outside it',
        enabled: (get) => selectionCanIsolate(get),
        run: ({ set }) => set(isolateSelectionAtom),
    },
    {
        id: 'object.exitIsolation', label: 'Exit isolation mode', group: 'object', keywords: 'isolate leave group layers',
        description: 'Leave isolation mode and return to the parent scope',
        enabled: (get) => getIsolationScope(get).length > 0, run: ({ set }) => { set(exitIsolationToAtom, null); },
    },
    { id: 'object.hide', label: 'Hide selection', group: 'object', shortcut: 'Ctrl+Shift+H', keywords: 'visibility layers', description: 'Hide the selected elements on the canvas', enabled: hasSelection, run: ({ set }) => set(hideSelectionAtom) },
    { id: 'object.showAll', label: 'Show all', group: 'object', keywords: 'visibility unhide layers', description: 'Make all hidden layers visible again', enabled: () => hasHidden(docState.doc), run: ({ set }) => set(showAllAtom) },
    { id: 'object.lock', label: 'Lock selection', group: 'object', shortcut: 'Ctrl+Shift+K', keywords: 'padlock layers', description: 'Lock the selected elements against editing on the canvas', enabled: hasSelection, run: ({ set }) => set(lockSelectionAtom) },
    { id: 'object.unlockAll', label: 'Unlock all', group: 'object', keywords: 'padlock layers', description: 'Unlock all locked layers in the document', enabled: () => hasLocked(docState.doc), run: ({ set }) => set(unlockAllAtom) },
    { id: 'object.rename', label: 'Rename layer', group: 'object', shortcut: 'F2', keywords: 'id name layers', description: 'Edit the id of the selected layer', enabled: (get) => get(selectionAtom).length === 1, run: ({ set }) => set(renameSelectionAtom) },
];

const VIEWBOX: Command[] = [
    { id: 'viewbox.fitSelection', label: 'Fit selection to viewBox...', group: 'viewbox', shortcut: 'Ctrl+Alt+F', keywords: 'scale padding', description: 'Scale and move the selection to fit inside the viewBox', enabled: hasSelection, run: ({ set }) => set(fitViewBoxDialogAtom, 'selection-into-viewbox'), },
    { id: 'viewbox.toSelection', label: 'Fit viewBox to selection...', group: 'viewbox', description: 'Resize the viewBox around the selected elements', enabled: hasSelection, run: ({ set }) => set(fitViewBoxDialogAtom, 'viewbox-to-selection'), },
    { id: 'viewbox.toContent', label: 'Fit viewBox to content...', group: 'viewbox', description: 'Resize the viewBox around all elements in the drawing', run: ({ set }) => set(fitViewBoxDialogAtom, 'viewbox-to-content') },
    { id: 'viewbox.settings', label: 'ViewBox settings...', group: 'viewbox', description: 'Open viewBox, grid, and snapping settings', run: ({ set }) => set(isOpenViewBoxSettingsDialogAtom, true) },
    { id: 'viewbox.toggle', label: 'Show viewBox', group: 'viewbox', description: 'Show or hide the viewBox frame and dim outside areas', run: () => { appSettings.prefs.showViewBox = !appSettings.prefs.showViewBox; } },
];

const VIEW: Command[] = [
    { id: 'view.zoomIn', label: 'Zoom in', group: 'view', shortcut: 'Ctrl+=', alsoKeys: ['Ctrl+Shift+='], description: 'Zoom in closer on the canvas', run: ({ set }) => set(zoomByAtom, { factor: 1.25 }) },
    { id: 'view.zoomOut', label: 'Zoom out', group: 'view', shortcut: 'Ctrl+-', alsoKeys: ['Ctrl+Shift+-'], description: 'Zoom out on the canvas', run: ({ set }) => set(zoomByAtom, { factor: 0.8 }) },
    { id: 'view.zoomReset', label: 'Zoom to 100%', group: 'view', shortcut: 'Ctrl+0', description: 'Reset the canvas zoom to 100%', run: ({ set }) => set(zoomResetAtom) },
    {
        id: 'view.zoomFit', label: 'Zoom to fit all', group: 'view', shortcut: 'Shift+1',
        description: 'Zoom and center the view to fit the whole drawing',
        run: ({ set }) => {
            set(zoomToFitAtom, { leftInset: appSettings.prefs.fitAvoidsProperties ? PROPERTIES_POPUP_RIGHT_EDGE_PX : 0 });
        },
    },
    { id: 'view.zoomSelection', label: 'Zoom to selection', group: 'view', shortcut: 'Shift+2', description: 'Zoom and center the view on the selected elements', run: ({ set }) => set(zoomToSelectionAtom) },
    { id: 'view.grid', label: 'Toggle grid', group: 'view', shortcut: "Ctrl+'", description: 'Show or hide the background grid in document units', run: () => { appSettings.prefs.showGrid = !appSettings.prefs.showGrid; } },
    { id: 'view.snap', label: 'Toggle snap to grid', group: 'view', description: 'Snap dragged points and elements to the grid lines', run: () => { appSettings.prefs.snapToGrid = !appSettings.prefs.snapToGrid; } },
    { id: 'view.codePanel', label: 'Toggle SVG source panel', group: 'view', shortcut: 'Ctrl+B', keywords: 'code monaco editor', description: 'Show or hide the SVG source code panel', run: () => { appSettings.codePanel.open = !appSettings.codePanel.open; } },
    { id: 'view.layersPanel', label: 'Toggle Layers panel', group: 'view', shortcut: 'Ctrl+Shift+L', keywords: 'tree hierarchy groups', description: 'Show or hide the Layers hierarchy panel', run: () => { appSettings.layersPanel.open = !appSettings.layersPanel.open; } },
    { id: 'view.theme', label: 'Toggle dark theme', group: 'view', description: 'Switch between light and dark editor themes', run: () => { appSettings.theme = appSettings.theme === 'dark' ? 'light' : 'dark'; }, },
];

const HELP: Command[] = [
    { id: 'help.palette', label: 'Command palette', group: 'help', shortcut: 'Ctrl+/', description: 'Search and run any editor command', run: ({ set }) => set(isOpenCommandPaletteAtom, true) },
    { id: 'help.find', label: 'Find on canvas', group: 'help', shortcut: 'Ctrl+F', description: 'Find and select elements by id, tag, or style', run: ({ set }) => set(isOpenFindOnCanvasAtom, true) },
    { id: 'help.shortcuts', label: 'Help and keyboard shortcuts', group: 'help', shortcut: '?', description: 'Open the keyboard shortcuts reference', run: ({ set }) => set(isOpenShortcutsHelpDialogAtom, true) },
    { id: 'help.options', label: 'Options...', group: 'help', shortcut: 'Ctrl+,', keywords: 'settings preferences welcome', description: 'Open editor preferences and appearance options', run: ({ set }) => set(isOpenOptionsDialogAtom, true) },
];

const TOOL_COMMANDS: Command[] = TOOLS.map((tool) => (
    {
        id: `tool.${tool.id}`, label: `${tool.label} tool`, group: 'tools', shortcut: tool.shortcut.toUpperCase(),
        description: `Switch to the ${tool.label} tool`,
        enabled: (get) => get(activeToolIdAtom) !== tool.id, run: ({ set }) => set(setActiveToolAtom, tool.id),
    }
));

//---------------------------------------------------------------------------

export const COMMANDS: readonly Command[] = [...FILE, ...EDIT, ...OBJECT, ...VIEWBOX, ...VIEW, ...HELP, ...TOOL_COMMANDS];

const byId = new Map(COMMANDS.map((c) => [c.id, c]));

export function getCommand(id: string): Command | undefined {
    return byId.get(id);
}

//---------------------------------------------------------------------------

export function nudgeSelection(ids: string[], key: string, big: boolean): boolean {
    const dir = NUDGE_KEYS[key];
    if (!dir || !ids.length) {
        return false;
    }
    const step = big ? 10 : 1;
    moveNodes(ids, dir[0] * step, dir[1] * step);
    return true;
}

const NUDGE_KEYS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};

//---------------------------------------------------------------------------
