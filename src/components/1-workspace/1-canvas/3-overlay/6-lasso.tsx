import { useAtomValue } from "jotai";
import { lassoAtom } from "@/store/4-editor";

/** Lasso selection trail; drawn like the marquee, closed back to its first point */
export function Lasso() {
    const points = useAtomValue(lassoAtom);
    if (!points || points.length < 2) {
        return null;
    }

    return (
        <polygon
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            strokeWidth={1}
            className="svgled-lasso-ants fill-(--editor-accent)/10 stroke-(--editor-accent) pointer-events-none"
        />
    );
}
