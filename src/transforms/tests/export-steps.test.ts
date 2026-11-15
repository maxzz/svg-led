import { describe, expect, it } from "vitest";
import { parseMarkup, printSvgMarkup } from "../0-markup/1-markup-tree";
import { attrsToTailwind, tailwindClass } from "../2-export/1-tailwind-classes";
import { componentNameFor, svgToReactComponent } from "../2-export/2-svg-to-jsx";
import { minifySvg, svgToDataUri } from "../2-export/3-data-uri";
import { svgViewportSize } from "../2-export/5-svg-viewport";
import { runPastePipeline } from "../1-paste/0-paste-pipeline";

const ICON = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke-width="1.5" stroke-linecap="round">',
    '    <path d="M6 4 V20 Z" style="fill-opacity:0.5"/>',
    '</svg>',
    '',
].join('\n');

describe("markup tree", () => {
    it("prints what it parses", () => {
        expect(printSvgMarkup(parseMarkup(ICON)!)).toBe(ICON);
    });

    it("keeps the text of text elements and escapes it", () => {
        const svg = '<svg><text x="1">a &amp; <tspan>b</tspan></text></svg>';
        expect(printSvgMarkup(parseMarkup(svg)!, { indent: '' })).toBe(svg);
    });

    it("rejects markup that is not well-formed", () => {
        expect(parseMarkup('<svg><g></svg>')).toBeNull();
    });
});

describe("Tailwind classes", () => {
    it("maps paints, widths, opacity and other presentation attributes", () => {
        expect(tailwindClass('fill', 'currentColor')).toBe('fill-current');
        expect(tailwindClass('stroke', 'none')).toBe('stroke-none');
        expect(tailwindClass('fill', '#ff0000')).toBe('fill-[#ff0000]');
        expect(tailwindClass('stroke-width', '2')).toBe('stroke-2');
        expect(tailwindClass('stroke-width', '1.5')).toBe('stroke-[1.5]');
        expect(tailwindClass('opacity', '0.07')).toBe('opacity-7');
        expect(tailwindClass('opacity', '0.333')).toBe('opacity-[0.333]');
        expect(tailwindClass('stroke-dasharray', '2 4')).toBe('[stroke-dasharray:2_4]');
        expect(tailwindClass('d', 'M0 0')).toBeUndefined();
    });

    it("moves the attributes into the class of each element", () => {
        expect(attrsToTailwind('<svg viewBox="0 0 1 1" fill="none"><path class="a" d="M0 0" stroke="red"/></svg>')).toBe([
            '<svg viewBox="0 0 1 1" class="fill-none">',
            '    <path class="a stroke-[red]" d="M0 0"/>',
            '</svg>',
            '',
        ].join('\n'));
    });
});

describe("React component", () => {
    it("writes a component like the ones the paste filter reads", () => {
        expect(svgToReactComponent(ICON, 'IconArrow')).toBe([
            'import { type SVGProps } from "react";',
            '',
            'export function IconArrow({ title, ...rest }: SVGProps<SVGSVGElement> & { title?: string; }) {',
            '    return (',
            '        <svg viewBox="0 0 24 24" fill="currentColor" strokeWidth={1.5} strokeLinecap="round" {...rest}>',
            '            {title && <title>{title}</title>}',
            '            <path d="M6 4 V20 Z" style={{ fillOpacity: 0.5 }} />',
            '        </svg>',
            '    );',
            '}',
            '',
        ].join('\n'));
    });

    it("round-trips through the paste filter", () => {
        const ctx = { docIsEmpty: true, viewBox: null, rootAttrs: {} };
        const back = runPastePipeline(svgToReactComponent(ICON, 'IconArrow')!, ctx).text;
        expect(back).toBe('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M6 4 V20 Z" style="fill-opacity:0.5"/></svg>');
    });

    it("derives a component name", () => {
        expect(componentNameFor('', 'arrow-left')).toBe('IconArrowLeft');
        expect(componentNameFor('my icon', 'x')).toBe('MyIcon');
        expect(componentNameFor('2x', 'x')).toBe('Icon2x');
    });
});

describe("svg viewport", () => {
    it("uses the viewBox when width and height are missing", () => {
        expect(svgViewportSize('<svg viewBox="0 0 24 24"><rect x="2" y="4" width="8" height="8"/></svg>')).toEqual({ width: 24, height: 24 });
        expect(svgViewportSize('<svg viewBox="0,0,10,20"/>')).toEqual({ width: 10, height: 20 });
    });

    it("uses absolute width and height, even when the viewBox has another aspect", () => {
        expect(svgViewportSize('<svg width="200" height="100" viewBox="0 0 24 24"/>')).toEqual({ width: 200, height: 100 });
        expect(svgViewportSize('<svg width="2in" height="1in" viewBox="0 0 24 24"/>')).toEqual({ width: 192, height: 96 });
    });

    it("derives the missing side from the viewBox and ignores percentages", () => {
        expect(svgViewportSize('<svg width="50" viewBox="0 0 24 12"/>')).toEqual({ width: 50, height: 25 });
        expect(svgViewportSize('<svg width="100%" height="100%" viewBox="0 0 8 4"/>')).toEqual({ width: 8, height: 4 });
        expect(svgViewportSize('<svg/>')).toBeNull();
    });
});

describe("data URI", () => {
    it("minifies with single quotes and encodes only what needs it", () => {
        expect(minifySvg(ICON)).toBe("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' stroke-width='1.5' stroke-linecap='round'><path d='M6 4 V20 Z' style='fill-opacity:0.5'/></svg>");
        expect(svgToDataUri('<svg fill="#f00"/>', false)).toBe("data:image/svg+xml,%3Csvg fill='%23f00'/%3E");
        expect(svgToDataUri('<svg/>', true)).toBe(`data:image/svg+xml;base64,${btoa('<svg/>')}`);
    });
});
