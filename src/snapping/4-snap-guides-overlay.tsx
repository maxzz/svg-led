import { useAtomValue } from "jotai";
import { type Viewport, docToScreen, viewportAtom } from "@/store/4-editor";
import { snapGuidesAtom } from "./2-snap-state";
import { type SnapGuide } from "./1-snap-engine";

const TICK = 4;
const GUIDE_CLASS = "stroke-fuchsia-500 fill-fuchsia-500 pointer-events-none";

/** Snap guides drawn in screen space, so they keep their size at any zoom */
export function SnapGuidesOverlay() {
    const guides = useAtomValue(snapGuidesAtom);
    const vp = useAtomValue(viewportAtom);

    return (
        <g>
            {guides.map((g, i) => <GuideLine guide={g} vp={vp} key={i} />)}
        </g>
    );
}

function GuideLine({ guide, vp }: { guide: SnapGuide; vp: Viewport; }) {
    const a = docToScreen(vp, { x: guide.x1, y: guide.y1 });
    const b = docToScreen(vp, { x: guide.x2, y: guide.y2 });

    if (guide.gap === undefined) {
        return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1} className={GUIDE_CLASS} />;
    }

    // spacing guide: a dashed line between the two objects, with ticks at both ends and the gap length
    const horizontal = a.y === b.y;
    const tick = (p: { x: number; y: number; }) => horizontal
        ? <line x1={p.x} y1={p.y - TICK} x2={p.x} y2={p.y + TICK} strokeWidth={1} className={GUIDE_CLASS} />
        : <line x1={p.x - TICK} y1={p.y} x2={p.x + TICK} y2={p.y} strokeWidth={1} className={GUIDE_CLASS} />;

    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const label = String(Math.round(guide.gap! * 100) / 100);

    return (
        <g>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1} strokeDasharray="3 2" className={GUIDE_CLASS} />
            {tick(a)}
            {tick(b)}
            <text x={mid.x} y={horizontal ? mid.y - 6 : mid.y} textAnchor={horizontal ? "middle" : "start"} dx={horizontal ? 0 : 6} dominantBaseline={horizontal ? "auto" : "middle"} className="text-[10px] font-mono fill-fuchsia-500 pointer-events-none select-none">
                {label}
            </text>
        </g>
    );
}
