import { type Attrs, type SvgNode, findNode, getPresentation } from "@/svg-core";
import { dashSettingFromArray, lastCornerRadiusAtom, lastDashSettingAtom, lastStrokeWidthAtom, lastStyleAtom } from "../2-persist";
import { type AppStore } from "../0-app-store";
import { docState } from "../3-document";
import { selectionAtom } from "../4-editor";

/**
 * Selecting a shape makes its style the last used one, so new shapes are drawn like the selected shape
 * (its stroke, fill, width, dash, caps, joins, opacity and rectangle corner radius). Follows the last selected element.
 */
export function installStyleFromSelection(store: AppStore): () => void {
    return store.sub(selectionAtom, () => {
        const ids = store.get(selectionAtom);
        const id = ids[ids.length - 1];
        const loc = id ? findNode(docState.doc, id) : undefined;
        if (loc) {
            adoptStyle(store, loc.node);
        }
    });
}

function adoptStyle(store: AppStore, node: SvgNode): void {
    const attrs = node.attrs;
    const width = Number.parseFloat(getPresentation(attrs, 'stroke-width') ?? '') || 1;
    const opacity = Number.parseFloat(getPresentation(attrs, 'opacity') ?? '');

    store.set(lastStrokeWidthAtom, width);
    store.set(lastStyleAtom, {
        stroke: getPresentation(attrs, 'stroke') ?? 'none',
        fill: getPresentation(attrs, 'fill') ?? '#000000', // SVG paints a shape without a fill attribute black
        linecap: getPresentation(attrs, 'stroke-linecap') ?? 'butt',
        linejoin: getPresentation(attrs, 'stroke-linejoin') ?? 'miter',
        opacity: Number.isNaN(opacity) ? 1 : opacity,
    });
    store.set(lastDashSettingAtom, dashSettingFromArray(getPresentation(attrs, 'stroke-dasharray'), width));

    if (node.kind === 'rect') {
        adoptCorner(store, node);
    }
}

/** A radius equal to half the size is either a clamped value or a pill; clamped ones are not the user's choice, so keep the remembered one */
function adoptCorner(store: AppStore, node: { rx: number; ry: number; width: number; height: number; }): void {
    const rx = node.rx < node.width / 2 ? node.rx : undefined;
    const ry = node.ry < node.height / 2 ? node.ry : undefined;
    if (rx !== undefined || ry !== undefined) {
        store.set(lastCornerRadiusAtom, { ...(rx !== undefined ? { rx } : {}), ...(ry !== undefined ? { ry } : {}) });
    }
}
