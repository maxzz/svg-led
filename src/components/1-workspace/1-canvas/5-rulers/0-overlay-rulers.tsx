import { useAtomValue } from "jotai";
import { type RulerTick, TickKind } from "./1-ruler-ticks";
import { type RulerGeometry, rulersGeometryAtom } from "./9-atoms-rulers";

const TICK_LENGTH_PX: Record<TickKind, number> = { minor: 3, mid: 5, major: 8 };
/** Gap between the end of a major tick and its number */
const LABEL_GAP_PX = 2;

/** School-ruler scales along the top and left edges of the viewBox frame, in viewBox units */
export function Overlay_Rulers() {
    const rulers = useAtomValue(rulersGeometryAtom);
    if (!rulers) {
        return null;
    }

    return (
        <g className="select-none text-[8px] tabular-nums fill-foreground/35 stroke-foreground/20 pointer-events-none">
            <TopRuler ruler={rulers.top} />
            <LeftRuler ruler={rulers.left} />
        </g>
    );
}

function TopRuler({ ruler: { base: rawBase, from, to, ticks } }: { ruler: RulerGeometry; }) {
    const base = crisp(rawBase);

    return (<>
        <path d={`M${from} ${base} H${to}${ticksPath(ticks, (pos, len) => `M${pos} ${base} v${-len}`)}`} fill="none" strokeWidth={1} />

        {ticks.map(
            (t) => t.label !== undefined && (
                <text x={t.pos} y={base - TICK_LENGTH_PX.major - LABEL_GAP_PX} textAnchor="middle" stroke="none" key={t.pos}>
                    {t.label}
                </text>
            )
        )}
    </>);
}

/** Numbers read bottom to top, like on a ruler turned on its side */
function LeftRuler({ ruler: { base: rawBase, from, to, ticks } }: { ruler: RulerGeometry; }) {
    const base = crisp(rawBase);
    const labelX = base - TICK_LENGTH_PX.major - LABEL_GAP_PX;

    return (<>
        <path d={`M${base} ${from} V${to}${ticksPath(ticks, (pos, len) => `M${base} ${pos} h${-len}`)}`} fill="none" strokeWidth={1} />

        {ticks.map(
            (t) => t.label !== undefined && (
                <text x={labelX} y={t.pos} transform={`rotate(-90 ${labelX} ${t.pos})`} textAnchor="middle" stroke="none" key={t.pos}>
                    {t.label}
                </text>
            )
        )}
    </>);
}

/** All ticks of a ruler as one path, so a dense ruler stays a single element */
function ticksPath(ticks: RulerTick[], tick: (pos: number, length: number) => string): string {
    return ticks.map((t) => tick(crisp(t.pos), TICK_LENGTH_PX[t.kind])).join('');
}

/** Centers a 1px line on a device pixel */
function crisp(v: number): number {
    return Math.round(v) + 0.5;
}
