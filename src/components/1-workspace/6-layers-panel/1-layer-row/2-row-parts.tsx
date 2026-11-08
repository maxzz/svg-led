import { type MouseEvent } from "react";
import { useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { ChevronRight } from "lucide-react";

import { type GroupNode } from "@/svg-core";
import { circlePointerDownAtom, circlePointerMoveAtom, circlePointerUpAtom } from "../9-atoms-layers-panel";
import { ContainsMarker, LayerRow } from "./0-all-layer-row";

/** Children of a group, the last one (topmost on the canvas) first */
export function GroupChildren({ group, count, depth, hiddenByParent, lockedByParent }: { group: GroupNode; count: number; depth: number; hiddenByParent: boolean; lockedByParent: boolean; }) {
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

export function ExpanderIcon({ isGroup, open, onToggle }: { isGroup: boolean; open: boolean; onToggle: () => void; }) {
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

//---------------------------------------------------------------------------

/** Click selects only this layer; dragging across circles toggles each one; Shift and Ctrl work as on the row */
export function SelectionCircleIcon({ id, selected, containsSelected }: { id: string; selected: boolean; containsSelected: boolean; }) {
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
            {containsSelected && <ContainsMarker />}
            <span
                className={classNames("-ml-3 size-2 border border-foreground/60 rounded-full", selected && "bg-(--editor-accent) border-(--editor-accent) ring-2 ring-(--editor-accent)/30")}
            />
        </div>
    );
}

//---------------------------------------------------------------------------

export function stop(e: MouseEvent) {
    e.stopPropagation();
}
