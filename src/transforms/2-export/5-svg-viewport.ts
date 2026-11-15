import { getAttr, parseMarkup, rootElement } from "../0-markup/1-markup-tree";

export type SvgViewport = { width: number; height: number };

/**
 * Rectangle the exported SVG is displayed in.
 * Absolute width and height win, so a viewBox with a different aspect sits inside them (preserveAspectRatio).
 * Otherwise the viewBox is the rectangle.
 */
export function svgViewportSize(svg: string): SvgViewport | null {
    const nodes = parseMarkup(svg);
    const root = nodes && rootElement(nodes);
    if (!root || root.name.toLowerCase() !== 'svg') {
        return null;
    }

    const box = viewBoxSize(getAttr(root, 'viewBox'));
    const width = absoluteLength(getAttr(root, 'width'));
    const height = absoluteLength(getAttr(root, 'height'));
    if (width && height) {
        return { width, height };
    }
    if (box && width) {
        return { width, height: width * box.height / box.width };
    }
    if (box && height) {
        return { width: height * box.width / box.height, height };
    }
    return box;
}

function viewBoxSize(text: string | undefined): SvgViewport | null {
    const n = (text ?? '').trim().split(/[\s,]+/).map(Number);
    if (n.length !== 4 || n.some((v) => !Number.isFinite(v)) || n[2] <= 0 || n[3] <= 0) {
        return null;
    }
    return { width: n[2], height: n[3] };
}

/** CSS px for an absolute length. Unitless and px stay as written; percentages and font-relative units are not a fixed size. */
function absoluteLength(text: string | undefined): number | null {
    const m = LENGTH.exec((text ?? '').trim());
    if (!m) {
        return null;
    }
    const value = Number(m[1]) * (m[2] ? TO_PX[m[2].toLowerCase()] : 1);
    return value > 0 && Number.isFinite(value) ? value : null;
}

const LENGTH = /^([+-]?(?:\d+\.?\d*|\.\d+))(px|in|cm|mm|pt|pc|q)?$/i;

const TO_PX: Record<string, number> = {
    px: 1,
    in: 96,
    cm: 96 / 2.54,
    mm: 96 / 25.4,
    pt: 96 / 72,
    pc: 16,
    q: 96 / 101.6,
};
