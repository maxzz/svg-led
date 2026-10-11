import { type PathSeg } from "../2-parse/2-parse-path-data";
import { makeFmt } from "./1-format";

/** Writes absolute segments as path data: "M10 20 L30 40 C... Z" */
export function serializePathSegs(segs: readonly PathSeg[], precision: number): string {
    const f = makeFmt(precision);
    const parts: string[] = [];

    for (const s of segs) {
        switch (s.c) {
            case 'M':
            case 'L':
                parts.push(`${s.c}${f(s.p.x)} ${f(s.p.y)}`);
                break;
            case 'C':
                parts.push(`C${f(s.c1.x)} ${f(s.c1.y)} ${f(s.c2.x)} ${f(s.c2.y)} ${f(s.p.x)} ${f(s.p.y)}`);
                break;
            case 'Q':
                parts.push(`Q${f(s.q.x)} ${f(s.q.y)} ${f(s.p.x)} ${f(s.p.y)}`);
                break;
            case 'A':
                parts.push(`A${f(s.rx)} ${f(s.ry)} ${f(s.rot)} ${s.large ? 1 : 0} ${s.sweep ? 1 : 0} ${f(s.p.x)} ${f(s.p.y)}`);
                break;
            case 'Z':
                parts.push('Z');
                break;
        }
    }
    
    return parts.join(' ');
}
