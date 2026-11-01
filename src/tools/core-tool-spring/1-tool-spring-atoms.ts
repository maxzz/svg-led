import { atom } from "jotai";
import { ToolId, activeToolIdAtom, setActiveToolAtom, toolGestureActiveAtom } from "@/store/4-editor";

/**
 * Spring-loaded selection tool, like Illustrator: while the Pen is active, holding Ctrl (Cmd on macOS) switches
 * to the Selection or Direct selection tool, whichever was used last, and releasing it returns to the Pen.
 */

type SelectionToolId = typeof ToolId.select | typeof ToolId.points;

/** Tools that hand Ctrl to a selection tool while held */
const SPRING_FROM: readonly ToolId[] = [ToolId.pen];

function isSelectionTool(id: ToolId): id is SelectionToolId {
    return id === ToolId.select || id === ToolId.points;
}

/** The selection tool that was active last; the spring switches to it */
const lastSelectionToolAtom = atom<SelectionToolId>(ToolId.select);

type Spring = {
    from: ToolId;                // tool to return to on release
    to: SelectionToolId;         // tool shown while Ctrl is held
    releasePending: boolean;     // Ctrl was released mid-drag; return once the drag ends
};

const springAtom = atom<Spring | null>(null);

/** True while Ctrl holds a selection tool in place of the Pen */
export const toolSpringActiveAtom = atom((get) => get(springAtom) !== null);

export const pressSpringKeyAtom = atom(
    null,
    (get, set) => {
        const from = get(activeToolIdAtom);
        if (get(springAtom) || !SPRING_FROM.includes(from) || get(toolGestureActiveAtom)) {
            return;
        }
        const to = get(lastSelectionToolAtom);
        set(springAtom, { from, to, releasePending: false });
        set(setActiveToolAtom, to);
    }
);

/** Returns to the tool that was active before Ctrl; a drag in progress finishes first unless `force` is set */
export const releaseSpringKeyAtom = atom(
    null,
    (get, set, force?: boolean) => {
        const spring = get(springAtom);
        if (!spring) {
            return;
        }
        if (!force && get(toolGestureActiveAtom)) {
            spring.releasePending || set(springAtom, { ...spring, releasePending: true });
            return;
        }
        set(springAtom, null);
        get(activeToolIdAtom) === spring.to && set(setActiveToolAtom, spring.from);
    }
);

/** Called when a canvas drag ends: completes a release that came during the drag */
export const springGestureEndedAtom = atom(
    null,
    (get, set) => {
        get(springAtom)?.releasePending && set(releaseSpringKeyAtom);
    }
);

/** Called when the active tool changes: remembers the selection tool, and drops the spring if another tool was picked */
export const springToolChangedAtom = atom(
    null,
    (get, set) => {
        const id = get(activeToolIdAtom);
        isSelectionTool(id) && get(lastSelectionToolAtom) !== id && set(lastSelectionToolAtom, id);

        const spring = get(springAtom);
        spring && id !== spring.to && set(springAtom, null);
    }
);
