import { toast } from "sonner";
import { isShapeNode } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import {
    type FileResult, commitHistory, convertToPath, copyPngToClipboard, createEmptyDoc, deleteNodes, docState, docToText, duplicateNodes,
    exportPng, exportSvgDownload, flipNodes, getNodeProxy, groupNodes, historyState, insertSvgMarkup, isPointEditable, moveNodes,
    nodesToText, openSvgFile, readNodeStyle, reorderNodes, saveSvgFile, saveSvgFileAs, topLevelIds, ungroupNodes, writeNodesStyle,
} from "@/store/3-document";
import {
    ToolId, activeToolIdAtom, copiedStyleAtom, redoAtom, selectionAtom, setActiveToolAtom, setSelectionAtom, undoAtom, zoomByAtom,
    zoomResetAtom, zoomToFitAtom, zoomToSelectionAtom,
} from "@/store/4-editor";
import { TOOLS } from "@/tools";
import { doAsyncExecuteConfirmDialogAtom } from "@/components/4-dialogs/8-1-confirmation/9-types-confirmation";
import { fitViewBoxDialogAtom } from "@/components/4-dialogs/8-4-fit-viewbox/9-types-fit-viewbox";
import { isOpenViewBoxSettingsDialogAtom } from "@/components/4-dialogs/8-5-viewbox-settings/9-types-viewbox-settings";
import { isOpenShortcutsHelpDialogAtom } from "@/components/4-dialogs/8-6-shortcuts-help/9-types-shortcuts-help";
import { isOpenCommandPaletteAtom } from "@/components/4-dialogs/8-7-command-palette/9-types-command-palette";
import { isOpenFindOnCanvasAtom } from "@/components/4-dialogs/8-8-find-on-canvas/9-types-find-on-canvas";
import { isOpenOptionsDialogAtom } from "@/components/4-dialogs/8-3-options/9-types-options";
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
        run: async ({ set }) => {
            const rv = await openSvgFile();
            if (rv.ok) {
                set(setSelectionAtom, []);
                set(zoomToFitAtom);
            }
            reportFile(rv);
        },
    },
    { id: 'file.save', label: 'Save to...', group: 'file', shortcut: 'Ctrl+S', run: async () => reportFile(await saveSvgFile(), 'Saved') },
    { id: 'file.saveAs', label: 'Save as...', group: 'file', shortcut: 'Ctrl+Shift+S', run: async () => reportFile(await saveSvgFileAs(), 'Saved') },
    { id: 'file.exportSvg', label: 'Export SVG', group: 'file', run: () => exportSvgDownload() },
    { id: 'file.exportPng1', label: 'Export PNG (1x)', group: 'file', shortcut: 'Ctrl+Shift+E', run: async () => reportFile(await exportPng(1)) },
    { id: 'file.exportPng2', label: 'Export PNG (2x)', group: 'file', run: async () => reportFile(await exportPng(2)) },
    { id: 'file.exportPng4', label: 'Export PNG (4x)', group: 'file', run: async () => reportFile(await exportPng(4)) },
    {
        id: 'file.copySource', label: 'Copy SVG source', group: 'file',
        run: async () => {
            await navigator.clipboard.writeText(docToText());
            toast.success('SVG source copied');
        },
    },
    {
        id: 'file.pasteSvg', label: 'Paste SVG from clipboard', group: 'file', keywords: 'import insert',
        run: async ({ set }) => {
            try {
                const ids = insertSvgMarkup(await navigator.clipboard.readText());
                ids ? set(setSelectionAtom, ids) : toast.error('The clipboard does not contain SVG markup');
            } catch (e) {
                toast.error(String(e));
            }
        },
    },
    {
        id: 'file.reset', label: 'Reset the canvas', group: 'file', keywords: 'new clear',
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
    { id: 'edit.undo', label: 'Undo', group: 'edit', shortcut: 'Ctrl+Z', enabled: () => historyState.index > 0, run: ({ set }) => set(undoAtom) },
    { id: 'edit.redo', label: 'Redo', group: 'edit', shortcut: 'Ctrl+Shift+Z', alsoKeys: ['Ctrl+Y'], enabled: () => historyState.index < historyState.length - 1, run: ({ set }) => set(redoAtom) },
    {
        id: 'edit.delete', label: 'Delete', group: 'edit', shortcut: 'Delete', alsoKeys: ['Backspace'], enabled: hasSelection,
        run: ({ get, set }) => {
            deleteNodes(get(selectionAtom));
            set(setSelectionAtom, []);
        },
    },
    {
        id: 'edit.duplicate', label: 'Duplicate', group: 'edit', shortcut: 'Ctrl+D', enabled: hasSelection,
        run: ({ get, set }) => {
            const ids = duplicateNodes(get(selectionAtom), 10);
            set(setSelectionAtom, ids);
            commitHistory(); // duplicateNodes does not commit because Alt+drag commits after the move
        },
    },
    // Cut and Copy have no shortcut here: the native clipboard events (see store/5-controllers/3-clipboard.ts) handle Ctrl+X and Ctrl+C
    {
        id: 'edit.cut', label: 'Cut', group: 'edit', enabled: hasSelection,
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
        run: async ({ get }) => {
            try {
                await navigator.clipboard.writeText(nodesToText(get(selectionAtom)));
            } catch (e) {
                toast.error(String(e));
            }
        },
    },
    {
        id: 'edit.copyPng', label: 'Copy as PNG', group: 'edit', enabled: hasSelection, keywords: 'image bitmap',
        run: async ({ get }) => reportFile(await copyPngToClipboard(get(selectionAtom)), 'PNG copied'),
    },
    {
        id: 'edit.copyDrawingPng', label: 'Copy drawing as PNG', group: 'edit', keywords: 'image bitmap all',
        run: async () => reportFile(await copyPngToClipboard(), 'PNG copied'),
    },
    {
        id: 'edit.copyStyle', label: 'Copy style', group: 'edit', enabled: hasSelection, keywords: 'fill stroke attributes',
        run: ({ get, set }) => {
            const style = readNodeStyle(get(selectionAtom)[0]);
            style && set(copiedStyleAtom, style);
        },
    },
    {
        id: 'edit.pasteStyle', label: 'Paste style', group: 'edit', keywords: 'fill stroke attributes',
        enabled: (get) => hasSelection(get) && get(copiedStyleAtom) !== null,
        run: ({ get }) => {
            const style = get(copiedStyleAtom);
            style && writeNodesStyle(get(selectionAtom), style);
        },
    },
    {
        id: 'edit.selectAll', label: 'Select all', group: 'edit', shortcut: 'Ctrl+A',
        run: ({ set }) => {
            set(setActiveToolAtom, ToolId.select);
            set(setSelectionAtom, topLevelIds());
        },
    },
    { id: 'edit.deselect', label: 'Deselect', group: 'edit', enabled: hasSelection, run: ({ set }) => set(setSelectionAtom, []) },
];

