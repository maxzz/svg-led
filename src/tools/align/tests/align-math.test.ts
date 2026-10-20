import { describe, expect, it } from "vitest";
import { type AlignItem, alignOffsets, distributeOffsets } from "../1-align-math";

const items: AlignItem[] = [
    { id: 'a', rect: { x: 0, y: 0, width: 10, height: 10 } },
    { id: 'b', rect: { x: 20, y: 30, width: 20, height: 40 } },
    { id: 'c', rect: { x: 60, y: 5, width: 10, height: 20 } },
];

/** Final rect of an item after applying its offset */
function moved(item: AlignItem, offset: { dx: number; dy: number; } | undefined) {
    return { ...item.rect, x: item.rect.x + (offset?.dx ?? 0), y: item.rect.y + (offset?.dy ?? 0) };
}

describe("alignOffsets", () => {
    it("aligns left edges to the leftmost element", () => {
        const offsets = alignOffsets(items, 'left');
        expect(items.map((i) => moved(i, offsets.find((o) => o.id === i.id)).x)).toEqual([0, 0, 0]);
    });

    it("aligns right edges to the rightmost element", () => {
        const offsets = alignOffsets(items, 'right');
        const rights = items.map((i) => { const r = moved(i, offsets.find((o) => o.id === i.id)); return r.x + r.width; });
        expect(rights).toEqual([70, 70, 70]);
    });

    it("aligns top and bottom edges", () => {
        const top = alignOffsets(items, 'top');
        expect(items.map((i) => moved(i, top.find((o) => o.id === i.id)).y)).toEqual([0, 0, 0]);

        const bottom = alignOffsets(items, 'bottom');
        const bottoms = items.map((i) => { const r = moved(i, bottom.find((o) => o.id === i.id)); return r.y + r.height; });
        expect(bottoms).toEqual([70, 70, 70]);
    });

    it("centers elements on the middle of the selection", () => {
        // Selection spans x 0..70, so its center is 35
        const offsets = alignOffsets(items, 'center-h');
        const centers = items.map((i) => { const r = moved(i, offsets.find((o) => o.id === i.id)); return r.x + r.width / 2; });
        expect(centers).toEqual([35, 35, 35]);

        // Selection spans y 0..70, so its center is 35
        const v = alignOffsets(items, 'center-v');
        const vCenters = items.map((i) => { const r = moved(i, v.find((o) => o.id === i.id)); return r.y + r.height / 2; });
        expect(vCenters).toEqual([35, 35, 35]);
    });

    it("returns nothing for a single element", () => {
        expect(alignOffsets([items[0]], 'left')).toEqual([]);
    });
});

describe("distributeOffsets", () => {
    it("makes the gaps between neighbours equal and keeps the outer elements", () => {
        // Horizontal: first spans 0..10, last spans 60..70, the middle one is 20 wide -> total 40, span 70, gap 15
        const offsets = distributeOffsets(items, 'horizontal');
        const rects = items.map((i) => moved(i, offsets.find((o) => o.id === i.id)));
        expect(rects[0].x).toBe(0);
        expect(rects[2].x).toBe(60);
        expect(rects[1].x).toBeCloseTo(25);          // 10 + gap 15
        expect(rects[1].y).toBe(30);                 // vertical position untouched
    });

    it("distributes vertically", () => {
        // Vertical order by y: a (0..10), c (5..25), b (30..70). Total 10+20+40=70, span 70, so gap is 0
        const offsets = distributeOffsets(items, 'vertical');
        const rects = items.map((i) => moved(i, offsets.find((o) => o.id === i.id)));
        // items array order: a, b, c
        expect(rects[0].y).toBe(0);                  // a is the first one, stays
        expect(rects[2].y).toBeCloseTo(10);          // c follows a directly when gap is 0
        expect(rects[1].y).toBe(30);                 // b is the last one, stays
        expect(rects[1].x).toBe(20);                 // horizontal position untouched
    });

    it("needs at least three elements", () => {
        expect(distributeOffsets(items.slice(0, 2), 'horizontal')).toEqual([]);
    });
});
