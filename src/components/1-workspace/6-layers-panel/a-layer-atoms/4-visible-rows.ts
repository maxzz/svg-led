import { type SvgNode, walkNodes } from "@/svg-core";
import { docState } from "@/store/3-document";

//---------------------------------------------------------------------------
// Visible rows

/** Rows of the tree: the isolated objects, or the top-level elements, listed topmost first as in Adobe apps */
export function treeRootNodes(scope: readonly string[]): SvgNode[] {
    if (!scope.length) {
        return [...docState.doc.children].reverse();
    }
    const ids = new Set(scope);
    const found: SvgNode[] = [];
    walkNodes(docState.doc.children, (node) => {
        if (!ids.has(node.id)) {
            return;
        }
        found.push(node);
        return false; // a descendant of an isolated object is shown under it, not as another root
    });
    return found.reverse();
}

/**
 * Whether a group row shows its children.
 * An isolated object starts open; collapsing it is stored until the next time isolation is entered.
 * One isolated group is the Isolation Mode row, so its children follow this too.
 */
export function isOpenRow(id: string, expanded: ReadonlySet<string>, scope: readonly string[], collapsed: ReadonlySet<string>): boolean {
    return scope.includes(id) ? !collapsed.has(id) : expanded.has(id);
}

/** Ids of the rows as they are shown, top to bottom. Several isolated objects sit under a row that has no id of its own. */
export function visibleRowIds(expanded: ReadonlySet<string>, scope: readonly string[], collapsed: ReadonlySet<string>, manyOpen: boolean): string[] {
    const rv: string[] = [];
    const visit = (nodes: readonly SvgNode[]) => {
        for (const node of nodes) {
            rv.push(node.id);
            if (node.kind === 'g' && isOpenRow(node.id, expanded, scope, collapsed)) {
                visit([...node.children].reverse());
            }
        }
    };
    if (!scope.length) {
        visit([...docState.doc.children].reverse());
        return rv;
    }
    // Several isolated objects are hidden while their Isolation Mode row is collapsed
    if (scope.length > 1 && !manyOpen) {
        return rv;
    }
    visit(treeRootNodes(scope));
    return rv;
}
