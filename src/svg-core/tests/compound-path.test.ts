import { describe, expect, it } from "vitest";
import { type PathNode, type SvgNode, combinePaths, isCompoundPath, releaseCompoundPath, subpathCount } from "../index";

const USER_SHAPE_D = "m.6.55.42.15 8.82 8.94.15.5-4.91-.02-3.64 4.01-.83.07V.55m0-.5c-.1 0-.2.03-.29.09a.5.5 0 0 0-.21.41V14.2c0 .14.06.27.16.37.09.09.21.13.34.13h.04l.83-.07a.52.52 0 0 0 .33-.16l3.51-3.84 4.68.02c.16 0 .31-.07.4-.2a.53.53 0 0 0 .08-.44l-.15-.5a.55.55 0 0 0-.12-.21L1.38.35A.57.57 0 0 0 1.2.23L.77.08A.5.5 0 0 0 .6.05Z";

function path(d: string, attrs: Record<string, string> = {}): PathNode {
    return { id: `p-${d.length}`, kind: 'path', d, attrs };
}

describe("compound path detection", () => {
    it("recognizes the outline with a hole from the user's example", () => {
        const node = path(USER_SHAPE_D);
        expect(subpathCount(USER_SHAPE_D)).toBe(2);
        expect(isCompoundPath(node)).toBe(true);
    });

    it("does not treat a single subpath as compound", () => {
        expect(isCompoundPath(path("M0 0 L10 0 L10 10 Z"))).toBe(false);
    });

    it("ignores a moveto without drawing after it", () => {
        expect(isCompoundPath(path("M0 0 L10 0 M5 5"))).toBe(false);
    });

    it("is false for non-path nodes", () => {
        const rect = { id: 'r', kind: 'rect', attrs: {}, x: 0, y: 0, width: 1, height: 1, rx: 0, ry: 0 } as SvgNode;
        expect(isCompoundPath(rect)).toBe(false);
    });
});

describe("release compound path", () => {
    it("splits the user's example into its two subpaths with the same attributes", () => {
        const node = path(USER_SHAPE_D, { id: 'shape', 'stroke-width': '1' });
        const pieces = releaseCompoundPath(node, 3);

        expect(pieces).toHaveLength(2);
        pieces.forEach((p) => {
            expect(p.kind).toBe('path');
            expect(p.attrs['stroke-width']).toBe('1');
            expect(subpathCount(p.d)).toBe(1);
        });
        expect(pieces[0].attrs.id).toBe('shape');
        expect(pieces[1].attrs.id).toBeUndefined();
        expect(pieces[0].id).not.toBe(pieces[1].id);
    });

    it("released pieces are no longer compound", () => {
        const pieces = releaseCompoundPath(path(USER_SHAPE_D), 3);
        pieces.forEach((p) => expect(isCompoundPath(p)).toBe(false));
    });
});

describe("make compound path", () => {
    it("joins two paths into one path with two subpaths and keeps the topmost attributes", () => {
        const bottom = path("M0 0 L1 0 L1 1 Z", { fill: 'red' });
        const top = path("M0 0 L1 0 L1 1 Z", { fill: 'blue', transform: 'translate(10 0)' });

        const combined = combinePaths([bottom, top], 3);

        expect(combined.attrs.fill).toBe('blue');
        expect(combined.attrs.transform).toBe('translate(10 0)');
        expect(subpathCount(combined.d)).toBe(2);
    });

    it("moves the geometry of the other paths into the coordinates of the topmost one", () => {
        const bottom = path("M0 0 L1 0 L1 1 Z");
        const top = path("M0 0 L1 0 L1 1 Z", { transform: 'translate(10 0)' });

        const combined = combinePaths([bottom, top], 3);

        // bottom is shifted by -10 so that, with the top's translate(10 0), it stays where it was
        expect(combined.d).toBe("M-10 0 L-9 0 L-9 1 Z M0 0 L1 0 L1 1 Z");
    });

    it("keeps the user's example intact when it is released and made again", () => {
        const pieces = releaseCompoundPath(path(USER_SHAPE_D), 3);
        const again = combinePaths(pieces, 3);
        expect(subpathCount(again.d)).toBe(2);
    });
});