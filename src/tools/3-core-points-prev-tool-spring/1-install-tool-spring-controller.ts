import { type AppStore } from "@/store/0-app-store";
import { isEditableTarget } from "@/commands";

import { activeToolIdAtom, toolGestureActiveAtom } from "@/store/4-editor";
import { pressSpringKeyAtom, releaseSpringKeyAtom, springGestureEndedAtom, springToolChangedAtom } from "./a-tool-spring-atoms";

/** Wires the Ctrl spring to the keyboard and to tool and drag changes; runs outside React */
export function installToolSpring(store: AppStore): () => void {
    const controller = new AbortController();

    const { signal } = controller;

    window.addEventListener('keydown',
        (e) => {
            if (isSpringKey(e) && !e.repeat && !isEditableTarget(e.target)) {
                store.set(pressSpringKeyAtom);
            }
        },
        { signal });

    window.addEventListener('keyup',
        (e) => {
            isSpringKey(e) && store.set(releaseSpringKeyAtom);
        },
        { signal });

    // Alt+Tab and similar never deliver the keyup
    window.addEventListener('blur',
        () => store.set(releaseSpringKeyAtom, true),
        { signal });

    store.set(springToolChangedAtom);
    
    const unsubTool = store.sub(activeToolIdAtom, () => store.set(springToolChangedAtom));
    const unsubGesture = store.sub(toolGestureActiveAtom, () => {
        store.get(toolGestureActiveAtom) || store.set(springGestureEndedAtom);
    });

    return () => {
        controller.abort();
        unsubTool();
        unsubGesture();
    };
}

function isSpringKey(e: KeyboardEvent): boolean {
    return e.key === 'Control' || e.key === 'Meta';
}
