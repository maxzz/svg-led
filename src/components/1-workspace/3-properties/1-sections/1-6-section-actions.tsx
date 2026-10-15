import { type ReactNode } from "react";
import { useSetAtom, useStore } from "jotai";
import { ArrowDown, ArrowUp, BringToFront, Copy, Frame, Group, SendToBack, Spline, Trash, Ungroup } from "lucide-react";
import { displayShortcut, getCommand, runCommandAtom } from "@/commands";
import { Section, optionButtonClasses } from "../2-controls/2-section";
import { type SectionProps } from "./9-registry";

//---------------------------------------------------------------------------
// Layers and actions

export function ActionsSection(_props: SectionProps) {
    return (<>
        <Section title="Layers">
            <div className="flex gap-1">
                <ActionButton id="object.back"><SendToBack className="size-3.5" /></ActionButton>
                <ActionButton id="object.backward"><ArrowDown className="size-3.5" /></ActionButton>
                <ActionButton id="object.forward"><ArrowUp className="size-3.5" /></ActionButton>
                <ActionButton id="object.front"><BringToFront className="size-3.5" /></ActionButton>
            </div>
        </Section>

        <Section title="Actions">
            <div className="flex flex-wrap gap-1">
                <ActionButton id="edit.duplicate"><Copy className="size-3.5" /></ActionButton>
                <ActionButton id="edit.delete"><Trash className="size-3.5" /></ActionButton>
                <ActionButton id="object.group"><Group className="size-3.5" /></ActionButton>
                <ActionButton id="object.ungroup"><Ungroup className="size-3.5" /></ActionButton>
                <ActionButton id="object.convertToPath"><Spline className="size-3.5" /></ActionButton>
                <ActionButton id="viewbox.fitSelection"><Frame className="size-3.5" /></ActionButton>
            </div>
        </Section>
    </>);
}

function ActionButton({ id, children }: { id: string; children: ReactNode; }) {
    const store = useStore();
    const run = useSetAtom(runCommandAtom);
    
    const cmd = getCommand(id);
    if (!cmd) {
        return null;
    }

    const enabled = !cmd.enabled || cmd.enabled(store.get);
    const title = cmd.shortcut ? `${cmd.label} — ${displayShortcut(cmd.shortcut)}` : cmd.label;

    return (
        <button className={optionButtonClasses} disabled={!enabled} title={title} aria-label={cmd.label} onClick={() => run(id)} type="button">
            {children}
        </button>
    );
}
