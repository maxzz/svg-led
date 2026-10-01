import { createElement, memo } from "react";
import { useSnapshot } from "valtio";
import { type GroupNode, type SvgNode } from "@/svg-core";
import { attrsToProps } from "./1-attrs-to-props";

/** Renders one document node; subscribes to that node only, so editing one element re-renders just that element */
export const NodeView = memo(
    function NodeView({ node }: { node: SvgNode; }) {
        const snap = useSnapshot(node) as SvgNode;
        const props = { ...attrsToProps(snap.attrs), 'data-nid': snap.id };

        switch (snap.kind) {
            case 'path':
                return <path {...props} d={snap.d} />;
            case 'rect':
                return <rect {...props} x={snap.x} y={snap.y} width={snap.width} height={snap.height} rx={snap.rx || undefined} ry={snap.ry !== snap.rx ? snap.ry : undefined} />;
            case 'circle':
                return <circle {...props} cx={snap.cx} cy={snap.cy} r={snap.r} />;
            case 'ellipse':
                return <ellipse {...props} cx={snap.cx} cy={snap.cy} rx={snap.rx} ry={snap.ry} />;
            case 'line':
                return <line {...props} x1={snap.x1} y1={snap.y1} x2={snap.x2} y2={snap.y2} />;
            case 'polyline':
            case 'polygon':
                return createElement(snap.kind, { ...props, points: snap.points.map((p) => `${p.x},${p.y}`).join(' ') });
            case 'g':
                return (
                    <g {...props}>
                        {snap.children.map((_, i) => {
                            const child = (node as GroupNode).children?.[i];
                            return child ? <NodeView key={child.id} node={child} /> : null;
                        })}
                    </g>
                );
            case 'passthrough':
                return createElement(snap.tag, { ...props, dangerouslySetInnerHTML: snap.inner ? { __html: snap.inner } : undefined });
        }
    }
);
