import { useAtomValue } from "jotai";

import { type Viewport, docToScreen, viewportAtom } from "@/store/4-editor";
import { snapGuidesAtom } from "./a-snap-state";
import { type SnapGuide } from "./1-snap-engine";

const TICK = 4;

/** Snap guides drawn in screen space, so they keep their size at any zoom */
export function Overlay_SnapGuides() {
    const guides = useAtomValue(snapGuidesAtom);
    const vp = useAtomValue(viewportAtom);

    return (
        <g>
            {guides.map(
                (g, i) => <GuideLine guide={g} vp={vp} key={i} />
            )}
        </g>
    );
}

function GuideLine({ guide, vp }: { guide: SnapGuide; vp: Viewport; }) {
    const a = docToScreen(vp, { x: guide.x1, y: guide.y1 });
    const b = docToScreen(vp, { x: guide.x2, y: guide.y2 });

    if (guide.gap === undefined) {
        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1} className={guideClasses} />;
    }

    // spacing guide: a dashed line between the two objects, with ticks at both ends and the gap length
    const horizontal = a.y === b.y;

    function tick({ x, y }: { x: number; y: number; }) {
        return (
            horizontal
                ? <line x1={x} y1={y - TICK} x2={x} y2={y + TICK} strokeWidth={1} className={guideClasses} />
                : <line x1={x - TICK} y1={y} x2={x + TICK} y2={y} strokeWidth={1} className={guideClasses} />
        );
    }

    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const label = String(Math.round(guide.gap! * 100) / 100);

    return (
        <g>
            <line
                className={guideClasses}
                strokeWidth={1}
                strokeDasharray="3 2"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
            />

            {tick(a)}
            {tick(b)}

            <text
                className="text-[10px] font-mono fill-fuchsia-500 pointer-events-none select-none"
                x={mid.x}
                y={horizontal ? mid.y - 6 : mid.y}
                textAnchor={horizontal ? "middle" : "start"}
                dx={horizontal ? 0 : 6}
                dominantBaseline={horizontal ? "auto" : "middle"}
            >
                {label}
            </text>
        </g>
    );
}

const guideClasses = "stroke-fuchsia-500 fill-fuchsia-500 pointer-events-none";
