import { type SvgDoc, walkNodes } from "@/svg-core";
import { commitHistory, docState, getNodeProxy } from "../3-document";

export type RenameResult = { ok: true; } | { ok: false; error: string; };

/** A layer's name is its id attribute, so spaces become underscores as in Illustrator's SVG export */
export function normalizeLayerName(text: string): string {
    return text.trim().replace(/\s+/g, '_');
}

/**
 * Sets the id attribute of a layer; an empty name removes it, so the panel shows the tag again.
 * References to the old id (url(#...), href) are not updated.
 */
export function renameLayer(id: string, text: string): RenameResult {
    const node = getNodeProxy(id);
    if (!node) {
        return { ok: false, error: 'The layer no longer exists.' };
    }

    const name = normalizeLayerName(text);
    if (name === (node.attrs.id ?? '')) {
        return { ok: true };
    }
    if (name && !ID_PATTERN.test(name)) {
        return { ok: false, error: 'A name must start with a letter or "_" and contain only letters, digits, "-", "_" and ".".' };
    }
    if (name && isIdTaken(docState.doc, name, id)) {
        return { ok: false, error: `Another element already has the id "${name}".` };
    }

    if (name) {
        node.attrs.id = name;
    } else {
        delete node.attrs.id;
    }
    commitHistory();
    return { ok: true };
}

const ID_PATTERN = /^[\p{L}_][\p{L}\p{N}_.-]*$/u;

function isIdTaken(doc: SvgDoc, name: string, exceptId: string): boolean {
    let rv = false;
    walkNodes(doc.children, (n) => { rv ||= n.id !== exceptId && n.attrs.id === name; });
    return rv;
}
