import { describe, expect, it } from "vitest";
import { type SvgNode } from "@/svg-core";
import { SELECTION_ACTION_RULES } from "./0-selection-action-rules";

const rect = { kind: 'rect', id: 'r', attrs: {}, x: 0, y: 0, width: 1, height: 1, rx: 0, ry: 0 } as unknown as SvgNode;
const group = { kind: 'g', id: 'g', attrs: {}, children: [] } as unknown as SvgNode;
const path = { kind: 'path', id: 'p', attrs: {}, d: 'M0 0' } as unknown as SvgNode;

function visibleIds(nodes: SvgNode[]): string[] {
    return SELECTION_ACTION_RULES.filter((rule) => rule.isVisible(nodes)).map((rule) => rule.commandId);
}

describe("selection action rules", () => {
    it("shows the always-on actions for a single element", () => {
        expect(visibleIds([rect])).toEqual(['edit.duplicate', 'edit.delete', 'object.convertToPath', 'viewbox.fitSelection']);
    });

    it("shows group only for two or more selected nodes", () => {
        expect(visibleIds([rect, path])).toContain('object.group');
        expect(visibleIds([rect])).not.toContain('object.group');
    });

    it("shows ungroup only when a group is selected", () => {
        expect(visibleIds([group])).toContain('object.ungroup');
        expect(visibleIds([rect, path])).not.toContain('object.ungroup');
    });

    it("hides convert to path when no shape is selected", () => {
        expect(visibleIds([group])).not.toContain('object.convertToPath');
        expect(visibleIds([path])).not.toContain('object.convertToPath');
    });
});
