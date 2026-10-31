import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { Group } from "lucide-react";

import { type NodeLocation, findNode, walkNodes } from "@/svg-core";
import { docState } from "@/store/3-document";
import { isHidden, isLocked, isolationScopeAtom } from "@/store/6-layers";
import { LayerRow } from "./1-1-layer-row";

/** The layers of the document, or only the isolated objects and their contents in isolation mode */
export function LayersTree() {
    const scope = useAtomValue(isolationScopeAtom);
    return (
        scope.length
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

/** Illustrator shows an "Isolation Mode" row above the isolated objects */
function IsolatedTree() {
    const scope = useAtomValue(isolationScopeAtom);
    const roots = isolatedRoots(scope);
    if (!roots.length) {
        return null;
    }

    return (<>
        <div className="select-none px-2 h-7 text-muted-foreground border-b border-foreground/5 flex items-center gap-1.5">
            <Group className="size-3.5" />
            Isolation Mode
        </div>
        {roots.map((loc) => (
            <LayerRow key={loc.node.id} node={loc.node} depth={1} hiddenByParent={loc.parents.some(isHidden)} lockedByParent={loc.parents.some(isLocked)} />
        ))}
    </>);
}

/** Isolated objects in layer order (topmost first). A child of an isolated object is listed under it, not again here. */
function isolatedRoots(scope: readonly string[]): NodeLocation[] {
    const ids = new Set(scope);
    const found: NodeLocation[] = [];
    walkNodes(docState.doc.children, (node) => {
        if (!ids.has(node.id)) {
            return;
        }
        const loc = findNode(docState.doc, node.id);
        loc && found.push(loc);
        return false;
    });
    return found.reverse();
}
