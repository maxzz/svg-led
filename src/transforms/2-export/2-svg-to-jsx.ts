import { type MarkupAttr, type MarkupElement, type MarkupNode, PRESERVE_TEXT, parseMarkup, rootElement } from "../0-markup/1-markup-tree";
import { reactPropName } from "../0-markup/2-svg-names";
import { cssToStyleObject } from "../0-markup/3-style-object";

const INDENT = '    ';

/**
 * A React component that renders the SVG: attributes as JSX props (`strokeWidth={1.5}`, `className`, style objects),
 * the root <svg> spreads the remaining props, and a `title` prop renders an accessible <title>.
 * Undefined when the text is not a well-formed <svg>.
 */
export function svgToReactComponent(svg: string, componentName: string): string | undefined {
    const root = rootElement(parseMarkup(svg) ?? []);
    if (!root || root.name !== 'svg') {
        return undefined;
    }
    const hasTitle = root.children.some((c) => c.kind === 'el' && c.name === 'title');

    const lines = [
        'import { type SVGProps } from "react";',
        '',
        `export function ${componentName}({ ${hasTitle ? '' : 'title, '}...rest }: SVGProps<SVGSVGElement>${hasTitle ? '' : ' & { title?: string; }'}) {`,
        `${INDENT}return (`,
    ];
    printElement(root, 2, lines, true, hasTitle ? undefined : '{title && <title>{title}</title>}');
    lines.push(`${INDENT});`, '}', '');
    return lines.join('\n');
}

/** `untitled.svg` -> `IconUntitled`; a typed name is cleaned up into a valid identifier */
export function componentNameFor(typed: string, baseName: string): string {
    const name = pascalCase(typed);
    if (name) {
        return /^[A-Z]/.test(name) ? name : `Icon${name}`;
    }
    return `Icon${pascalCase(baseName) || 'Svg'}`;
}

function pascalCase(text: string): string {
    return text.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
}

//---------------------------------------------------------------------------

/** `root` is the <svg>, which takes the spread props and, when given, `rootFirstChild` as its first child */
function printElement(el: MarkupElement, depth: number, lines: string[], root = false, rootFirstChild?: string): void {
    const pad = INDENT.repeat(depth);
    const props = el.attrs.map(jsxProp).filter((p): p is string => !!p);
    root && props.push('{...rest}');
    const open = `<${el.name}${props.map((p) => ' ' + p).join('')}`;

    const kids = el.children.filter((c) => (c.kind !== 'text' || c.text.trim() !== '') && c.kind !== 'raw');
    if (!kids.length && !rootFirstChild) {
        lines.push(`${pad}${open} />`);
        return;
    }
    if (PRESERVE_TEXT.has(el.name) && kids.every((c) => c.kind === 'text' || c.kind === 'cdata')) {
        const text = kids.map((c) => (c as { text: string; }).text).join('');
        const body = el.name === 'style' || el.name === 'script' ? `{\`${escapeTemplate(text)}\`}` : jsxText(text);
        lines.push(`${pad}${open}>${body}</${el.name}>`);
        return;
    }

    lines.push(`${pad}${open}>`);
    rootFirstChild && lines.push(`${pad}${INDENT}${rootFirstChild}`);
    for (const kid of kids) {
        printChild(kid, depth + 1, lines);
    }
    lines.push(`${pad}</${el.name}>`);
}

function printChild(node: MarkupNode, depth: number, lines: string[]): void {
    const pad = INDENT.repeat(depth);
    switch (node.kind) {
        case 'el': printElement(node, depth, lines); return;
        case 'text': lines.push(pad + jsxText(node.text.trim())); return;
        case 'cdata': lines.push(`${pad}{\`${escapeTemplate(node.text)}\`}`); return;
        case 'comment': lines.push(`${pad}{/*${node.text.replace(/\*\//g, '* /')}*/}`); return;
    }
}

function jsxProp({ name, value }: MarkupAttr): string | undefined {
    const prop = reactPropName(name);
    if (!prop) {
        return undefined;
    }
    if (prop === 'style') {
        return `style={${cssToStyleObject(value)}}`;
    }
    if (value.trim() !== '' && String(Number(value)) === value) {
        return `${prop}={${value}}`;
    }
    return /["&\\]/.test(value) ? `${prop}={${JSON.stringify(value)}}` : `${prop}="${value}"`;
}

function jsxText(text: string): string {
    return /[{}<>&]/.test(text) ? `{${JSON.stringify(text)}}` : text;
}

function escapeTemplate(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}
