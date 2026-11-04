import { useAtomValue } from "jotai";
import { marqueeAtom, lassoAtom } from "@/store/4-editor";

export function Marquee() {
    
    const r = useAtomValue(marqueeAtom);
    if (!r) {
        return null;
    }
    
    return (
        <rect
            x={r.x} y={r.y} width={r.width} height={r.height}
            strokeWidth={1}
            className="fill-(--editor-accent)/10 stroke-(--editor-accent) pointer-events-none"
        />
    );
}

//---------------------------------------------------------------------------

/** Lasso selection trail; drawn like the marquee, closed back to its first point */
export function Lasso() {
    
    const points = useAtomValue(lassoAtom);
    if (!points || points.length < 2) {
        return null;
    }

    return (
        <polygon
            className="svgled-lasso-ants fill-(--editor-accent)/10 stroke-(--editor-accent) pointer-events-none"
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            strokeWidth={1}
        />
    );
}
