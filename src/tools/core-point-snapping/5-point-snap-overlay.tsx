import { useAtomValue } from "jotai";
import { type Point } from "@/svg-core";
import { pointSnapScreenAtom } from "./3-point-snap-atoms";

const CROSS = 3.5; // half the size of a cross mark, in screen pixels
const GUIDE_CLASS = "stroke-fuchsia-500 pointer-events-none";

/** Smart guides of a dragged point or handle, with a small cross where it snaps; drawn in screen space */
export function PointSnapOverlay() {
    const snap = useAtomValue(pointSnapScreenAtom);
    if (!snap) {
        return null;
    }
    return (
        <g>
            {snap.guides.map(({ a, b }, i) => (
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={1} className={GUIDE_CLASS} key={i} />
            ))}
            {snap.marks.map((p, i) => <Cross p={p} key={i} />)}
        </g>
    );
}

function Cross({ p }: { p: Point; }) {
    return (
        <path
            d={`M${p.x - CROSS} ${p.y - CROSS}L${p.x + CROSS} ${p.y + CROSS}M${p.x - CROSS} ${p.y + CROSS}L${p.x + CROSS} ${p.y - CROSS}`}
            strokeWidth={1.25}
            className={GUIDE_CLASS}
        />
    );
}
