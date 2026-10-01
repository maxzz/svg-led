import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { docState } from "@/store/3-document";
import { viewportAtom } from "@/store/4-editor";
import { NodeView } from "./2-node-view";

/** Document content in document coordinates, placed by the viewport transform */
export function DocLayer() {
    const vp = useAtomValue(viewportAtom);
    const { doc } = useSnapshot(docState);

    return (
        <g transform={`matrix(${vp.zoom} 0 0 ${vp.zoom} ${vp.x} ${vp.y})`}>
            {doc.children.map((_, i) => {
                const node = docState.doc.children[i];
                return node ? <NodeView key={node.id} node={node} /> : null;
            })}
        </g>
    );
}
