import { type Getter, type Setter } from "jotai";
import { type LucideIcon, PaintBucket, Scan, Trash } from "lucide-react";
import { type SvgDoc, findNode } from "@/svg-core";
import { deleteNodes, docState } from "@/store/3-document";
import { defsSelectionAtom, selectionAtom, setDefsSelectionAtom, setSelectionAtom } from "@/store/4-editor";
import { docProxyAtom, enterIsolationAtom, getIsolationScope, isLocked, sameIsolationIds } from "@/store/6-layers";
import { type LayersMenuTarget, type LayersMenuTargetKind, type LayersMenuTargetOf } from "./1-menu-target";
import { applyDefsClass, canApplyDefsClass, deleteDefsClass, deleteDefsElement } from "./2-menu-actions";

type CommandSpec<K extends LayersMenuTargetKind> = {
    id: string;
    label: string;
    icon: LucideIcon;
    /** Kinds of rows the command is listed for */
    targets: readonly K[];
    /** Commands of different sections are separated by a line; the menu keeps the order of the registry */
    section: string;
    destructive?: boolean;
    /** Read with `get`, so the menu follows changes while it is open; the command is enabled when omitted */
    enabled?: (get: Getter, target: LayersMenuTargetOf<K>) => boolean;
    run: (get: Getter, set: Setter, target: LayersMenuTargetOf<K>) => void;
};

export type LayersMenuCommand = CommandSpec<LayersMenuTargetKind>;

/** Typed entry: `target` in `enabled` and `run` is narrowed to the kinds listed in `targets` */
function command<K extends LayersMenuTargetKind>(spec: CommandSpec<K>): LayersMenuCommand {
    return spec as unknown as LayersMenuCommand;
}

/** Commands of the layers context menu, in menu order. Add an entry here to add a command. */
export const layersMenuCommands: readonly LayersMenuCommand[] = [
    command({
        id: 'layers.isolate',
        label: "Isolation Mode",
        icon: Scan,
        targets: ['shape'],
        section: 'view',
        enabled: (get, t) => !sameIsolationIds([t.id], getIsolationScope(get)),
        run: (_get, set, t) => set(enterIsolationAtom, t.id),
    }),

    command({
        id: 'layers.applyClass',
        label: "Apply",
        icon: PaintBucket,
        targets: ['defs-class'],
        section: 'edit',
        enabled: (get, t) => canApplyDefsClass(docOf(get), t.defsId, t.styleIndex, t.name),
        run: (_get, _set, t) => applyDefsClass(t.defsId, t.styleIndex, t.name),
    }),

    command({
        id: 'layers.delete',
        label: "Delete",
        icon: Trash,
        targets: ['element'],
        section: 'delete',
        destructive: true,
        enabled: (get, t) => canDeleteNode(get, t.id),
        run: (get, set, t) => {
            deleteNodes([t.id]);
            set(setSelectionAtom, get(selectionAtom).filter((id) => findNode(docState.doc, id)));
        },
    }),

    command({
        id: 'layers.deleteDefsItem',
        label: "Delete",
        icon: Trash,
        targets: ['defs-class', 'defs-element'],
        section: 'delete',
        destructive: true,
        run: (get, set, t) => {
            const done = t.kind === 'defs-class' ? deleteDefsClass(t.defsId, t.styleIndex, t.name) : deleteDefsElement(t.defsId, t.index);
            // item ids are positions in the markup, so they can name other items now
            done && get(defsSelectionAtom).length && set(setDefsSelectionAtom, []);
        },
    }),
];

export function commandsFor(target: LayersMenuTarget): LayersMenuCommand[] {
    return layersMenuCommands.filter((c) => c.targets.includes(target.kind));
}

//---------------------------------------------------------------------------

function docOf(get: Getter): SvgDoc {
    return get(docProxyAtom).doc as unknown as SvgDoc;
}

/** A locked layer (or one in a locked group) stays, and so does the isolated object itself */
function canDeleteNode(get: Getter, id: string): boolean {
    const loc = findNode(docOf(get), id);
    return !!loc && ![loc.node, ...loc.parents].some(isLocked) && !getIsolationScope(get).includes(id);
}
