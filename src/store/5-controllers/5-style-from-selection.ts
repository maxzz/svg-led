import { type Attrs, findNode, getPresentation } from "@/svg-core";
import { dashSettingFromArray, lastDashSettingAtom, lastStrokeWidthAtom, lastStyleAtom } from "../2-persist";
import { type AppStore } from "../0-app-store";
import { docState } from "../3-document";
import { selectionAtom } from "../4-editor";

/**
 * Selecting a shape makes its style the last used one, so new shapes are drawn like the selected shape
 * (its stroke, fill, width, dash, caps, joins and opacity). Follows the last selected element.
 */
export function installStyleFromSelection(store: AppStore): () => void {
    return store.sub(selectionAtom, () => {
        const ids = store.get(selectionAtom);
        const id = ids[ids.length - 1];
        const loc = id ? findNode(docState.doc, id) : undefined;
        if (loc) {
            adoptStyle(store, loc.node.attrs);
        }
    });
}

function adoptStyle(store: AppStore, attrs: Attrs): void {
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
}