const OBJECT: Command[] = [
    {
        id: 'object.group', label: 'Group', group: 'object', shortcut: 'Ctrl+G', enabled: (get) => get(selectionAtom).length > 0,
        run: ({ get, set }) => {
            const id = groupNodes(get(selectionAtom));
            id ? set(setSelectionAtom, [id]) : toast.info('Only elements with the same parent can be grouped');
        },
    },
    {
        id: 'object.ungroup', label: 'Ungroup', group: 'object', shortcut: 'Ctrl+Shift+G', enabled: hasSelection,
        run: ({ get, set }) => set(setSelectionAtom, ungroupNodes(get(selectionAtom))),
    },
    {
        id: 'object.convertToPath', label: 'Convert to path', group: 'object', shortcut: 'Ctrl+Shift+P', keywords: 'outline',
        enabled: (get) => get(selectionAtom).some((id) => { const n = getNodeProxy(id); return !!n && isShapeNode(n); }),
        run: ({ get }) => convertToPath(get(selectionAtom)),
    },
    { id: 'object.front', label: 'Bring to front', group: 'object', shortcut: 'Ctrl+Shift+]', enabled: hasSelection, run: ({ get }) => reorderNodes(get(selectionAtom), 'front') },
    { id: 'object.forward', label: 'Bring forward', group: 'object', shortcut: 'Ctrl+]', enabled: hasSelection, run: ({ get }) => reorderNodes(get(selectionAtom), 'forward') },
    { id: 'object.backward', label: 'Send backward', group: 'object', shortcut: 'Ctrl+[', enabled: hasSelection, run: ({ get }) => reorderNodes(get(selectionAtom), 'backward') },
    { id: 'object.back', label: 'Send to back', group: 'object', shortcut: 'Ctrl+Shift+[', enabled: hasSelection, run: ({ get }) => reorderNodes(get(selectionAtom), 'back') },
    { id: 'object.flipH', label: 'Flip horizontal', group: 'object', keywords: 'mirror', enabled: hasSelection, run: ({ get }) => flipNodes(get(selectionAtom), 'x') },
    { id: 'object.flipV', label: 'Flip vertical', group: 'object', keywords: 'mirror', enabled: hasSelection, run: ({ get }) => flipNodes(get(selectionAtom), 'y') },
    {
        id: 'object.editPoints', label: 'Edit points', group: 'object', keywords: 'direct selection anchors handles',
        enabled: (get) => { const ids = get(selectionAtom); return ids.length === 1 && isPointEditable(ids[0]); },
        run: ({ set }) => set(setActiveToolAtom, ToolId.points),
    },
];

