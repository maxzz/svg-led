import { useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { useSnapshot } from "valtio";
import { Eye as Icon_Eye, EyeOff as Icon_EyeOff, Group as Icon_Group, Lock as Icon_Lock } from "lucide-react";

import { type GroupNode, type SvgDoc, type SvgNode, findNode } from "@/svg-core";
import { docState } from "@/store/3-document";
import { selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { exitIsolationToAtom, isHidden, isHiddenOrLocked, isLocked, isolationManyOpenAtom, layerName, setNodesHidden, setNodesLocked } from "@/store/6-layers";
import { LayerThumbnail } from "./8-layer-thumbnail";
import { LockButton, VisibilityButton } from "../4-toggle-sweep";
import { LAYER_ICON_PX, containsSelectedFamily, isIsolationCollapsedFamily, isSelectedFamily, rowClickAtom, toggleIsolationCollapsedAtom, toggleIsolationManyAtom } from "../9-atoms-layers-panel";
import { LayerRow } from "./0-all-layer-row";
import { Expander_Icon, GroupChildren, SelectionCircle_Icon, stop } from "./2-row-parts";

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
            className={classNames(rowClasses, selected ? "bg-(--editor-accent)/12" : "hover:bg-muted/60")}
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

            <div className={nameClasses} style={{ paddingLeft: 4 }}>
                <Expander_Icon isGroup={childCount > 0} open={open} onToggle={() => toggleCollapsed(snap.id)} />
                <LayerThumbnail node={node} snap={snap} />
                <span className={classNames("truncate", (hidden || hiddenByParent) && "text-muted-foreground")}>
                    Isolation Mode
                </span>
            </div>

            <SelectionCircle_Icon id={snap.id} selected={selected} containsSelected={isGroup && containsSelected} />
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

const rowClasses = "group/row select-none h-7 border-b border-foreground/5 flex items-stretch";
const nameClasses = "grow min-w-0 flex items-center gap-1.5";

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
            className={classNames(rowClasses, selected ? "bg-(--editor-accent)/12" : "hover:bg-muted/60")}
            title="Double-click to exit isolation mode"
            onClick={selectAll}
            onDoubleClick={() => exit(null)}
        >
            <ScopeFlag
                iconClassName={hiddenByParent && !allHidden ? "opacity-35" : undefined}
                icon={allHidden ? Icon_EyeOff : Icon_Eye}
                onToggle={toggleHidden}
                title={`${allHidden ? "Show" : "Hide"} the isolated objects`}
            />
            <ScopeFlag
                iconClassName={allLocked ? "opacity-100" : lockedByParent ? "opacity-35" : "opacity-0 group-hover/row:opacity-10"}
                icon={Icon_Lock}
                onToggle={toggleLocked}
                title={`${allLocked ? "Unlock" : "Lock"} the isolated objects`}
            />

            <div className={nameClasses} style={{ paddingLeft: 4 }}>
                <Expander_Icon isGroup open={open} onToggle={() => toggle()} />
                <div
                    className="shrink-0 bg-white ring-1 ring-foreground/15 rounded-xs overflow-hidden flex items-center justify-center"
                    style={{ width: LAYER_ICON_PX, height: LAYER_ICON_PX }}
                >
                    <Icon_Group className="size-3.5 text-neutral-800" />
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

        {open && nodes.map(
            (node) => {
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
            }
        )}
    </>);
}

function ScopeFlag({ title, icon: Icon, iconClassName, onToggle }: { title: string; icon: typeof Icon_Eye; iconClassName?: string; onToggle: () => void; }) {
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
