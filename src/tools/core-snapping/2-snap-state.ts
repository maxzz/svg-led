import { atom } from "jotai";
import { appSettings } from "@/store/1-ui-settings";
import { appStore } from "@/store/0-app-store";
import { viewportAtom } from "@/store/4-editor";
import { type SnapGuide } from "./1-snap-engine";

/** Guides shown while a drag is snapping; empty when nothing is snapped */
export const snapGuidesAtom = atom<SnapGuide[]>([]);

/** Snap distance in screen pixels, converted to document units at the current zoom */
const SNAP_DISTANCE_PX = 6;

export function snapThreshold(): number {
    return SNAP_DISTANCE_PX / appStore.get(viewportAtom).zoom;
}

/** Snapping is on while the Preferences toggle is on, or while the snap key (Ctrl) is held during a drag */
export function snapActive(snapKeyHeld: boolean): boolean {
    return appSettings.prefs.snapToObjects || snapKeyHeld;
}

export function setSnapGuides(guides: SnapGuide[]): void {
    appStore.set(snapGuidesAtom, guides);
}

export function clearSnapGuides(): void {
    if (appStore.get(snapGuidesAtom).length) {
        appStore.set(snapGuidesAtom, []);
    }
}
