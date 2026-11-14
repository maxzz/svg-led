import { type SvgDoc, type SvgNode, activeClassDecls, applyClassDecls, classNamesOfStyle, deleteDefsClassMarkup, deleteDefsElementMarkup, findNode, hasClassToken, removeClassDecls, removeClassToken, styleAt, styleIndexesOf, walkNodes } from "@/svg-core";
import { commitHistory, docState, getNodeProxy } from "@/store/3-document";

/**
 * The elements a class of a `<defs>` element is applied to: the elements that share the parent of that `<defs>` element
 * (the document root or a group), and every element inside them, that list the class in their `class` attribute.
 * Pass `docState.doc` to get the proxies, to change them.
 */
export function classTargets(doc: SvgDoc, defsId: string, name: string): SvgNode[] {
    const loc = findNode(doc, defsId);
    const rv: SvgNode[] = [];
    loc && walkNodes(loc.siblings,
        (node) => {
            node.id !== defsId && hasClassToken(node.attrs, name) && rv.push(node);
        }
    );
    return rv;
}

/** True when Apply would change something: the class has declarations in effect, and elements use it */
export function canApplyDefsClass(doc: SvgDoc, defsId: string, styleIndex: number, name: string): boolean {
    const defs = findNode(doc, defsId)?.node;
    return (
        defs?.kind === 'passthrough' &&
        activeClassDecls(defs.inner, styleIndex, name).length > 0 &&
        classTargets(doc, defsId, name).length > 0
    );
}

//---------------------------------------------------------------------------

/**
 * Copies the declarations of a class onto the elements that use it (see `applyClassDecls`); one history step.
 * `removeClass` also takes the class name off those elements (see `removeClassToken`).
 */
export function applyDefsClass(defsId: string, styleIndex: number, name: string, options: { removeClass: boolean; }): boolean {
    const done = applyClassInDoc(defsId, styleIndex, name, options.removeClass);
    done && commitHistory();
    return done;
}

/** Applies one class without a history step; the caller commits */
function applyClassInDoc(defsId: string, styleIndex: number, name: string, removeClass: boolean): boolean {
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
        removeClass && removeClassToken(node.attrs, name);
    }
    return true;
}

//---------------------------------------------------------------------------
// Batch: every class of one or more `<style>` elements

/** A `<defs>` element (every `<style>` inside it, at any depth) or one `<style>` element inside a `<defs>` element */
export type StyleBatchTarget = { kind: 'defs'; id: string; } | { kind: 'defs-style'; defsId: string; index: number; };

/** The `<defs>` element of a batch, and the indexes of the `<style>` elements it covers */
export function styleBatchOf(doc: SvgDoc, target: StyleBatchTarget): { defsId: string; styleIndexes: number[]; } {
    if (target.kind === 'defs-style') {
        return { defsId: target.defsId, styleIndexes: [target.index] };
    }
    const node = findNode(doc, target.id)?.node;
    return { defsId: target.id, styleIndexes: node?.kind === 'passthrough' ? styleIndexesOf(node.inner) : [] };
}

/** Every class of the given `<style>` elements of a `<defs>` element, in order */
function batchClasses(doc: SvgDoc, defsId: string, styleIndexes: readonly number[]): { styleIndex: number; name: string; }[] {
    const node = findNode(doc, defsId)?.node;
    if (node?.kind !== 'passthrough') {
        return [];
    }
    return styleIndexes.flatMap((styleIndex) => classNamesOfStyle(node.inner, styleIndex).map((name) => ({ styleIndex, name })));
}

/** True when "Apply and remove" would change something for at least one class of the batch */
export function canApplyStyleBatch(doc: SvgDoc, target: StyleBatchTarget): boolean {
    const { defsId, styleIndexes } = styleBatchOf(doc, target);
    return batchClasses(doc, defsId, styleIndexes).some(({ styleIndex, name }) => canApplyDefsClass(doc, defsId, styleIndex, name));
}

/** "Apply and remove" for every class of the batch, in order; one history step */
export function applyStyleBatchAndRemove(target: StyleBatchTarget): boolean {
    const { defsId, styleIndexes } = styleBatchOf(docState.doc, target);
    return applyAndRemoveClasses(defsId, batchClasses(docState.doc, defsId, styleIndexes));
}

/**
 * "Apply and remove" for the given classes of a `<defs>` element, one history step:
 * - the declarations go onto the elements that use each class (`applyClassInDoc`);
 * - the rules of the applied classes leave their `<style>` elements;
 * - a `<style>` left without CSS goes, and so does the `<defs>` element when nothing is left in it.
 */
export function applyAndRemoveClasses(defsId: string, classes: readonly { styleIndex: number; name: string; }[]): boolean {
    const applied: { styleIndex: number; name: string; }[] = [];
    for (const c of classes) {
        applyClassInDoc(defsId, c.styleIndex, c.name, true) && applied.push(c);
    }
    if (!applied.length) {
        return false;
    }

    for (const { styleIndex, name } of applied) {
        changeDefsMarkup(defsId, (inner) => deleteDefsClassMarkup(inner, styleIndex, name));
    }

    // from the last style to the first, so the indexes of the styles before it stay valid
    const styleIndexes = [...new Set(applied.map((c) => c.styleIndex))].sort((a, b) => b - a);
    for (const styleIndex of styleIndexes) {
        changeDefsMarkup(defsId, (inner) => {
            const st = styleAt(inner, styleIndex);
            return st && !st.css.trim() ? deleteDefsElementMarkup(inner, styleIndex) : inner;
        });
    }

    const loc = findNode(docState.doc, defsId);
    if (loc?.node.kind === 'passthrough' && !loc.node.inner.trim()) {
        loc.siblings.splice(loc.index, 1);
    }

    commitHistory();
    return true;
}

//---------------------------------------------------------------------------

/** Removes the attributes that the rules of a class define from the elements that use it (see `removeClassDecls`); one history step */
export function removeDefsClassRules(defsId: string, styleIndex: number, name: string): boolean {
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
        removeClassDecls(node.attrs, decls);
    }

    commitHistory();
    return true;
}

//---------------------------------------------------------------------------

export function deleteDefsClass(defsId: string, styleIndex: number, name: string): boolean {
    return writeDefsMarkup(defsId, (inner) => deleteDefsClassMarkup(inner, styleIndex, name));
}

export function deleteDefsElement(defsId: string, index: number): boolean {
    return writeDefsMarkup(defsId, (inner) => deleteDefsElementMarkup(inner, index));
}

function writeDefsMarkup(defsId: string, change: (inner: string) => string): boolean {
    const done = changeDefsMarkup(defsId, change);
    done && commitHistory();
    return done;
}

/** Changes the inner markup of a `<defs>` element without a history step; the caller commits */
function changeDefsMarkup(defsId: string, change: (inner: string) => string): boolean {
    const node = getNodeProxy(defsId);
    if (node?.kind !== 'passthrough') {
        return false;
    }
    const inner = change(node.inner);
    if (inner === node.inner) {
        return false;
    }
    node.inner = inner;
    return true;
}

//---------------------------------------------------------------------------
