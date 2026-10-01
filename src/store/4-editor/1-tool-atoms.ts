import { type Getter, type Setter, atom } from "jotai";
import { STORAGE_KEYS, atomWithStoredOptions } from "../2-persist";
import { selectedAnchorsAtom } from "./2-selection-atoms";

export const ToolId = {
    hand: 'hand',
    select: 'select',
    points: 'points',
    rectangle: 'rectangle',
    ellipse: 'ellipse',
    line: 'line',
    pen: 'pen',
} as const;

export type ToolId = typeof ToolId[keyof typeof ToolId];

type ToolbarState = {
    tool: string;
    locked: boolean;             // keep a drawing tool active after a shape is drawn
};

/** Persisted under its own key: svg-led__toolbar__v1 */
export const toolbarStateAtom = atomWithStoredOptions<ToolbarState>(STORAGE_KEYS.toolbar, { tool: ToolId.select, locked: false });

/** Read-only view; switch tools with setActiveToolAtom so the old tool can finish its work */
export const activeToolIdAtom = atom(
    (get) => {
        const id = get(toolbarStateAtom).tool;
        return (Object.values(ToolId) as string[]).includes(id) ? id as ToolId : ToolId.select;
    }
);

type DeactivateHook = (get: Getter, set: Setter) => void;

const deactivateHooks = new Map<ToolId, DeactivateHook>();

/** The tool registry registers tools that must finish work (e.g. the pen draft) before another tool starts */
export function registerToolDeactivate(id: ToolId, hook: DeactivateHook): void {
    deactivateHooks.set(id, hook);
}

export const setActiveToolAtom = atom(
    null,
    (get, set, id: ToolId) => {
        const current = get(activeToolIdAtom);
        if (current === id) {
            return;
        }
        deactivateHooks.get(current)?.(get, set);
        set(toolbarStateAtom, { tool: id });
        if (id !== ToolId.points) {
            set(selectedAnchorsAtom, []);
        }
    }
);

export const toolLockedAtom = atom(
    (get) => get(toolbarStateAtom).locked,
    (_get, set, locked: boolean) => set(toolbarStateAtom, { locked })
);

/** Points mode is the Illustrator Direct Selection: anchors and handles of the selected elements are editable */
export const isPointsModeAtom = atom((get) => get(activeToolIdAtom) === ToolId.points);
