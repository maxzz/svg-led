import { atom } from "jotai";
import { snapshot, subscribe } from "valtio";

/**
 * A Jotai atom that reads a Valtio proxy.
 *
 * `jotai-valtio`'s `atomWithProxy` keeps the snapshot taken when the atom is created.
 * Module init happens before the saved document is loaded, so a full page load reads an
 * empty document. Isolation then stays unavailable: the menu item, the layers button and
 * the breadcrumb bar all consult that snapshot. The embedded browser hot-reloads the
 * module after the document exists, so the same atom works there.
 *
 * This atom snapshots the proxy at read time, and again after every change.
 */
export function atomWithValtio<T extends object>(proxyObject: T) {
    const versionAtom = atom(0);
    versionAtom.onMount = (setVersion) => {
        const bump = () => setVersion((version) => version + 1);
        const unsubscribe = subscribe(proxyObject, bump);
        // Cover a change that landed between the first read and this subscription.
        queueMicrotask(bump);
        return unsubscribe;
    };
    return atom((get) => {
        get(versionAtom);
        return snapshot(proxyObject) as T;
    });
}