const VIEWBOX: Command[] = [
    {
        id: 'viewbox.fitSelection', label: 'Fit selection to viewBox...', group: 'viewbox', shortcut: 'Ctrl+Alt+F', keywords: 'scale padding',
        enabled: hasSelection, run: ({ set }) => set(fitViewBoxDialogAtom, 'selection-into-viewbox'),
    },
    {
        id: 'viewbox.toSelection', label: 'Fit viewBox to selection...', group: 'viewbox', enabled: hasSelection,
        run: ({ set }) => set(fitViewBoxDialogAtom, 'viewbox-to-selection'),
    },
    { id: 'viewbox.toContent', label: 'Fit viewBox to content...', group: 'viewbox', run: ({ set }) => set(fitViewBoxDialogAtom, 'viewbox-to-content') },
    { id: 'viewbox.settings', label: 'ViewBox settings...', group: 'viewbox', run: ({ set }) => set(isOpenViewBoxSettingsDialogAtom, true) },
    { id: 'viewbox.toggle', label: 'Show viewBox', group: 'viewbox', run: () => { appSettings.prefs.showViewBox = !appSettings.prefs.showViewBox; } },
];

const VIEW: Command[] = [
    { id: 'view.zoomIn', label: 'Zoom in', group: 'view', shortcut: 'Ctrl+=', run: ({ set }) => set(zoomByAtom, { factor: 1.25 }) },
    { id: 'view.zoomOut', label: 'Zoom out', group: 'view', shortcut: 'Ctrl+-', run: ({ set }) => set(zoomByAtom, { factor: 0.8 }) },
    { id: 'view.zoomReset', label: 'Zoom to 100%', group: 'view', shortcut: 'Ctrl+0', run: ({ set }) => set(zoomResetAtom) },
    { id: 'view.zoomFit', label: 'Zoom to fit all', group: 'view', shortcut: 'Shift+1', run: ({ set }) => set(zoomToFitAtom) },
    { id: 'view.zoomSelection', label: 'Zoom to selection', group: 'view', shortcut: 'Shift+2', run: ({ set }) => set(zoomToSelectionAtom) },
    { id: 'view.grid', label: 'Toggle grid', group: 'view', shortcut: "Ctrl+'", run: () => { appSettings.prefs.showGrid = !appSettings.prefs.showGrid; } },
    { id: 'view.snap', label: 'Toggle snap to grid', group: 'view', run: () => { appSettings.prefs.snapToGrid = !appSettings.prefs.snapToGrid; } },
    { id: 'view.codePanel', label: 'Toggle SVG source panel', group: 'view', shortcut: 'Ctrl+B', keywords: 'code monaco editor', run: () => { appSettings.codePanel.open = !appSettings.codePanel.open; } },
    {
        id: 'view.theme', label: 'Toggle dark theme', group: 'view',
        run: () => { appSettings.theme = appSettings.theme === 'dark' ? 'light' : 'dark'; },
    },
];

const HELP: Command[] = [
    { id: 'help.palette', label: 'Command palette', group: 'help', shortcut: 'Ctrl+/', run: ({ set }) => set(isOpenCommandPaletteAtom, true) },
    { id: 'help.find', label: 'Find on canvas', group: 'help', shortcut: 'Ctrl+F', run: ({ set }) => set(isOpenFindOnCanvasAtom, true) },
    { id: 'help.shortcuts', label: 'Help and keyboard shortcuts', group: 'help', shortcut: '?', run: ({ set }) => set(isOpenShortcutsHelpDialogAtom, true) },
    { id: 'help.options', label: 'Options...', group: 'help', keywords: 'settings preferences welcome', run: ({ set }) => set(isOpenOptionsDialogAtom, true) },
];

const TOOL_COMMANDS: Command[] = TOOLS.map((tool) => ({
    id: `tool.${tool.id}`,
    label: `${tool.label} tool`,
    group: 'tools',
    shortcut: tool.shortcut.toUpperCase(),
    enabled: (get) => get(activeToolIdAtom) !== tool.id,
    run: ({ set }) => set(setActiveToolAtom, tool.id),
}));

export const NUDGE_KEYS: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
};

export function nudgeSelection(ids: string[], key: string, big: boolean): boolean {
    const dir = NUDGE_KEYS[key];
    if (!dir || !ids.length) {
        return false;
    }
    const step = big ? 10 : 1;
    moveNodes(ids, dir[0] * step, dir[1] * step);
    return true;
}

export const COMMANDS: readonly Command[] = [...FILE, ...EDIT, ...OBJECT, ...VIEWBOX, ...VIEW, ...HELP, ...TOOL_COMMANDS];

const byId = new Map(COMMANDS.map((c) => [c.id, c]));

export function getCommand(id: string): Command | undefined {
    return byId.get(id);
}
