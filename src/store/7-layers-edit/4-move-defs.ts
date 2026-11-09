import { type DefsClassDrop, type DefsElementDrop, moveDefsClassMarkup, moveDefsElementMarkup } from "@/svg-core";
import { commitHistory, getNodeProxy } from "../3-document";

/**
 * Moves a top-level element of a `<defs>` element (a `<style>` included) to `to`, which may be in another `<defs>` element.
 * One history step. Returns false when nothing changed.
 */
export function moveDefsElement(from: { defsId: string; root: number; }, to: { defsId: string; drop: DefsElementDrop; }): boolean {
    const src = getNodeProxy(from.defsId);
    const dst = getNodeProxy(to.defsId);
    if (src?.kind !== 'passthrough' || dst?.kind !== 'passthrough') {
        return false;
    }
    const same = from.defsId === to.defsId;
    const r = moveDefsElementMarkup(src.inner, from.root, same ? undefined : dst.inner, to.drop);
    if (!r) {
        return false;
    }
    src.inner = r.src;
    if (!same) {
        dst.inner = r.dst;
    }
    commitHistory();
    return true;
}

/**
 * Moves a class (its rules) out of a `<style>` element to `to`, which may be another `<style>` element in another `<defs>`.
 * One history step. Returns false when nothing changed.
 */
export function moveDefsClass(from: { defsId: string; styleIndex: number; name: string; }, to: { defsId: string; drop: DefsClassDrop; }): boolean {
    const src = getNodeProxy(from.defsId);
    const dst = getNodeProxy(to.defsId);
    if (src?.kind !== 'passthrough' || dst?.kind !== 'passthrough') {
        return false;
    }
    const same = from.defsId === to.defsId;
    const r = moveDefsClassMarkup(src.inner, from, same ? undefined : dst.inner, to.drop);
    if (!r) {
        return false;
    }
    src.inner = r.src;
    if (!same) {
        dst.inner = r.dst;
    }
    commitHistory();
    return true;
}
