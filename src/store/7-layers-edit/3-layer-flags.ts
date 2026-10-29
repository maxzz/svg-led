import { type SvgNode, setPresentation } from "@/svg-core";
import { getNodeProxy } from "../3-document";
import { LOCKED_ATTR, isHidden, isLocked } from "../6-layers";

/** The two per-layer switches of the Layers panel: the eye and the padlock */
export type LayerFlag = 'hidden' | 'locked';

export function hasLayerFlag(node: SvgNode, flag: LayerFlag): boolean {
    return flag === 'hidden' ? isHidden(node) : isLocked(node);
}

/** Sets one switch of a layer without a history commit, so a sweep across many rows becomes one undo step */
export function setLayerFlag(id: string, flag: LayerFlag, on: boolean): void {
    const node = getNodeProxy(id);
    if (!node || hasLayerFlag(node, flag) === on) {
        return;
    }
    if (flag === 'hidden') {
        setPresentation(node.attrs, 'display', on ? 'none' : undefined);
    } else if (on) {
        node.attrs[LOCKED_ATTR] = 'true';
    } else {
        delete node.attrs[LOCKED_ATTR];
    }
}
