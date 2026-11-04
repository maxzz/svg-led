import { useAtomValue } from "jotai";
import { marqueeAtom, lassoAtom } from "@/store/4-editor";

export function Overlay_Marquee() {

    const r = useAtomValue(marqueeAtom);
    if (!r) {
        return null;
    }

    return (
        <rect
            className="fill-(--editor-accent)/10 stroke-(--editor-accent) pointer-events-none"
            strokeWidth={1}
            x={r.x} y={r.y} width={r.width} height={r.height}
        />
    );
}

//---------------------------------------------------------------------------

/** Lasso selection trail; drawn like the marquee, closed back to its first point */
export function Overlay_Lasso() {

    const points = useAtomValue(lassoAtom);
    if (!points || points.length < 2) {
        return null;
    }

    const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
        <polygon
            className="svgled-lasso-ants fill-(--editor-accent)/10 stroke-(--editor-accent) pointer-events-none"
            strokeWidth={1}
            points={pointsStr}
        />
    );
}
