import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";

import { docState } from "@/store/3-document";
import { viewportAtom } from "@/store/4-editor";
import { isolationChainAtom } from "@/store/6-layers";
import { NodeView } from "./1-node-view";

/** Document content in document coordinates, placed by the viewport transform */
export function DocLayer() {
    const vp = useAtomValue(viewportAtom);
    const { doc } = useSnapshot(docState);
    const chain = useAtomValue(isolationChainAtom);
    const isolation = chain.length ? chain.map((c) => c.id).join(' ') : undefined;

    return (
        <g
            // Content outside the isolated group is dimmed and cannot be clicked; locked elements let clicks through to what is below
            className="**:data-isolation-dim:opacity-30 **:data-isolation-dim:pointer-events-none **:data-[locked=true]:pointer-events-none"
            transform={`matrix(${vp.zoom} 0 0 ${vp.zoom} ${vp.x} ${vp.y})`}
        >
            {doc.children.map(
                (_, i) => {
                    const node = docState.doc.children[i];
                    return node ? <NodeView key={node.id} node={node} isolation={isolation} /> : null;
                }
            )}
        </g>
    );
}
