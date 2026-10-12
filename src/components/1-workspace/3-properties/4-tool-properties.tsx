import { useAtomValue } from "jotai";
import { type SvgNode } from "@/svg-core";
import { type NewShapeStyle, newShapeStyleAtom } from "@/store/2-persist";
import { type NewShapeKind, type ToolDef } from "@/tools";
import { styleAttrs } from "@/tools/0-shared/4-style-attrs";
import { PROPERTY_SECTIONS } from "./1-sections/0-registry";
import { activeToolDefAtom } from "./9-atoms-properties-popup";

/** Panel of a creation tool: the properties its new shapes are created with, limited to those that apply to its kind */
export function ToolProperties() {
    const tool: ToolDef = useAtomValue(activeToolDefAtom);
    return tool.newShapeKind
        ? <NewShapeProperties kind={tool.newShapeKind} label={tool.label} key={tool.id} />
        : null;
}

function NewShapeProperties({ kind, label }: { kind: NewShapeKind; label: string; }) {
    const style = useAtomValue(newShapeStyleAtom);
    const nodes = [newShapeNode(kind, style)];

    return (<>
        <div className="select-none text-xs font-medium">
            New {label.toLowerCase()} style
        </div>

        {PROPERTY_SECTIONS.filter((s) => !s.selectionOnly && s.appliesTo(nodes)).map(
            ({ id, Component }) => <Component mode="newShape" ids={[]} nodes={nodes} key={id} />
        )}
    </>);
}

/** Stand-in for a shape of this kind drawn with the new-shape style, so the sections can read its values */
function newShapeNode(kind: NewShapeKind, s: NewShapeStyle): SvgNode {
    const attrs = styleAttrs(s);
    switch (kind) {
        case 'rect': return { id: '', kind, x: 0, y: 0, width: 1, height: 1, rx: s.rx, ry: s.ry, attrs };
        case 'ellipse': return { id: '', kind, cx: 0, cy: 0, rx: 1, ry: 1, attrs };
        case 'line': return { id: '', kind, x1: 0, y1: 0, x2: 1, y2: 0, attrs };
        case 'path': return { id: '', kind, d: '', attrs };
    }
}
