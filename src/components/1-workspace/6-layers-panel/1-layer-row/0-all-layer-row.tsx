import { memo, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { useSnapshot } from "valtio";
import { CodeXml } from "lucide-react";

import { type DefsItem, type GroupNode, type SvgNode, defsItemsOf, isDeactivatedName, plainName } from "@/svg-core";
import { enterIsolationAtom, isHidden, isLocked, isolationScopeAtom, layerName, setDefsChildrenActive, setPassthroughActive } from "@/store/6-layers";
import { ROW_INDENT_PX, containsSelectedFamily, isExpandedFamily, isIsolationCollapsedFamily, isSelectedFamily, rowClickAtom, toggleExpandedAtom, toggleIsolationCollapsedAtom } from "../9-atoms-layers-panel";

import { LayerThumbnail } from "./8-layer-thumbnail";
import { isDraggedFamily, rowDragDownAtom } from "../2-reorder";
import { LayerName } from "../3-rename";
import { LockButton, VisibilityButton } from "../4-toggle-sweep";
import { Defs_Icon, EyeToggle_Icon, Expander_Icon, SelectionCircle_Icon } from "./8-row-common-parts";
import { GroupChildren } from "./1-group-children";
import { DefsItemRows } from "./2-defs-item-rows";

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
        const defsItems = useDefsItems(snap);
        const canExpand = isGroup ? snap.children.length > 0 : defsItems.length > 0;
        const open = isGroup ? (isRoot ? !collapsed : expanded) : canExpand && expanded;
        const hidden = isHidden(snap);
        const locked = isLocked(snap);
        // a passthrough element is deactivated by the prefix on its tag, not by display; a <defs> is off when all its children are
        const defsNode = snap.kind === 'passthrough' && plainName(snap.tag).toLowerCase() === 'defs';
        const off = snap.kind === 'passthrough' && (isDeactivatedName(snap.tag) || (defsNode && defsItems.length > 0 && defsItems.every((i) => i.off)));

        return (<>
            <div
                className={classNames(
                    "group/row select-none h-7 border-b border-foreground/5 flex items-stretch",
                    selected ? "bg-(--editor-accent)/12" : "hover:bg-muted/60",
                    dragged && "opacity-40",
                )}
                onPointerDown={(e) => dragDown({ id: snap.id, button: e.button, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, target: e.target as Element, row: e.currentTarget })}
                onClick={(e) => rowClick({ id: snap.id, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey })}
                onDoubleClick={() => enterIsolation(snap.id)}
                data-layer-id={snap.id}
                data-layer-depth={depth}
                data-layer-group={isGroup}
                data-layer-open={open && canExpand}
                data-defs-drop={defsNode ? 'container' : undefined}
                data-defs-id={defsNode ? snap.id : undefined}
            >
                {snap.kind === 'passthrough'
                    ? <EyeToggle_Icon
                        on={!off}
                        title={defsNode ? `${off ? "Turn on" : "Turn off"} every item in <defs>` : `${off ? "Turn on" : "Turn off"} <${plainName(snap.tag)}>`}
                        onToggle={() => (defsNode ? setDefsChildrenActive(snap.id, off) : setPassthroughActive(snap.id, off))}
                    />
                    : <VisibilityButton id={snap.id} hidden={hidden} inherited={hiddenByParent} />
                }

                <LockButton id={snap.id} locked={locked} inherited={lockedByParent} />

                <div className="grow min-w-0 flex items-center gap-1.5" style={{ paddingLeft: 4 + depth * ROW_INDENT_PX }}>
                    <Expander_Icon isGroup={canExpand} open={open} onToggle={() => (isRoot ? toggleCollapsed(snap.id) : toggleExpanded(snap.id))} />
                    {defsNode
                        ? <Defs_Icon icon={CodeXml} />
                        : <LayerThumbnail node={node} snap={snap} />
                    }
                    <LayerName id={snap.id} name={layerName(snap)} idAttr={snap.attrs.id ?? ''} dimmed={hidden || hiddenByParent || off} />
                </div>

                <SelectionCircle_Icon id={snap.id} selected={selected} containsSelected={(isGroup || defsNode) && containsSelected} />
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

            {open && !isGroup && (
                <DefsItemRows defsId={snap.id} items={defsItems} depth={depth + 1} />
            )}
        </>);
    }
);

//---------------------------------------------------------------------------

/** Items of a `<defs>` element (its `<style>` elements, classes and other children), or none for any other node */
function useDefsItems(snap: SvgNode): DefsItem[] {
    const inner = snap.kind === 'passthrough' && plainName(snap.tag).toLowerCase() === 'defs' ? snap.inner : undefined;
    return useMemo(
        () => (inner === undefined ? [] : defsItemsOf(inner)), [inner]
    );
}
