import { atom } from "jotai";
import { hoveredAnchorAtom, hoveredHandleAtom } from "@/tools/tool-3-points/2-points-cursor";
import { penHoverAnchorAtom } from "@/tools/tool-5-pen/a-pen-cursor";

/** A path anchor (`side` unset) or direction handle (`side` set) under the pointer; `key` is `subpath:anchor` */
export type PointRef = { nodeId: string; key: string; side?: 'in' | 'out'; };

/** The path point under the pointer: a Direct selection handle or anchor, or a Pen anchor; null over anything else */
export const hoveredPointRefAtom = atom<PointRef | null>((get) => {
    const handle = get(hoveredHandleAtom);
    if (handle) {
        return handle;
    }
    return get(hoveredAnchorAtom) ?? get(penHoverAnchorAtom);
});
