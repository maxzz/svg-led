/** Shortest decimal text for a number at the given precision: 1.500 -> "1.5", -0 -> "0" */
export function fmtNum(n: number, precision: number): string {
    if (!Number.isFinite(n)) {
        return '0';
    }
    const f = 10 ** precision;
    const r = Math.round(n * f) / f;
    return Object.is(r, -0) || r === 0 ? '0' : String(r);
}

export function makeFmt(precision: number): (n: number) => string {
    return (n) => fmtNum(n, precision);
}

export function escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
