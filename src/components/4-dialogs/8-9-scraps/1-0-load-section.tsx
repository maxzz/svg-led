import { type KeyboardEvent as ReactKeyboardEvent, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { CodeXml, Trash2 } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { zoomToFitAtom } from "@/store/4-editor";
import { appSettings } from "@/store/1-ui-settings";
import { PROPERTIES_POPUP_RIGHT_EDGE_PX } from "@/components/1-workspace/2-props-panel/9-atoms-properties-popup";
import { classNames } from "@/utils";
import { ScrapsDragGhost, ScrapsDropIndicator, isDraggedFamily, rowDragCancelAtom, rowDragDownAtom, rowDragMoveAtom, rowDragUpAtom } from "./1-reorder";
import { type Scrap, type ScrapLoadMode, doDeleteScrapAtom, doLoadScrapAtom, isOpenScrapsDialogAtom, scrapsAtom, scrapsOptionsAtom } from "./9-types-scraps";
import { ScrapSourceDialog } from "./2-1-dlg-scrap-source-preview";
import { ScrapNameInput } from "./2-3-scrap-name-input";

export function LoadSection({ selectedName, setSelectedName, selectScrap, noteRename, pendingSelection }: { selectedName: string | null; setSelectedName: (name: string | null) => void; selectScrap: (name: string) => void; noteRename: (from: string, to: string) => void; pendingSelection: RefObject<string | null>; }) {
    const scraps = useAtomValue(scrapsAtom);
    const [options, setOptions] = useAtom(scrapsOptionsAtom);
    const doLoad = useSetAtom(doLoadScrapAtom);
    const doDelete = useSetAtom(doDeleteScrapAtom);
    const setIsOpen = useSetAtom(isOpenScrapsDialogAtom);
    const zoomToFit = useSetAtom(zoomToFitAtom);
    const move = useSetAtom(rowDragMoveAtom);
    const up = useSetAtom(rowDragUpAtom);
    const cancel = useSetAtom(rowDragCancelAtom);
    const rowRefs = useRef(new Map<string, HTMLDivElement>());
    const [renaming, setRenaming] = useState<string | null>(null);
    const [previewName, setPreviewName] = useState<string | null>(null);
    const returnFocus = useRef<string | null>(null);
    const preview = scraps.find((s) => s.name === previewName) ?? null;

    const loadMode: ScrapLoadMode = options.loadMode === 'replace' ? 'replace' : 'add';
    const selectedIndex = scraps.findIndex((s) => s.name === selectedName);

    useEffect(
        () => {
            const pending = pendingSelection.current;
            if (pending && scraps.some((s) => s.name === pending)) {
                if (selectedName !== pending) {
                    setSelectedName(pending);
                    return;
                }
                pendingSelection.current = null;
            }
            if (selectedName && selectedIndex === -1 && !pendingSelection.current) {
                setSelectedName(scraps[0]?.name ?? null);
            }
        },
        [selectedName, selectedIndex, scraps, setSelectedName, pendingSelection]);

    useEffect(
        () => {
            selectedName && rowRefs.current.get(selectedName)?.scrollIntoView({ block: 'nearest' });
        },
        [selectedName]);

    useEffect(() => () => { cancel(); }, [cancel]);

    useEffect(
        () => {
            const name = returnFocus.current;
            if (renaming || !name) {
                return;
            }
            returnFocus.current = null;
            rowRefs.current.get(name)?.focus();
        },
        [renaming]);

    function startRename(name: string) {
        setRenaming(name);
    }

    function endRename(focusName: string | null) {
        returnFocus.current = focusName;
        setRenaming(null);
    }

    function load(name: string) {
        if (!doLoad({ name, mode: loadMode })) {
            return;
        }
        setIsOpen(false);
        // Replacing the canvas zooms to fit once the dialog is closed, honoring the Properties panel setting
        if (loadMode === 'replace') {
            zoomToFit({ leftInset: appSettings.prefs.fitAvoidsProperties ? PROPERTIES_POPUP_RIGHT_EDGE_PX : 0 });
        }
    }

    function selectIndex(index: number) {
        const scrap = scraps[Math.max(0, Math.min(scraps.length - 1, index))];
        if (scrap) {
            selectScrap(scrap.name);
            rowRefs.current.get(scrap.name)?.focus();
        }
    }

    function onListKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
        if (e.target instanceof HTMLInputElement || renaming) {
            return;
        }
        if (e.key === 'ArrowDown') selectIndex(selectedIndex + 1);
        else if (e.key === 'ArrowUp') selectIndex(selectedIndex === -1 ? scraps.length - 1 : selectedIndex - 1);
        else if (e.key === 'Home') selectIndex(0);
        else if (e.key === 'End') selectIndex(scraps.length - 1);
        else if (e.key === 'Enter' && selectedName) load(selectedName);
        else if (e.key === 'F2' && selectedName) startRename(selectedName);
        else return;
        e.preventDefault();
    }

    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                    Saved scraps
                </span>
                <span className="text-[10px] text-muted-foreground">
                    Drag to reorder · double-click a name to rename, a row to load
                </span>
            </div>

            <ScrollArea
                className="h-56 border rounded-md"
                fixedWidth
                parentContentWidth
                viewportProps={{
                    onPointerMove: (e) => move({ pointerId: e.pointerId, buttons: e.buttons, clientX: e.clientX, clientY: e.clientY, viewport: e.currentTarget }),
                    onPointerUp: () => up(),
                    onPointerCancel: () => cancel(),
                }}
            >
                <div className="relative p-2 flex flex-col gap-0.5" data-scraps-list="" onKeyDown={onListKeyDown} role="listbox" aria-label="Saved scraps">
                    {!scraps.length
                        ? (
                            <p className="px-2 py-2 text-muted-foreground">
                                No scraps yet. Save some elements below.
                            </p>
                        )
                        : scraps.map(
                            (scrap) => (
                                <ScrapRow
                                    scrap={scrap}
                                    selected={scrap.name === selectedName}
                                    editing={renaming === scrap.name}
                                    onSelect={() => selectScrap(scrap.name)}
                                    onLoad={() => load(scrap.name)}
                                    onDelete={() => doDelete(scrap.name)}
                                    onPreview={() => { selectScrap(scrap.name); setPreviewName(scrap.name); }}
                                    onStartRename={() => startRename(scrap.name)}
                                    onRenamed={(to, focus) => { noteRename(scrap.name, to); endRename(focus ? to : null); }}
                                    onCancelRename={(focus) => endRename(focus ? scrap.name : null)}
                                    rowRef={(node) => { node ? rowRefs.current.set(scrap.name, node) : rowRefs.current.delete(scrap.name); }}
                                    key={scrap.name}
                                />
                            )
                        )
                    }
                    <ScrapsDropIndicator />
                    <ScrapsDragGhost />
                </div>
            </ScrollArea>

            {preview && <ScrapSourceDialog scrap={preview} onClose={() => setPreviewName(null)} />}

            <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                    Load
                </span>
                <TabSelect<ScrapLoadMode>
                    className="p-0.5 bg-muted rounded-md"
                    itemClassName="py-1"
                    items={LOAD_MODES}
                    value={loadMode}
                    onValueChange={(loadMode) => setOptions({ loadMode })}
                    orientation="horizontal"
                    aria-label="How to load the scrap"
                />
                <Button className="ml-auto" size="sm" disabled={!selectedName} onClick={() => selectedName && load(selectedName)}>
                    Load
                </Button>
            </div>
        </section>
    );
}

