export type Point = { x: number; y: number; };

export type Rect = { x: number; y: number; width: number; height: number; };

export type ViewBox = Rect;

/** Affine matrix [a, b, c, d, e, f] as in SVG: x' = a*x + c*y + e, y' = b*x + d*y + f */
export type Matrix = readonly [number, number, number, number, number, number];

/**
 * Illustrator anchor point types:
 * - corner: no direction handles (straight segments meet here)
 * - smooth: both handles lie on one line, moving one rotates the other (Illustrator "smooth point")
 * - cusp:   handles move independently (Illustrator "corner point with independent handles")
 */
export type AnchorKind = 'corner' | 'smooth' | 'cusp';

/** Anchor in path-local coordinates; `in` and `out` are absolute positions of the direction handles */
export type Anchor = {
    x: number;
    y: number;
    in?: Point;
    out?: Point;
    kind: AnchorKind;
};

export type SubPath = {
    anchors: Anchor[];
    closed: boolean;
};

/** Attributes the editor does not model explicitly, kept in source order for round-trips */
export type Attrs = Record<string, string>;

type NodeBase = {
    id: string;                  // internal id, never written to the output
    attrs: Attrs;                // all other attributes: id, class, style, fill, stroke, transform, ...
};

export type PathNode = NodeBase & { kind: 'path'; d: string; };
export type RectNode = NodeBase & { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number; ry: number; };
export type CircleNode = NodeBase & { kind: 'circle'; cx: number; cy: number; r: number; };
export type EllipseNode = NodeBase & { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; };
export type LineNode = NodeBase & { kind: 'line'; x1: number; y1: number; x2: number; y2: number; };
export type PolyNode = NodeBase & { kind: 'polyline' | 'polygon'; points: Point[]; };
export type GroupNode = NodeBase & { kind: 'g'; children: SvgNode[]; };

/** Any element the editor does not understand (text, defs, use, image, gradients, ...), kept verbatim */
export type PassthroughNode = NodeBase & { kind: 'passthrough'; tag: string; inner: string; };

export type ShapeNode = RectNode | CircleNode | EllipseNode | LineNode | PolyNode;
export type SvgNode = PathNode | ShapeNode | GroupNode | PassthroughNode;
export type SvgNodeKind = SvgNode['kind'];

export type SvgDoc = {
    viewBox: ViewBox | null;
    rootAttrs: Attrs;            // root <svg> attributes except viewBox
    children: SvgNode[];
};

//---------------------------------------------------------------------------

export function isShapeNode(node: SvgNode): node is ShapeNode {
    return SHAPE_KINDS.has(node.kind);
}

export const SHAPE_KINDS: ReadonlySet<SvgNodeKind> = new Set(['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon']);

//---------------------------------------------------------------------------

export function isPathNode(node: SvgNode): node is PathNode {
    return node.kind === 'path';
}
