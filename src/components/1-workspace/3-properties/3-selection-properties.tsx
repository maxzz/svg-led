import { useAtomValue } from "jotai";
import { type SvgNode, findNode } from "@/svg-core";
import { useDocSnapshot } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { PROPERTY_SECTIONS } from "./1-sections/0-registry";

export function SelectionProperties() {
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
    if (!nodes.length) {
        return null;
    }

    return (<>
        <div className="select-none text-xs font-medium">
            {nodes.length === 1 ? nodeTitle(nodes[0]) : `${nodes.length} elements`}
        </div>
        {PROPERTY_SECTIONS.filter((s) => s.appliesTo(nodes)).map(({ id, Component }) => <Component ids={ids} nodes={nodes} key={id} />)}
    </>);
}

function nodeTitle(node: SvgNode): string {
    const tag = node.kind === 'passthrough' ? node.tag : node.kind === 'g' ? 'group' : node.kind;
    return node.attrs.id ? `${tag} #${node.attrs.id}` : tag;
}
