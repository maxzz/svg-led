import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Group } from "lucide-react";

import { findNode } from "@/svg-core";
import { docState } from "@/store/3-document";
import { isHidden, isLocked, isolatedIdAtom, isolationChainAtom } from "@/store/6-layers";
import { LayerRow } from "./1-1-layer-row";

/** The layers of the document, or only the isolated group and its contents in isolation mode */
export function LayersTree() {
    const isolatedId = useAtomValue(isolatedIdAtom);
    return (
        isolatedId
            ? <IsolatedTree />
            : <DocumentTree />
    );
}

//---------------------------------------------------------------------------

function DocumentTree() {
    const { doc } = useSnapshot(docState);
    if (!doc.children.length) {
        return <div className="p-3 text-muted-foreground">No layers yet. Draw something or paste SVG markup.</div>;
    }

    // reading every child snapshot (not only the count) re-renders the tree when undo replaces nodes with equal-looking copies
    const rows = doc.children.map(
        (_, i) => {
            const node = docState.doc.children[i];
            return node && <LayerRow key={node.id} node={node} depth={0} hiddenByParent={false} lockedByParent={false} />;
        }
    );
    return <>{rows.reverse()}</>;
}

//---------------------------------------------------------------------------

/** Illustrator shows an "Isolation Mode" row above the isolated group */
function IsolatedTree() {
    const chain = useAtomValue(isolationChainAtom);
    const loc = findNode(docState.doc, chain.at(-1)?.id ?? ''); // proxies, so the rows subscribe to their own nodes
    if (!loc) {
        return null;
    }

    return (<>
        <div className="select-none px-2 h-7 text-muted-foreground border-b border-foreground/5 flex items-center gap-1.5">
            <Group className="size-3.5" />
            Isolation Mode
        </div>
        <LayerRow key={loc.node.id} node={loc.node} depth={1} hiddenByParent={loc.parents.some(isHidden)} lockedByParent={loc.parents.some(isLocked)} />
    </>);
}
