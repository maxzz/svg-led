import { useAtomValue } from "jotai";
import { type SvgNode, findNode } from "@/svg-core";
import { useDocSnapshot } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { PROPERTY_SECTIONS } from "./1-sections/9-registry";

/** Selected nodes that exist in the document, with their ids */
export function useSelectedNodes(): { ids: string[]; nodes: SvgNode[]; } {
    const doc = useDocSnapshot();
    const selection = useAtomValue(selectionAtom);
    const ids: string[] = [];
    const nodes: SvgNode[] = [];

    for (const id of selection) {
        const loc = findNode(doc, id);
        if (loc) {
            ids.push(id);
            nodes.push(loc.node);
        }
    }
    return { ids, nodes };
}

/** Name shown in the Properties header: the element's tag and id, or the count for a multi-selection */
export function selectionTitle(nodes: SvgNode[]): string | null {
    if (!nodes.length) return null;
    return nodes.length === 1 ? nodeTitle(nodes[0]) : `${nodes.length} elements`;
}

export function SelectionProperties() {
    const { ids, nodes } = useSelectedNodes();

    if (!nodes.length) {
        return null;
    }

    return (<>
        {PROPERTY_SECTIONS.filter((s) => s.appliesTo(nodes)).map(
            ({ id, Component }) => <Component mode="selection" ids={ids} nodes={nodes} key={id} />
        )}
    </>);
}

function nodeTitle(node: SvgNode): string {
    const tag = node.kind === 'passthrough' ? node.tag : node.kind === 'g' ? 'group' : node.kind;
    return node.attrs.id ? `${tag} #${node.attrs.id}` : tag;
}
