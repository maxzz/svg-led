import { type MouseEvent, memo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { useSnapshot } from "valtio";
import { ChevronRight } from "lucide-react";

import { type GroupNode, type SvgNode } from "@/svg-core";
import { enterIsolationAtom, isHidden, isLocked, isolatedIdAtom, layerName } from "@/store/6-layers";
import { LayerThumbnail } from "./1-2-layer-thumbnail";
import { isDraggedFamily, rowDragDownAtom } from "./2-reorder";
import { LayerName } from "./3-rename";
import { LockButton, VisibilityButton } from "./4-toggle-sweep";
import { ROW_INDENT_PX, circlePointerDownAtom, circlePointerMoveAtom, circlePointerUpAtom, isExpandedFamily, isSelectedFamily, rowClickAtom, toggleExpandedAtom } from "./9-atoms-layers-panel";

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
        const isolatedId = useAtomValue(isolatedIdAtom);
        const expanded = useAtomValue(isExpandedFamily(snap.id));
        const selected = useAtomValue(isSelectedFamily(snap.id));
        const dragged = useAtomValue(isDraggedFamily(snap.id));
        const rowClick = useSetAtom(rowClickAtom);
        const dragDown = useSetAtom(rowDragDownAtom);
        const enterIsolation = useSetAtom(enterIsolationAtom);

        const isGroup = snap.kind === 'g';
        const isRoot = snap.id === isolatedId;
        const open = isGroup && (expanded || isRoot);
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
                onDoubleClick={() => isGroup && !isRoot && enterIsolation(snap.id)}
            >
                <VisibilityButton id={snap.id} hidden={hidden} inherited={hiddenByParent} />
                <LockButton id={snap.id} locked={locked} inherited={lockedByParent} />

                <div className="grow min-w-0 flex items-center gap-1.5" style={{ paddingLeft: 4 + depth * ROW_INDENT_PX }}>
                    <Expander id={snap.id} isGroup={isGroup && !isRoot && snap.children.length > 0} open={open} />
                    <LayerThumbnail node={node} snap={snap} />
                    <LayerName id={snap.id} name={layerName(snap)} idAttr={snap.attrs.id ?? ''} dimmed={hidden || hiddenByParent} />
                </div>

                <SelectionCircle id={snap.id} selected={selected} />
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

function Expander({ id, isGroup, open }: { id: string; isGroup: boolean; open: boolean; }) {
    const toggle = useSetAtom(toggleExpandedAtom);
    if (!isGroup) {
        return <span className="shrink-0 size-4" />;
    }
    return (
        <button
            className="shrink-0 size-4 text-foreground/60 hover:text-foreground rounded-xs flex items-center justify-center cursor-pointer"
            data-row-control
            onClick={(e) => { stop(e); toggle(id); }}
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
function SelectionCircle({ id, selected }: { id: string; selected: boolean; }) {
    const down = useSetAtom(circlePointerDownAtom);
    const move = useSetAtom(circlePointerMoveAtom);
    const up = useSetAtom(circlePointerUpAtom);

    return (
        <div
            className="shrink-0 w-8 h-full border-l border-foreground/5 flex items-center justify-center cursor-pointer touch-none"
            data-row-control
            onPointerDown={(e) => { if (e.button === 0) { down({ id, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, pointerId: e.pointerId, target: e.currentTarget }); } }}
            onPointerMove={(e) => move({ clientX: e.clientX, clientY: e.clientY })}
            onPointerUp={() => up()}
            onPointerCancel={() => up()}
            onClick={stop}
            onDoubleClick={stop}
            title="Select · drag across circles to toggle · [Shift] range · [Ctrl] toggle"
        >
            <span
                className={classNames("size-2.5 border border-foreground/60 rounded-full", selected && "bg-(--editor-accent) border-(--editor-accent) ring-2 ring-(--editor-accent)/30")}
            />
        </div>
    );
}
