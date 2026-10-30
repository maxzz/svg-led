import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { topLevelIds } from "@/store/3-document";
import { selectionAtom, zoomToFitAtom } from "@/store/4-editor";
import { appSettings } from "@/store/1-ui-settings";
import { PROPERTIES_POPUP_RIGHT_EDGE_PX } from "@/components/1-workspace/2-props-panel/9-atoms-properties-popup";
import { classNames } from "@/utils";
import { doAsyncExecuteConfirmDialogAtom } from "../8-1-confirmation/9-types-confirmation";
import { getConfirmOverwriteScrapMessages } from "../8-1-confirmation/8-confirmation-ui-messages";
import { ScrapsDragGhost, ScrapsDropIndicator, isDraggedFamily, rowDragCancelAtom, rowDragDownAtom, rowDragMoveAtom, rowDragUpAtom } from "./1-reorder";
import { type Scrap, type ScrapLoadMode, type ScrapSaveScope, doDeleteScrapAtom, doLoadScrapAtom, doSaveScrapAtom, isOpenScrapsDialogAtom, scrapsAtom, scrapsOptionsAtom } from "./9-types-scraps";

export function ScrapsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenScrapsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! w-[min(30rem,calc(100vw-2rem))]! max-w-none! text-xs gap-0!">
                <DialogHeader className="px-4 py-3 text-left border-b gap-1">
                    <DialogTitle className="text-sm">
                        Scraps
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Save canvas elements to browser storage and bring them back later.
                    </DialogDescription>
                </DialogHeader>

                {isOpen && <Body />}

                <DialogFooter className="m-0 px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Mounted while the dialog is open, so the drafts start fresh every time */
function Body() {
    const scraps = useAtomValue(scrapsAtom);
    const [selectedName, setSelectedName] = useState<string | null>(scraps[0]?.name ?? null);
    const [nameDraft, setNameDraft] = useState(() => nextScrapName(scraps));

    function selectScrap(name: string) {
        setSelectedName(name);
        setNameDraft(name);
    }

    return (
        <div className="px-4 py-3 flex flex-col gap-4">
            <LoadSection selectedName={selectedName} setSelectedName={setSelectedName} selectScrap={selectScrap} />
            <SaveSection nameDraft={nameDraft} setNameDraft={setNameDraft} />
        </div>
    );
}

//---------------------------------------------------------------------------

function LoadSection({ selectedName, setSelectedName, selectScrap }: { selectedName: string | null; setSelectedName: (name: string | null) => void; selectScrap: (name: string) => void; }) {
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

    const loadMode: ScrapLoadMode = options.loadMode === 'replace' ? 'replace' : 'add';
    const selectedIndex = scraps.findIndex((s) => s.name === selectedName);

    useEffect(
        () => {
            if (selectedName && selectedIndex === -1) {
                setSelectedName(scraps[0]?.name ?? null);
            }
        },
        [selectedName, selectedIndex, scraps, setSelectedName]
    );

    useEffect(
        () => {
            selectedName && rowRefs.current.get(selectedName)?.scrollIntoView({ block: 'nearest' });
        },
        [selectedName]
    );

    useEffect(() => () => { cancel(); }, [cancel]);

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

    function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'ArrowDown') selectIndex(selectedIndex + 1);
        else if (e.key === 'ArrowUp') selectIndex(selectedIndex === -1 ? scraps.length - 1 : selectedIndex - 1);
        else if (e.key === 'Home') selectIndex(0);
        else if (e.key === 'End') selectIndex(scraps.length - 1);
        else if (e.key === 'Enter' && selectedName) load(selectedName);
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
                    Drag to reorder · double-click to load
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
                <div className="relative p-1 flex flex-col gap-0.5" data-scraps-list="" onKeyDown={onListKeyDown} role="listbox" aria-label="Saved scraps">
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
                                    onSelect={() => selectScrap(scrap.name)}
                                    onLoad={() => load(scrap.name)}
                                    onDelete={() => doDelete(scrap.name)}
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

function ScrapRow({ scrap, selected, onSelect, onLoad, onDelete, rowRef }: { scrap: Scrap; selected: boolean; onSelect: () => void; onLoad: () => void; onDelete: () => void; rowRef: (node: HTMLDivElement | null) => void; }) {
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
            onClick={onSelect}
            onDoubleClick={onLoad}
            tabIndex={selected ? 0 : -1}
            role="option"
            aria-selected={selected}
        >
            <img className="shrink-0 p-0.5 size-10 object-contain bg-white border rounded" src={src} alt="" draggable={false} />

            <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                    {scrap.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                    {scrap.count} {scrap.count === 1 ? 'element' : 'elements'} · {new Date(scrap.updatedAt).toLocaleString()}
                </p>
            </div>

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
    );
}

//---------------------------------------------------------------------------

function SaveSection({ nameDraft, setNameDraft }: { nameDraft: string; setNameDraft: (name: string) => void; }) {
    const scraps = useAtomValue(scrapsAtom);
    const selectedCount = useAtomValue(selectionAtom).length;
    const allCount = topLevelIds().length;
    const [options, setOptions] = useAtom(scrapsOptionsAtom);
    const doSave = useSetAtom(doSaveScrapAtom);
    const doAsyncExecuteConfirmDialog = useSetAtom(doAsyncExecuteConfirmDialogAtom);
    const setIsOpen = useSetAtom(isOpenScrapsDialogAtom);
    const nameId = useId();

    const scope: ScrapSaveScope = options.saveScope === 'selection' && selectedCount ? 'selection' : 'all';
    const name = nameDraft.trim();
    const existing = scraps.some((s) => s.name === name);
    const count = scope === 'selection' ? selectedCount : allCount;

    const scopes = [
        { value: 'selection', label: `Selected (${selectedCount})`, disabled: !selectedCount },
        { value: 'all', label: `All (${allCount})` },
    ] as const;

    async function save() {
        if (!name || !count) {
            return;
        }
        if (existing && !await doAsyncExecuteConfirmDialog(getConfirmOverwriteScrapMessages(name))) {
            return;
        }
        doSave({ name, scope }) && setIsOpen(false);
    }

    return (
        <form className="pt-3 border-t flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Label className="text-xs font-medium" htmlFor={nameId}>
                Save as scrap
            </Label>

            <Input
                className="h-8 text-xs"
                id={nameId}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.currentTarget.value)}
                placeholder="Scrap name"
                autoComplete="off"
            />

            <p className={classNames("h-3 text-[10px]", existing ? "text-orange-700" : "text-muted-foreground")}>
                {existing ? 'A scrap with this name exists; saving overwrites it after confirmation.' : 'Click a saved scrap to reuse its name.'}
            </p>

            <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                    Elements
                </span>
                <TabSelect<ScrapSaveScope>
                    className="p-0.5 bg-muted rounded-md"
                    itemClassName="py-1"
                    items={scopes}
                    value={scope}
                    onValueChange={(saveScope) => setOptions({ saveScope })}
                    orientation="horizontal"
                    aria-label="Elements to save"
                />
                <Button className="ml-auto" size="sm" type="submit" disabled={!name || !count}>
                    Save
                </Button>
            </div>
        </form>
    );
}

function nextScrapName(scraps: readonly Scrap[]): string {
    const names = new Set(scraps.map((s) => s.name));
    let n = scraps.length + 1;
    while (names.has(`Scrap ${n}`)) {
        n++;
    }
    return `Scrap ${n}`;
}
