import { type Point } from "../1-model/1-types";

/**
 * Absolute, normalized path segments:
 * H/V become L, S becomes C, T becomes Q, relative commands become absolute.
 * Arcs are kept, so a moved or uniformly scaled path keeps its arcs.
 */
export type PathSeg =
    | { c: 'M'; p: Point; }
    | { c: 'L'; p: Point; }
    | { c: 'C'; c1: Point; c2: Point; p: Point; }
    | { c: 'Q'; q: Point; p: Point; }
    | { c: 'A'; rx: number; ry: number; rot: number; large: boolean; sweep: boolean; p: Point; }
    | { c: 'Z'; };

const PARAM_COUNT: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

export function parsePathData(d: string): PathSeg[] {
    const rv: PathSeg[] = [];
    const s = new Scanner(d);

    let cur: Point = { x: 0, y: 0 };
    let start: Point = { x: 0, y: 0 };
    let lastC2: Point | null = null;   // for S
    let lastQ: Point | null = null;    // for T

    let cmd = '';
    while (true) {
        s.skipSeparators();
        if (s.done()) {
            break;
        }

        const ch = s.peek();
        if (/[a-zA-Z]/.test(ch)) {
            cmd = ch;
            s.pos++;
        } else if (!cmd) {
            break; // garbage before the first command
        } else if (cmd === 'M') {
            cmd = 'L'; // implicit lineto after moveto
        } else if (cmd === 'm') {
            cmd = 'l';
        }

        const lower = cmd.toLowerCase();
        const count = PARAM_COUNT[lower];
        if (count === undefined) {
            break;
        }

        const rel = cmd !== cmd.toUpperCase();
        const args: number[] = [];
        for (let i = 0; i < count; i++) {
            const isFlag = lower === 'a' && (i === 3 || i === 4);
            const n = isFlag ? s.flag() : s.number();
            if (n === null) {
                return rv; // malformed: keep what was parsed, like browsers do
            }
            args.push(n);
        }

        const pt = (x: number, y: number): Point => rel ? { x: cur.x + x, y: cur.y + y } : { x, y };

        switch (lower) {
            case 'm': {
                cur = pt(args[0], args[1]);
                start = cur;
                rv.push({ c: 'M', p: cur });
                lastC2 = lastQ = null;
                break;
            }
            case 'l': {
                cur = pt(args[0], args[1]);
                rv.push({ c: 'L', p: cur });
                lastC2 = lastQ = null;
                break;
            }
            case 'h': {
                cur = { x: rel ? cur.x + args[0] : args[0], y: cur.y };
                rv.push({ c: 'L', p: cur });
                lastC2 = lastQ = null;
                break;
            }
            case 'v': {
                cur = { x: cur.x, y: rel ? cur.y + args[0] : args[0] };
                rv.push({ c: 'L', p: cur });
                lastC2 = lastQ = null;
                break;
            }
            case 'c': {
                const c1 = pt(args[0], args[1]);
                const c2 = pt(args[2], args[3]);
                const p = pt(args[4], args[5]);
                rv.push({ c: 'C', c1, c2, p });
                lastC2 = c2;
                lastQ = null;
                cur = p;
                break;
            }
            case 's': {
                const c1 = lastC2 ? { x: 2 * cur.x - lastC2.x, y: 2 * cur.y - lastC2.y } : cur;
                const c2 = pt(args[0], args[1]);
                const p = pt(args[2], args[3]);
                rv.push({ c: 'C', c1, c2, p });
                lastC2 = c2;
                lastQ = null;
                cur = p;
                break;
            }
            case 'q': {
                const q = pt(args[0], args[1]);
                const p = pt(args[2], args[3]);
                rv.push({ c: 'Q', q, p });
                lastQ = q;
                lastC2 = null;
                cur = p;
                break;
            }
            case 't': {
                const q: Point = lastQ ? { x: 2 * cur.x - lastQ.x, y: 2 * cur.y - lastQ.y } : cur;
                const p = pt(args[0], args[1]);
                rv.push({ c: 'Q', q, p });
                lastQ = q;
                lastC2 = null;
                cur = p;
                break;
            }
            case 'a': {
                const p = pt(args[5], args[6]);
                rv.push({ c: 'A', rx: args[0], ry: args[1], rot: args[2], large: !!args[3], sweep: !!args[4], p });
                lastC2 = lastQ = null;
                cur = p;
                break;
            }
            case 'z': {
                rv.push({ c: 'Z' });
                cur = start;
                lastC2 = lastQ = null;
                break;
            }
        }
    }
    return rv;
}

//---------------------------------------------------------------------------

class Scanner {
    pos = 0;
    private readonly text: string;

    constructor(text: string) {
        this.text = text;
    }

    done() {
        return this.pos >= this.text.length;
    }

    peek() {
        return this.text[this.pos];
    }

    skipSeparators() {
        while (!this.done() && /[\s,]/.test(this.text[this.pos])) {
            this.pos++;
        }
    }

    number(): number | null {
        this.skipSeparators();
        NUMBER_RE.lastIndex = this.pos;
        const m = NUMBER_RE.exec(this.text);
        if (!m || m.index !== this.pos || !m[0]) {
            return null;
        }
        this.pos += m[0].length;
        return parseFloat(m[0]);
    }

    /** Arc flags may be written without separators: "a1 1 0 01 10 10" */
    flag(): number | null {
        this.skipSeparators();
        const ch = this.text[this.pos];
        if (ch === '0' || ch === '1') {
            this.pos++;
            return ch === '1' ? 1 : 0;
        }
        return null;
    }
}

const NUMBER_RE = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
