import { useAtomValue } from "jotai";
import { marqueeAtom } from "@/store/4-editor";

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
