import { atom } from "jotai";
import { type SvgNode, getPresentation, walkNodes } from "@/svg-core";
import { docState } from "@/store/3-document";
import { setSelectionAtom, zoomToSelectionAtom } from "@/store/4-editor";

export const isOpenFindOnCanvasAtom = atom(false);

export type FoundItem = {
    id: string;
    depth: number;
    title: string;               // tag plus id attribute
    details: string;             // class, fill, stroke; used for searching
};

function describe(node: SvgNode): Pick<FoundItem, 'title' | 'details'> {
    const tag = node.kind === 'passthrough' ? node.tag : node.kind;
    const idAttr = node.attrs.id ? ` #${node.attrs.id}` : '';
    const parts = [
        node.attrs.class && `.${node.attrs.class}`,
        getPresentation(node.attrs, 'fill') && `fill ${getPresentation(node.attrs, 'fill')}`,
        getPresentation(node.attrs, 'stroke') && `stroke ${getPresentation(node.attrs, 'stroke')}`,
        node.kind === 'g' && `${node.children.length} children`,
    ];
    return { title: `${tag}${idAttr}`, details: parts.filter(Boolean).join(', ') };
}

/** Snapshot of all elements when the dialog opens; the document does not change while it is open */
export const foundItemsAtom = atom<FoundItem[]>(
    (get) => {
        if (!get(isOpenFindOnCanvasAtom)) {
            return [];
        }
        const rv: FoundItem[] = [];
        walkNodes(docState.doc.children, (node, parents) => {
            rv.push({ id: node.id, depth: parents.length, ...describe(node) });
        });
        return rv;
    }
);

export const selectFoundItemAtom = atom(
    null,
    (_get, set, id: string) => {
        set(isOpenFindOnCanvasAtom, false);
        set(setSelectionAtom, [id]);
        set(zoomToSelectionAtom);
    }
);
