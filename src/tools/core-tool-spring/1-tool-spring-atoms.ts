import { atom, type Getter } from "jotai";
import { type HeldKeys, ToolId, activeToolIdAtom, setActiveToolAtom, toolGestureActiveAtom } from "@/store/4-editor";

/**
 * Spring-loaded Direct selection, like Illustrator: while the Pen is active, holding Ctrl (Cmd on macOS) switches
 * to the Direct selection tool, and releasing it returns to the Pen. The spring consumes Ctrl, so the Direct selection
 * tool sees plain clicks and drags: anchors move and empty canvas drags a marquee instead of adding or deleting points.
 */

/** Tools that hand Ctrl to the Direct selection tool while held */
const SPRING_FROM: readonly ToolId[] = [ToolId.pen];
const SPRING_TO = ToolId.points;

type Spring = {
    from: ToolId;                // tool to return to on release
    releasePending: boolean;     // Ctrl was released mid-drag; return once the drag ends
};

const springAtom = atom<Spring | null>(null);

/** True while Ctrl holds the Direct selection tool in place of the Pen */
export const toolSpringActiveAtom = atom((get) => get(springAtom) !== null);

/** Held keys as the active tool sees them: Ctrl is not reported while the spring holds it */
export function withoutSpringKey(get: Getter, keys: HeldKeys): HeldKeys {
    return keys.ctrl && get(toolSpringActiveAtom) ? { ...keys, ctrl: false } : keys;
}

export const pressSpringKeyAtom = atom(
    null,
    (get, set) => {
        const from = get(activeToolIdAtom);
        if (get(springAtom) || !SPRING_FROM.includes(from) || get(toolGestureActiveAtom)) {
            return;
        }
        set(springAtom, { from, releasePending: false });
        set(setActiveToolAtom, SPRING_TO);
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
        get(activeToolIdAtom) === SPRING_TO && set(setActiveToolAtom, spring.from);
    }
);

/** Called when a canvas drag ends: completes a release that came during the drag */
export const springGestureEndedAtom = atom(
    null,
    (get, set) => {
        get(springAtom)?.releasePending && set(releaseSpringKeyAtom);
    }
);

/** Called when the active tool changes: another tool picked while Ctrl is held stays active */
export const springToolChangedAtom = atom(
    null,
    (get, set) => {
        get(springAtom) && get(activeToolIdAtom) !== SPRING_TO && set(springAtom, null);
    }
);
