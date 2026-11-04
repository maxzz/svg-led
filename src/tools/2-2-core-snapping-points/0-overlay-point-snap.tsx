import { useAtomValue } from "jotai";

import { type Point } from "@/svg-core";
import { pointSnapScreenAtom } from "./a-point-snap-atoms";

const CROSS = 3.5; // half the size of a cross mark, in screen pixels

/** Smart guides of a dragged point or handle, with a small cross where it snaps; drawn in screen space */
export function Overlay_PointSnap() {

    const snap = useAtomValue(pointSnapScreenAtom);
    if (!snap) {
        return null;
    }

    return (
        <g>
            {snap.guides.map(
                ({ a, b }, i) => (
                    <line
                        className={guideClasses}
                        strokeWidth={1}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        key={i}
                    />
                )
            )}

            {snap.marks.map(
                (p, i) => <Cross p={p} key={i} />
            )}
        </g>
    );
}

function Cross({ p }: { p: Point; }) {
    const { x, y } = p;
    return (
        <path
            className={guideClasses}
            strokeWidth={1.25}
            d={`M${x - CROSS} ${y - CROSS}L${x + CROSS} ${y + CROSS}M${x - CROSS} ${y + CROSS}L${x + CROSS} ${y - CROSS}`}
        />
    );
}

const guideClasses = "stroke-fuchsia-500 pointer-events-none";