const LOAD_MODES = [
    { value: 'add', label: 'Add to canvas' },
    { value: 'replace', label: 'Replace canvas' },
] as const;

function ScrapRow({ scrap, selected, editing, onSelect, onLoad, onDelete, onPreview, onStartRename, onRenamed, onCancelRename, rowRef }: { scrap: Scrap; selected: boolean; editing: boolean; onSelect: () => void; onLoad: () => void; onDelete: () => void; onPreview: () => void; onStartRename: () => void; onRenamed: (name: string, focus: boolean) => void; onCancelRename: (focus: boolean) => void; rowRef: (node: HTMLDivElement | null) => void; }) {
    const src = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scrap.svg)}`, [scrap.svg]);
    const dragged = useAtomValue(isDraggedFamily(scrap.name));
    const dragDown = useSetAtom(rowDragDownAtom);

    return (
        <div
            ref={rowRef}
            className={classNames(
                "group px-2 py-1 select-none outline-none focus-visible:ring-1 focus-visible:ring-ring rounded flex items-center gap-3 cursor-pointer",
                selected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                dragged && "opacity-40",
            )}
            data-scrap-name={scrap.name}
            onPointerDown={(e) => dragDown({ name: scrap.name, button: e.button, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, target: e.target as Element, row: e.currentTarget })}
            onClick={(e) => { onSelect(); e.currentTarget.focus(); }}
            onDoubleClick={onLoad}
            title="Double-click to load"
            tabIndex={selected ? 0 : -1}
            role="option"
            aria-selected={selected}
        >
            <img className="shrink-0 p-0.5 size-10 object-contain bg-white border rounded" src={src} alt="" draggable={false} />

            <div className="min-w-0 flex-1">
                {editing
                    ? <ScrapNameInput name={scrap.name} onRenamed={onRenamed} onCancel={onCancelRename} />
                    : (
                        <p
                            className="font-medium truncate"
                            title={`${scrap.name} · double-click or F2 to rename`}
                            onDoubleClick={(e) => { e.stopPropagation(); onStartRename(); }}
                        >
                            {scrap.name}
                        </p>
                    )
                }
                <p className="text-[10px] text-muted-foreground truncate">
                    {scrap.count} {scrap.count === 1 ? 'element' : 'elements'} · {new Date(scrap.updatedAt).toLocaleString()}
                </p>
            </div>

            <div className="shrink-0 flex items-center">
                <Button
                    className="size-6 opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100"
                    variant="ghost"
                    size="icon"
                    data-row-control
                    onClick={(e) => { e.stopPropagation(); onPreview(); }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title="Preview source"
                    aria-label="Preview source"
                    tabIndex={-1}
                >
                    <CodeXml className="size-3.5" />
                </Button>
                <Button
                    className="size-6 opacity-0 group-hover:opacity-100 group-aria-selected:opacity-100"
                    variant="ghost"
                    size="icon"
                    data-row-control
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title="Delete scrap"
                    aria-label="Delete scrap"
                    tabIndex={-1}
                >
                    <Trash2 className="size-3.5" />
                </Button>
            </div>
        </div>
    );
}
