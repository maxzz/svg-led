import { atom } from "jotai";
import { type PointRef, pointFocusAtom } from "@/store/4-editor";
import { hoveredAnchorAtom, hoveredHandleAtom } from "@/tools/tool-3-points/2-points-cursor";
import { penHoverAnchorAtom } from "@/tools/tool-5-pen/a-pen-cursor";

/**
 * The path point the coordinate display shows: the point under the pointer (Direct selection handle or anchor, or Pen anchor);
 * otherwise the point the pointer grabbed, which stays while it is dragged and after release; null when neither applies.
 */
export const shownPointRefAtom = atom<PointRef | null>((get) => {
    const handle = get(hoveredHandleAtom);
    if (handle) {
        return handle;
    }
    return get(hoveredAnchorAtom) ?? get(penHoverAnchorAtom) ?? get(pointFocusAtom);
});
