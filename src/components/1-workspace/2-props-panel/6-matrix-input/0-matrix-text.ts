import { type Matrix, type SvgNode, fmtNum, isIdentity, nodeOwnMatrix, parseTransform } from "@/svg-core";

/** Digits stored and shown for a matrix. Lower document precision would collapse a rotation. */
export const MATRIX_DIGITS = 6;

const FN_NAME = "matrix|translate|scale|rotate|skewX|skewY";
const NUM = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const ARITY: Record<string, readonly number[]> = {
    matrix: [6],
    translate: [1, 2],
    scale: [1, 2],
    rotate: [1, 3],
    skewX: [1],
    skewY: [1],
};

//---------------------------------------------------------------------------

/** `matrix(a b c d e f)`, always, so the field shows a matrix rather than translate() or rotate(). */
export function formatMatrix(m: Matrix, digits = MATRIX_DIGITS): string {
    return `matrix(${m.map((n) => fmtNum(n, digits)).join(" ")})`;
}

/**
 * Text of a node's own transform when it is a real matrix, or undefined when there is
 * none or it rounds to a no-op.
 */
export function nodeMatrixText(node: SvgNode): string | undefined {
    if (!node.attrs.transform) {
        return undefined;
    }
    const m = nodeOwnMatrix(node);
    return isIdentity(m) ? undefined : formatMatrix(m);
}

export type SelectionMatrixView = {
    shown: boolean;
    mixed: boolean;
    /** Canonical matrix text, or '' when nothing is shown or the selection disagrees */
    text: string;
};

/** What the matrix field should show for these nodes. A matrix applies when any node has one. */
export function selectionMatrixView(nodes: readonly SvgNode[]): SelectionMatrixView {
    const texts = nodes.map(nodeMatrixText);
    const first = texts.find((t) => t !== undefined);
    if (!first) {
        return { shown: false, mixed: false, text: "" };
    }
    const mixed = texts.some((t) => t !== first);
    return { shown: true, mixed, text: mixed ? "" : first };
}

//---------------------------------------------------------------------------

export type MatrixCommit =
    | { ok: true; unchanged: true; refresh: boolean }
    | { ok: true; unchanged: false; refresh: true; text: string | undefined }
    | { ok: false };

/**
 * Interprets text typed into the matrix field.
 * `text: undefined` means the transform attribute should be removed (an identity matrix).
 * `refresh` means the field should snap back to the canonical text even though the document did not change.
 */
export function commitMatrixText(raw: string, current: string): MatrixCommit {
    const text = raw.trim();
    if (text === current) {
        return { ok: true, unchanged: true, refresh: raw !== current };
    }

    const parsed = parseMatrixInput(text);
    if (!parsed) {
        return { ok: false };
    }
    if (isIdentity(parsed)) {
        return { ok: true, unchanged: false, refresh: true, text: undefined };
    }

    const next = formatMatrix(parsed);
    if (next === current) {
        return { ok: true, unchanged: true, refresh: true };
    }
    return { ok: true, unchanged: false, refresh: true, text: next };
}

/**
 * Parses a matrix field. Accepts six numbers, `matrix(...)`, or any SVG transform list
 * (`translate`, `rotate`, `scale`, `skewX`, `skewY`, `matrix`). Anything else is rejected,
 * including a transform function with the wrong number of arguments.
 */
export function parseMatrixInput(raw: string): Matrix | null {
    const text = raw.trim();
    if (!text) {
        return null;
    }

    if (!text.includes("(")) {
        const parts = text.split(/[\s,]+/).filter(Boolean);
        if (parts.length !== 6 || parts.some((p) => !isNum(p))) {
            return null;
        }
        const a = parts.map(Number);
        return [a[0], a[1], a[2], a[3], a[4], a[5]];
    }

    if (!isTransformList(text)) {
        return null;
    }
    return parseTransform(text);
}

function isNum(text: string): boolean {
    return NUM.test(text) && Number.isFinite(Number(text));
}

/** The whole string is one or more transform functions, with nothing left over. */
function isTransformList(text: string): boolean {
    const re = new RegExp(String.raw`\s*(${FN_NAME})\s*\(([^)]*)\)\s*`, "y");
    let count = 0;
    while (re.lastIndex < text.length) {
        const m = re.exec(text);
        if (!m) {
            return false;
        }
        count++;
        const args = m[2].trim() ? m[2].trim().split(/[\s,]+/).filter(Boolean) : [];
        if (!ARITY[m[1]].includes(args.length) || args.some((a) => !isNum(a))) {
            return false;
        }
    }
    return count > 0;
}
