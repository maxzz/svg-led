import { type MarkupAttr, parseMarkup, printSvgMarkup, rootElement } from "../0-markup/1-markup-tree";
import { type PasteBlock } from "./9-paste-types";
import { isSvgDocumentText } from "./3-block-empty-canvas";

/**
 * A whole <svg> inserted into a document gives only its children. Paint set on its root (`fill="currentColor"`, `stroke-width`, a class, ...)
 * would be lost, so the children are wrapped into a <g> that carries those attributes.
 */
export const Block_rootStyleToGroup: PasteBlock = {
    id: 'root-style-to-group',
    label: 'Keep root <svg> paint on a group',
    apply: (data) => {
        if (data.asDocument || !isSvgDocumentText(data.text)) {
            return undefined;
        }
        const nodes = parseMarkup(data.text.trim()) ?? [];
        const root = rootElement(nodes);
        if (!root || root.name !== 'svg') {
            return undefined;
        }
        const paint = root.attrs.filter((a) => !VIEWPORT_ATTRS.has(a.name) && !a.name.startsWith('xmlns:'));
        if (!paint.length) {
            return undefined;
        }
        const namespaces = root.attrs.filter((a) => a.name.startsWith('xmlns:') && a.name !== 'xmlns:xlink');
        const group = { kind: 'el' as const, name: 'g', attrs: [...namespaces, ...paint] as MarkupAttr[], children: root.children };
        const svg = { ...root, attrs: root.attrs.filter((a) => VIEWPORT_ATTRS.has(a.name)), children: [group] };
        return { ...data, text: printSvgMarkup(nodes.map((n) => n === root ? svg : n)) }; // the DOCTYPE stays: it may declare entities the markup uses
    },
};

/** Root <svg> attributes that describe the viewport or the file, not how the children are painted */
const VIEWPORT_ATTRS = new Set(['xmlns', 'xmlns:xlink', 'viewBox', 'width', 'height', 'x', 'y', 'version', 'baseProfile', 'preserveAspectRatio', 'xml:space', 'enable-background']);
