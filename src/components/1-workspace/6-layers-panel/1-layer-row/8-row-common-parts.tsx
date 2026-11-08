import { type MouseEvent } from "react";
import { useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { Braces, ChevronRight, Eye, EyeOff } from "lucide-react";

import { LAYER_ICON_PX, circlePointerDownAtom, circlePointerMoveAtom, circlePointerUpAtom } from "../9-atoms-layers-panel";

//---------------------------------------------------------------------------

export function Expander_Icon({ isGroup, open, onToggle }: { isGroup: boolean; open: boolean; onToggle: () => void; }) {
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

/** Eye of a row: shows whether the item is on; a click turns it off or on. A disabled eye shows the state only. */
export function EyeToggle_Icon({ on, title, disabled, onToggle }: { on: boolean; title: string; disabled?: boolean; onToggle: () => void; }) {
    const Icon = on ? Eye : EyeOff;
    return (
        <button
            className={classNames(
                "shrink-0 w-7 text-foreground/70 border-r border-foreground/5 flex items-center justify-center",
                disabled ? "opacity-35 cursor-default" : "hover:text-foreground cursor-pointer",
            )}
            data-row-control
            disabled={disabled}
            onClick={(e) => { stop(e); !disabled && onToggle(); }}
            onDoubleClick={stop}
            title={title}
            type="button"
        >
            <Icon className="size-3.5" />
        </button>
    );
}

//---------------------------------------------------------------------------

/** Click selects only this layer; dragging across circles toggles each one; Shift and Ctrl work as on the row */
export function SelectionCircle_Icon({ id, selected, containsSelected }: { id: string; selected: boolean; containsSelected: boolean; }) {
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

/** Selection circle of a `<defs>` item; the same look as the one of a layer row */
export function SelectionCircle_Defs_Icon({ selected, containsSelected, onSelect }: { selected: boolean; containsSelected: boolean; onSelect: () => void; }) {
    return (
        <div
            className="relative shrink-0 w-9 h-full border-l border-foreground/5 flex items-center justify-center cursor-pointer touch-none"
            data-row-control
            onClick={(e) => { stop(e); onSelect(); }}
            onDoubleClick={stop}
            title="Select"
        >
            {containsSelected && <ContainsMarker />}
            <span className={classNames("-ml-3 size-2 border border-foreground/60 rounded-full", selected && "bg-(--editor-accent) border-(--editor-accent) ring-2 ring-(--editor-accent)/30")} />
        </div>
    );
}

/** The small preview box of a `<defs>` item, the same size as a layer thumbnail */
export function Defs_Icon({ icon: Icon }: { icon: typeof Braces; }) {
    return (
        <div
            className="shrink-0 bg-white ring-1 ring-foreground/15 rounded-xs flex items-center justify-center"
            style={{ width: LAYER_ICON_PX, height: LAYER_ICON_PX }}
        >
            <Icon className="size-3.5 text-neutral-600" />
        </div>
    );
}

//---------------------------------------------------------------------------

export function stop(e: MouseEvent) {
    e.stopPropagation();
}

//---------------------------------------------------------------------------

/** Small square right of the selection circle: a selected item is inside this row */
function ContainsMarker() {
    return (
        <span
            className="absolute left-[calc(50%+4px)] top-1/2 -translate-y-1/2 size-1.5 rounded-xs bg-(--editor-accent)/40 border-(--editor-accent)/80 border"
            title="Contains selected items"
        />
    );
}
