import { type MouseEvent, memo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { useSnapshot } from "valtio";
import { ChevronRight, Eye, EyeOff, Group, Lock } from "lucide-react";

import { type GroupNode, type SvgDoc, type SvgNode, findNode } from "@/svg-core";
import { docState } from "@/store/3-document";
import { selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { enterIsolationAtom, exitIsolationToAtom, isHidden, isHiddenOrLocked, isLocked, isolationManyOpenAtom, isolationScopeAtom, layerName, setNodesHidden, setNodesLocked } from "@/store/6-layers";
import { LayerThumbnail } from "./1-2-layer-thumbnail";
import { isDraggedFamily, rowDragDownAtom } from "./2-reorder";
import { LayerName } from "./3-rename";
import { LockButton, VisibilityButton } from "./4-toggle-sweep";
import { LAYER_ICON_PX, ROW_INDENT_PX, circlePointerDownAtom, circlePointerMoveAtom, circlePointerUpAtom, containsSelectedFamily, isExpandedFamily, isIsolationCollapsedFamily, isSelectedFamily, rowClickAtom, toggleExpandedAtom, toggleIsolationCollapsedAtom, toggleIsolationManyAtom } from "./9-atoms-layers-panel";

type LayerRowProps = {
    node: SvgNode;
    depth: number;
    hiddenByParent: boolean;
    lockedByParent: boolean;
};

/** One layer: visibility, lock, expander, thumbnail, name and the selection circle; a group row also renders its children (topmost first) */
export const LayerRow = memo(

    function LayerRow({ node, depth, hiddenByParent, lockedByParent }: LayerRowProps) {
        const snap = useSnapshot(node) as SvgNode;
        const scope = useAtomValue(isolationScopeAtom);
        const expanded = useAtomValue(isExpandedFamily(snap.id));
        const collapsed = useAtomValue(isIsolationCollapsedFamily(snap.id));
        const selected = useAtomValue(isSelectedFamily(snap.id));
        const containsSelected = useAtomValue(containsSelectedFamily(snap.id));
        const dragged = useAtomValue(isDraggedFamily(snap.id));
        const rowClick = useSetAtom(rowClickAtom);
        const dragDown = useSetAtom(rowDragDownAtom);
        const enterIsolation = useSetAtom(enterIsolationAtom);
        const toggleExpanded = useSetAtom(toggleExpandedAtom);
        const toggleCollapsed = useSetAtom(toggleIsolationCollapsedAtom);

        const isGroup = snap.kind === 'g';
        const isRoot = scope.includes(snap.id);
        const open = isGroup && (isRoot ? !collapsed : expanded);
        const hidden = isHidden(snap);
        const locked = isLocked(snap);

        return (<>
            <div
                className={classNames(
                    "group/row select-none h-7 border-b border-foreground/5 flex items-stretch",
                    selected ? "bg-(--editor-accent)/12" : "hover:bg-muted/60",
                    dragged && "opacity-40",
                )}
                data-layer-id={snap.id}
                data-layer-depth={depth}
                data-layer-group={isGroup}
                data-layer-open={open && snap.children.length > 0}
                onPointerDown={(e) => dragDown({ id: snap.id, button: e.button, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, target: e.target as Element, row: e.currentTarget })}
                onClick={(e) => rowClick({ id: snap.id, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey })}
                onDoubleClick={() => enterIsolation(snap.id)}
            >
                <VisibilityButton id={snap.id} hidden={hidden} inherited={hiddenByParent} />
                <LockButton id={snap.id} locked={locked} inherited={lockedByParent} />

                <div className="grow min-w-0 flex items-center gap-1.5" style={{ paddingLeft: 4 + depth * ROW_INDENT_PX }}>
                    <Expander isGroup={isGroup && snap.children.length > 0} open={open} onToggle={() => (isRoot ? toggleCollapsed(snap.id) : toggleExpanded(snap.id))} />
                    <LayerThumbnail node={node} snap={snap} />
                    <LayerName id={snap.id} name={layerName(snap)} idAttr={snap.attrs.id ?? ''} dimmed={hidden || hiddenByParent} />
                </div>

                <SelectionCircle id={snap.id} selected={selected} containsSelected={isGroup && containsSelected} />
            </div>

            {open && isGroup && (
                <GroupChildren
                    group={node as GroupNode}
                    count={snap.children.length}
                    depth={depth + 1}
                    hiddenByParent={hiddenByParent || hidden}
                    lockedByParent={lockedByParent || locked}
                />
            )}
        </>);
    }
);

//---------------------------------------------------------------------------

/** Children of a group, the last one (topmost on the canvas) first */
function GroupChildren({ group, count, depth, hiddenByParent, lockedByParent }: { group: GroupNode; count: number; depth: number; hiddenByParent: boolean; lockedByParent: boolean; }) {
    const rows = [];
    for (let i = count - 1; i >= 0; i--) {
        const child = group.children[i];
        child && rows.push(
            <LayerRow key={child.id} node={child} depth={depth} hiddenByParent={hiddenByParent} lockedByParent={lockedByParent} />
        );
    }
    return <>{rows}</>;
}

//---------------------------------------------------------------------------

function Expander({ isGroup, open, onToggle }: { isGroup: boolean; open: boolean; onToggle: () => void; }) {
    if (!isGroup) {
        return <span className="shrink-0 size-4" />;
    }
    return (
        <button
            className="shrink-0 size-4 text-foreground/60 hover:text-foreground rounded-xs flex items-center justify-center cursor-pointer"
            data-row-control
            onClick={(e) => { stop(e); onToggle(); }}
            onDoubleClick={stop}
            title={open ? "Collapse" : "Expand"}
            type="button"
        >
            <ChevronRight className={classNames("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
    );
}

function stop(e: MouseEvent) {
    e.stopPropagation();
}

//---------------------------------------------------------------------------

/** Click selects only this layer; dragging across circles toggles each one; Shift and Ctrl work as on the row */
function SelectionCircle({ id, selected, containsSelected }: { id: string; selected: boolean; containsSelected: boolean; }) {
    const down = useSetAtom(circlePointerDownAtom);
    const move = useSetAtom(circlePointerMoveAtom);
    const up = useSetAtom(circlePointerUpAtom);

    return (
        <div
            className="relative shrink-0 w-9 h-full border-l border-foreground/5 flex items-center justify-center cursor-pointer touch-none"
            data-row-control
            onPointerDown={(e) => { if (e.button === 0) { down({ id, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, pointerId: e.pointerId, target: e.currentTarget }); } }}
            onPointerMove={(e) => move({ clientX: e.clientX, clientY: e.clientY })}
            onPointerUp={() => up()}
            onPointerCancel={() => up()}
            onClick={stop}
            onDoubleClick={stop}
            title="Select · drag across circles to toggle · [Shift] range · [Ctrl] toggle"
        >
            {containsSelected && (
                <span
                    className="absolute left-[calc(50%+4px)] top-1/2 -translate-y-1/2 size-1.5 rounded-xs bg-(--editor-accent)/40 border-(--editor-accent)/80 border"
                    title="Contains selected items"
                />
            )}
            <span
                className={classNames("-ml-3 size-2 border border-foreground/60 rounded-full", selected && "bg-(--editor-accent) border-(--editor-accent) ring-2 ring-(--editor-accent)/30")}
            />
        </div>
    );
}

//---------------------------------------------------------------------------

const ROW_CLASS = "group/row select-none h-7 border-b border-foreground/5 flex items-stretch";
const NAME_CLASS = "grow min-w-0 flex items-center gap-1.5";

/**
 * Root of the tree while isolating. It stands for the isolated group (or for every isolated object),
 * shows that group's preview, and a double-click leaves isolation mode.
 */
export function IsolationRoot({ nodes }: { nodes: SvgNode[]; }) {
    if (nodes.length === 1) {
        return <SingleIsolationRoot node={nodes[0]} />;
    }
    return <ManyIsolationRoot nodes={nodes} />;
}

/** One isolated object: its preview and its contents, one icon to the right */
function SingleIsolationRoot({ node }: { node: SvgNode; }) {
    const snap = useSnapshot(node) as SvgNode;
    const collapsed = useAtomValue(isIsolationCollapsedFamily(node.id));
    const selected = useAtomValue(isSelectedFamily(node.id));
    const containsSelected = useAtomValue(containsSelectedFamily(node.id));
    const rowClick = useSetAtom(rowClickAtom);
    const toggleCollapsed = useSetAtom(toggleIsolationCollapsedAtom);
    const exit = useSetAtom(exitIsolationToAtom);

    const parents = findNode(docState.doc, node.id)?.parents ?? [];
    const hiddenByParent = parents.some(isHidden);
    const lockedByParent = parents.some(isLocked);
    const hidden = isHidden(snap);
    const locked = isLocked(snap);
    const isGroup = snap.kind === 'g';
    const childCount = isGroup ? snap.children.length : 0;
    const open = childCount > 0 && !collapsed;

    return (<>
        <div
            className={classNames(ROW_CLASS, selected ? "bg-(--editor-accent)/12" : "hover:bg-muted/60")}
            data-layer-id={snap.id}
            data-layer-depth={0}
            data-layer-group={isGroup}
            data-layer-open={open}
            title={`${layerName(snap)} · double-click to exit isolation mode`}
            onClick={(e) => rowClick({ id: snap.id, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey })}
            onDoubleClick={() => exit(null)}
        >
            <VisibilityButton id={snap.id} hidden={hidden} inherited={hiddenByParent} />
            <LockButton id={snap.id} locked={locked} inherited={lockedByParent} />

            <div className={NAME_CLASS} style={{ paddingLeft: 4 }}>
                <Expander isGroup={childCount > 0} open={open} onToggle={() => toggleCollapsed(snap.id)} />
                <LayerThumbnail node={node} snap={snap} />
                <span className={classNames("truncate", (hidden || hiddenByParent) && "text-muted-foreground")}>
                    Isolation Mode
                </span>
            </div>

            <SelectionCircle id={snap.id} selected={selected} containsSelected={isGroup && containsSelected} />
        </div>

        {open && isGroup && (
            <GroupChildren
                group={node as GroupNode}
                count={childCount}
                depth={1}
                hiddenByParent={hiddenByParent || hidden}
                lockedByParent={lockedByParent || locked}
            />
        )}
    </>);
}

/** Several isolated objects, listed under the Isolation Mode row */
function ManyIsolationRoot({ nodes }: { nodes: SvgNode[]; }) {
    const { doc } = useSnapshot(docState);
    const open = useAtomValue(isolationManyOpenAtom);
    const toggle = useSetAtom(toggleIsolationManyAtom);
    const exit = useSetAtom(exitIsolationToAtom);
    const selection = useAtomValue(selectionAtom);
    const setSelection = useSetAtom(setSelectionAtom);

    const snap = doc as unknown as SvgDoc;
    const ids = nodes.map((n) => n.id);
    const locs = ids.flatMap((id) => {
        const loc = findNode(snap, id);
        return loc ? [loc] : [];
    });
    const allHidden = locs.length > 0 && locs.every((loc) => isHidden(loc.node));
    const allLocked = locs.length > 0 && locs.every((loc) => isLocked(loc.node));
    const hiddenByParent = locs.length > 0 && locs.every((loc) => loc.parents.some(isHidden));
    const lockedByParent = locs.length > 0 && locs.every((loc) => loc.parents.some(isLocked));
    const selectable = ids.filter((id) => !isHiddenOrLocked(snap, id));
    const selected = selectable.length > 0 && selectable.every((id) => selection.includes(id));

    const selectAll = () => setSelection(ids.filter((id) => !isHiddenOrLocked(docState.doc, id)));
    const toggleHidden = () => {
        const hide = !allHidden;
        setNodesHidden(ids, hide);
        hide && setSelection(selection.filter((id) => !ids.includes(id)));
    };
    const toggleLocked = () => {
        const lock = !allLocked;
        setNodesLocked(ids, lock);
        lock && setSelection(selection.filter((id) => !ids.includes(id)));
    };

    return (<>
        <div
            className={classNames(ROW_CLASS, selected ? "bg-(--editor-accent)/12" : "hover:bg-muted/60")}
            title="Double-click to exit isolation mode"
            onClick={selectAll}
            onDoubleClick={() => exit(null)}
        >
            <ScopeFlag
                title={`${allHidden ? "Show" : "Hide"} the isolated objects`}
                icon={allHidden ? EyeOff : Eye}
                iconClassName={hiddenByParent && !allHidden ? "opacity-35" : undefined}
                onToggle={toggleHidden}
            />
            <ScopeFlag
                title={`${allLocked ? "Unlock" : "Lock"} the isolated objects`}
                icon={Lock}
                iconClassName={allLocked ? "opacity-100" : lockedByParent ? "opacity-35" : "opacity-0 group-hover/row:opacity-10"}
                onToggle={toggleLocked}
            />

            <div className={NAME_CLASS} style={{ paddingLeft: 4 }}>
                <Expander isGroup open={open} onToggle={() => toggle()} />
                <div
                    className="shrink-0 bg-white ring-1 ring-foreground/15 rounded-xs overflow-hidden flex items-center justify-center"
                    style={{ width: LAYER_ICON_PX, height: LAYER_ICON_PX }}
                >
                    <Group className="size-3.5 text-neutral-800" />
                </div>
                <span className="truncate">Isolation Mode</span>
            </div>

            <div
                className="shrink-0 w-8 h-full border-l border-foreground/5 flex items-center justify-center cursor-pointer touch-none"
                data-row-control
                title="Select the isolated objects"
                onClick={(e) => { stop(e); selectAll(); }}
                onDoubleClick={stop}
            >
                <span className={classNames("size-2 border border-foreground/60 rounded-full", selected && "bg-(--editor-accent) border-(--editor-accent) ring-2 ring-(--editor-accent)/30")} />
            </div>
        </div>

        {open && nodes.map((node) => {
            const parents = findNode(docState.doc, node.id)?.parents ?? [];
            return (
                <LayerRow
                    key={node.id}
                    node={node}
                    depth={1}
                    hiddenByParent={parents.some(isHidden)}
                    lockedByParent={parents.some(isLocked)}
                />
            );
        })}
    </>);
}

function ScopeFlag({ title, icon: Icon, iconClassName, onToggle }: { title: string; icon: typeof Eye; iconClassName?: string; onToggle: () => void; }) {
    return (
        <button
            className="shrink-0 w-7 h-full text-foreground/70 hover:text-foreground border-r border-foreground/5 flex items-center justify-center cursor-pointer touch-none"
            data-row-control
            title={title}
            onClick={(e) => { stop(e); onToggle(); }}
            onDoubleClick={stop}
            type="button"
        >
            <Icon className={classNames("size-3.5", iconClassName)} />
        </button>
    );
}
