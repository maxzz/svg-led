import { describe, expect, it } from "vitest";
import { extractMarkup } from "../1-paste/1-extract-markup";
import { jsxToSvg, looksLikeJsx } from "../1-paste/2-jsx-to-svg";
import { runPastePipeline } from "../1-paste/0-paste-pipeline";
import { type PasteContext } from "../1-paste/9-paste-types";

const REACT_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
	{title && <title>{title}</title>}
	<path d="M6 4 V20.4 L7 20.3 L11.4 15.5 L17.3 15.5 L17.1 14.9 L6.5 4.2 Z" />
</svg>`;

const filled: PasteContext = { docIsEmpty: false, viewBox: { x: 0, y: 0, width: 24, height: 24 }, rootAttrs: { xmlns: 'http://www.w3.org/2000/svg' } };
const empty: PasteContext = { ...filled, docIsEmpty: true };

describe("jsxToSvg", () => {
    it("converts the React icon props to SVG attributes and drops the spread and the conditional title", () => {
        expect(jsxToSvg(REACT_ICON)).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M6 4 V20.4 L7 20.3 L11.4 15.5 L17.3 15.5 L17.1 14.9 L6.5 4.2 Z"/>'
            + '</svg>'
        );
    });

    it("writes className as class, style objects as CSS, and drops handlers and dynamic values", () => {
        const svg = jsxToSvg(`<g className="a" style={{ fillOpacity: 0.5, strokeDasharray: "2 2", width: 10 }} onClick={() => go()} opacity={value}><rect x={1} y="2" width={3} height={4} /></g>`);
        expect(svg).toBe('<g class="a" style="fill-opacity:0.5;stroke-dasharray:2 2;width:10px"><rect x="1" y="2" width="3" height="4"/></g>');
    });

    it("keeps SVG camelCase attributes and maps xlinkHref", () => {
        expect(jsxToSvg('<svg viewBox="0 0 1 1"><linearGradient gradientUnits="userSpaceOnUse" /><use xlinkHref="#a" /></svg>')).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1 1"><linearGradient gradientUnits="userSpaceOnUse"/><use xlink:href="#a"/></svg>'
        );
    });

    it("maps react-native-svg and motion components and unwraps fragments", () => {
        expect(jsxToSvg('<><Svg viewBox="0 0 2 2"><G><Path d="M0 0" /></G><motion.circle r={1} animate={{ r: 2 }} /></Svg></>')).toBe(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><g><path d="M0 0"/></g><circle r="1"/></svg>'
        );
    });

    it("skips JSX with quotes inside expressions", () => {
        expect(jsxToSvg(`<svg>{label ? <text>Don't</text> : null}<path d="M1 1" /></svg>`)).toBe('<svg xmlns="http://www.w3.org/2000/svg"><path d="M1 1"/></svg>');
    });

    it("returns undefined for unbalanced JSX", () => {
        expect(jsxToSvg('<svg><path d="M0 0" /></g>')).toBeUndefined();
    });
});

describe("looksLikeJsx", () => {
    it("tells JSX from plain SVG", () => {
        expect(looksLikeJsx(REACT_ICON)).toBe(true);
        expect(looksLikeJsx('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" stroke-width="2"/></svg>')).toBe(false);
        expect(looksLikeJsx('<svg><style>.a{fill:red}</style></svg>')).toBe(false);
    });
});

describe("extractMarkup", () => {
    it("cuts the <svg> out of a component file", () => {
        const file = `import { type SVGProps } from "react";\n\nexport function IconX({ title, ...rest }: SVGProps<SVGSVGElement>) {\n    return (\n        ${REACT_ICON}\n    );\n}\n`;
        expect(extractMarkup(file)).toBe(REACT_ICON);
    });

    it("finds bare elements after TypeScript generics", () => {
        expect(extractMarkup('const a: Array<SVGElement> = []; const x = <path d="M0 0" />;')).toBe('<path d="M0 0" />');
    });
});

describe("runPastePipeline", () => {
    it("converts a React icon file into SVG markup whose root paint lands on a group", () => {
        const rv = runPastePipeline(`export const Icon = () => (\n${REACT_ICON}\n);`, filled);
        expect(rv.asDocument).toBe(false);
        expect(rv.text).toBe([
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
            '    <g fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
            '        <path d="M6 4 V20.4 L7 20.3 L11.4 15.5 L17.3 15.5 L17.1 14.9 L6.5 4.2 Z"/>',
            '    </g>',
            '</svg>',
            '',
        ].join('\n'));
        expect(rv.applied.map((b) => b.id)).toEqual(['extract-markup', 'jsx-to-svg', 'root-style-to-group']);
    });

    it("on an empty canvas the React icon becomes the document with its root paint", () => {
        const rv = runPastePipeline(REACT_ICON, empty);
        expect(rv.asDocument).toBe(true);
        expect(rv.text).toContain('stroke-width="1.5"');
        expect(rv.applied.map((b) => b.id)).toEqual(['jsx-to-svg', 'adopt-document']);
    });

    it("leaves plain SVG unchanged", () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>';
        expect(runPastePipeline(svg, filled)).toMatchObject({ text: svg, asDocument: false, applied: [] });
    });

    it("on an empty canvas a whole <svg> becomes the document", () => {
        const rv = runPastePipeline('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="1" height="1"/></svg>', empty);
        expect(rv.asDocument).toBe(true);
        expect(rv.applied.map((b) => b.id)).toEqual(['adopt-document']);
    });

    it("on an empty canvas bare elements are wrapped into an <svg> with the document viewBox", () => {
        const rv = runPastePipeline('<path d="M0 0" strokeWidth={2} />', empty);
        expect(rv.asDocument).toBe(true);
        expect(rv.text).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">\n<path d="M0 0" stroke-width="2"/>\n</svg>');
    });
});
