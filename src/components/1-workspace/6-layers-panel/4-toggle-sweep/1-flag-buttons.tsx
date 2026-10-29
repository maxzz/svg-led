import { type ComponentType, type SyntheticEvent } from "react";
import { useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toggleHiddenAtom, toggleLockedAtom } from "@/store/6-layers";
import { type LayerFlag } from "@/store/7-layers-edit";
import { sweepDownAtom, sweepMoveAtom, sweepUpAtom } from "./9-atoms-toggle-sweep";

/** Eye button of a layer row; dimmed when a group around the layer is hidden */
export function VisibilityButton({ id, hidden, inherited }: { id: string; hidden: boolean; inherited: boolean; }) {
    return (
        <FlagButton
            id={id}
            flag="hidden"
            icon={hidden ? EyeOff : Eye}
            iconClassName={classNames(inherited && !hidden && "opacity-35")}
            title={`${hidden ? "Show" : "Hide"} · drag up or down to apply to more rows`}
        />
    );
}

/** Padlock of a layer row; shown faint on hover so the cell can be found */
export function LockButton({ id, locked, inherited }: { id: string; locked: boolean; inherited: boolean; }) {
    return (
        <FlagButton
            id={id}
            flag="locked"
            icon={Lock}
            iconClassName={locked ? "opacity-100" : inherited ? "opacity-35" : "opacity-0 group-hover/row:opacity-10"}
            title={`${locked ? "Unlock" : "Lock"} · drag up or down to apply to more rows`}
        />
    );
}

type FlagButtonProps = {
    id: string;
    flag: LayerFlag;
    icon: ComponentType<{ className?: string; }>;
    iconClassName?: string;
    title: string;
};

function FlagButton({ id, flag, icon: Icon, iconClassName, title }: FlagButtonProps) {
    const down = useSetAtom(sweepDownAtom);
    const move = useSetAtom(sweepMoveAtom);
    const up = useSetAtom(sweepUpAtom);
    const toggle = useSetAtom(flag === 'hidden' ? toggleHiddenAtom : toggleLockedAtom);

    return (
        <button
            className="shrink-0 w-7 h-full text-foreground/70 hover:text-foreground border-r border-foreground/5 flex items-center justify-center cursor-pointer touch-none"
            data-row-control
            onPointerDown={(e) => down({ id, flag, button: e.button, pointerId: e.pointerId, clientY: e.clientY, target: e.currentTarget })}
            onPointerMove={(e) => move({ clientY: e.clientY })}
            onPointerUp={() => up()}
            onPointerCancel={() => up()}
            onClick={(e) => { stop(e); e.detail === 0 && toggle(id); }} // pointer clicks are handled on pointer down; this is Enter or Space
            onDoubleClick={stop}
            title={title}
            type="button"
        >
            <Icon className={classNames("size-3.5", iconClassName)} />
        </button>
    );
}

function stop(e: SyntheticEvent) {
    e.stopPropagation();
}
