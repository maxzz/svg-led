import { describe, expect, it } from "vitest";
import { formatSvgText } from "../index";

describe("formatSvgText", () => {
    it("indents nested elements one level per depth", () => {
        const src = '<svg xmlns="http://www.w3.org/2000/svg"><g><rect x="1" y="2"/><circle r="3"></circle></g></svg>';
        expect(formatSvgText(src)).toBe([
            '<svg xmlns="http://www.w3.org/2000/svg">',
            '  <g>',
            '    <rect x="1" y="2"/>',
            '    <circle r="3"></circle>',
            '  </g>',
            '</svg>',
        ].join('\n'));
    });

    it("re-indents already formatted input the same way (idempotent)", () => {
        const once = formatSvgText('<svg><g><path d="M0 0L1 1"/></g></svg>\n')!;
        expect(formatSvgText(once)).toBe(once);
        expect(once.endsWith('\n')).toBe(true);
    });

    it("keeps single text children on one line", () => {
        expect(formatSvgText('<svg><title>  Logo  </title></svg>')).toBe('<svg>\n  <title>Logo</title>\n</svg>');
    });

    it("collapses whitespace between attributes but keeps attribute values exactly", () => {
        const out = formatSvgText('<svg\n   viewBox="0  0 10 10"\n\tclass=\'a  b\'   ><rect   width="5" /></svg>');
        expect(out).toBe('<svg viewBox="0  0 10 10" class=\'a  b\'>\n  <rect width="5"/>\n</svg>');
    });

    it("keeps comments, processing instructions and the doctype", () => {
        const src = '<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd" [ <!ENTITY a "b"> ]>\n<svg><!-- svg-led:off --><g/></svg>';
        expect(formatSvgText(src)).toBe([
            '<?xml version="1.0"?>',
            '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd" [ <!ENTITY a "b"> ]>',
            '<svg>',
            '  <!-- svg-led:off -->',
            '  <g/>',
            '</svg>',
        ].join('\n'));
    });

    it("does not touch the content of whitespace-sensitive elements", () => {
        const src = '<svg><text x="0">  a <tspan>  b  </tspan>c</text><style>\n.a{fill:red}\n</style></svg>';
        expect(formatSvgText(src)).toBe([
            '<svg>',
            '  <text x="0">  a <tspan>  b  </tspan>c</text>',
            '  <style>\n.a{fill:red}\n</style>',
            '</svg>',
        ].join('\n'));
    });

    it("keeps CDATA content", () => {
        expect(formatSvgText('<svg><style><![CDATA[ a > b ]]></style></svg>')).toBe('<svg>\n  <style><![CDATA[ a > b ]]></style>\n</svg>');
    });

    it("returns null for malformed markup instead of changing it", () => {
        expect(formatSvgText('<svg><g></svg>')).toBeNull();
        expect(formatSvgText('<svg><rect width=5/></svg>')).toBeNull();
        expect(formatSvgText('<svg><!-- open </svg>')).toBeNull();
        expect(formatSvgText('<svg></svg></g>')).toBeNull();
    });

    it("formats an empty document to an empty string", () => {
        expect(formatSvgText('')).toBe('');
    });
});
