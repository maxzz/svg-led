import { type SvgDoc, type SvgNode, activeClassDecls, applyClassDecls, deleteDefsClassMarkup, deleteDefsElementMarkup, findNode, hasClassToken, removeClassToken, walkNodes } from "@/svg-core";
import { commitHistory, docState, getNodeProxy } from "@/store/3-document";

/**
 * The elements a class of a `<defs>` element is applied to: the elements that share the parent of that `<defs>` element
 * (the document root or a group), and every element inside them, that list the class in their `class` attribute.
 * Pass `docState.doc` to get the proxies, to change them.
 */
export function classTargets(doc: SvgDoc, defsId: string, name: string): SvgNode[] {
    const loc = findNode(doc, defsId);
    const rv: SvgNode[] = [];
    loc && walkNodes(loc.siblings, (node) => {
        node.id !== defsId && hasClassToken(node.attrs, name) && rv.push(node);
    });
    return rv;
}

/** True when Apply would change something: the class has declarations in effect, and elements use it */
export function canApplyDefsClass(doc: SvgDoc, defsId: string, styleIndex: number, name: string): boolean {
    const defs = findNode(doc, defsId)?.node;
    return defs?.kind === 'passthrough'
        && activeClassDecls(defs.inner, styleIndex, name).length > 0
        && classTargets(doc, defsId, name).length > 0;
}

/**
 * Copies the declarations of a class onto the elements that use it (see `applyClassDecls`); one history step.
 * `removeClass` also takes the class name off those elements (see `removeClassToken`).
 */
export function applyDefsClass(defsId: string, styleIndex: number, name: string, options: { removeClass: boolean; }): boolean {
    const defs = getNodeProxy(defsId);
    if (defs?.kind !== 'passthrough') {
        return false;
    }
    const decls = activeClassDecls(defs.inner, styleIndex, name);
    const targets = classTargets(docState.doc, defsId, name);
    if (!decls.length || !targets.length) {
        return false;
    }
    for (const node of targets) {
        applyClassDecls(node.attrs, decls);
        options.removeClass && removeClassToken(node.attrs, name);
    }
    commitHistory();
    return true;
}

export function deleteDefsClass(defsId: string, styleIndex: number, name: string): boolean {
    return writeDefsMarkup(defsId, (inner) => deleteDefsClassMarkup(inner, styleIndex, name));
}

export function deleteDefsElement(defsId: string, index: number): boolean {
    return writeDefsMarkup(defsId, (inner) => deleteDefsElementMarkup(inner, index));
}

function writeDefsMarkup(defsId: string, change: (inner: string) => string): boolean {
    const node = getNodeProxy(defsId);
    if (node?.kind !== 'passthrough') {
        return false;
    }
    const inner = change(node.inner);
    if (inner === node.inner) {
        return false;
    }
    node.inner = inner;
    commitHistory();
    return true;
}
