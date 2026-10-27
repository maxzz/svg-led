import { createElement, memo } from "react";
import { useSnapshot } from "valtio";
import { type GroupNode, type SvgNode } from "@/svg-core";
import { attrsToProps } from "./1-attrs-to-props";

type NodeViewProps = {
    node: SvgNode;
    /**
     * Ids of the isolation chain joined by spaces (outermost group first, the isolated group last), given to nodes whose parent is on the chain.
     * A node that is not on the chain is dimmed; the contents of the isolated group get no chain and render as usual.
     */
    isolation?: string;
    /** Rendered outside the canvas (layer thumbnails): no data-nid, so canvas hit testing and DOM bbox lookups ignore it */
    detached?: boolean;
};

/** Renders one document node; subscribes to that node only, so editing one element re-renders just that element */
export const NodeView = memo(
    function NodeView({ node, isolation, detached }: NodeViewProps) {
        const snap = useSnapshot(node) as SvgNode;
        const chain = isolation?.split(' ');
        const onChain = !!chain?.includes(snap.id);
        const props = {
            ...attrsToProps(snap.attrs),
            ...(!detached && { 'data-nid': snap.id }),
            ...(chain && !onChain && { 'data-isolation-dim': '' }),
        };

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
            case 'g': {
                const childIsolation = onChain && chain!.at(-1) !== snap.id ? isolation : undefined;
                return (
                    <g {...props}>
                        {snap.children.map((_, i) => {
                            const child = (node as GroupNode).children?.[i];
                            return child ? <NodeView key={child.id} node={child} isolation={childIsolation} detached={detached} /> : null;
                        })}
                    </g>
                );
            }
            case 'passthrough':
                return createElement(snap.tag, { ...props, dangerouslySetInnerHTML: snap.inner ? { __html: snap.inner } : undefined });
        }
    }
);
