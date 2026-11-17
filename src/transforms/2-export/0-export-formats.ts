import { type ExportContext, type ExportFormat, type ExportFormatId, type ExportOptions, type ExportOutput, ExportFormatId as Id } from "./9-export-types";
import { internalStatesStep } from "./1-1-step-internal-states";
import { tailwindClassesStep } from "./1-2-step-tailwind-classes";
import { classFirstStep } from "./1-3-step-class-first";
import { formatSvgStep } from "./1-8-step-format-svg";
import { componentNameFor, svgToReactComponent } from "./2-svg-to-jsx";
import { dataUriAsCss, svgToDataUri } from "./3-data-uri";
import { rasterizeSvg } from "./4-rasterize-png";

//---------------------------------------------------------------------------

const svgFormat: ExportFormat = {
    id: Id.svg,
    label: 'SVG',
    description: 'SVG file as the source panel shows it',
    controls: ['tailwind', 'formatSvg'],
    steps: [internalStatesStep, tailwindClassesStep, classFirstStep, formatSvgStep],
    write:
        (svg, _options, ctx) => ({ kind: 'text', text: svg, language: 'xml', mime: 'image/svg+xml', fileName: `${ctx.baseName}.svg` }),
};

//---------------------------------------------------------------------------

const tsxFormat: ExportFormat = {
    id: Id.tsx,
    label: 'React',
    description: 'React TSX component with props spread onto the <svg>',
    controls: ['componentName', 'tailwind'],
    steps: [internalStatesStep, tailwindClassesStep, classFirstStep],
    write:
        (svg, options, ctx) => {
            const name = componentNameFor(options.componentName, ctx.baseName);
            const text = svgToReactComponent(svg, name);
            if (text === undefined) {
                throw new Error('The SVG is not well-formed');
            }
            return { kind: 'text', text, language: 'typescript', mime: 'text/plain', fileName: `${name}.tsx` };
        },
};

const dataUriFormat: ExportFormat = {
    id: Id.dataUri,
    label: 'Data URI',
    description: 'Inline image URL for CSS or an <img> src',
    controls: ['dataUriEncoding'],
    steps: [internalStatesStep, classFirstStep],
    write:
        (svg, options, ctx) => {
            const uri = svgToDataUri(svg, options.dataUriBase64);
            return options.dataUriCss
                ? { kind: 'text', text: dataUriAsCss(uri), language: 'css', mime: 'text/css', fileName: `${ctx.baseName}.css` }
                : { kind: 'text', text: uri, language: 'plaintext', mime: 'text/plain', fileName: `${ctx.baseName}.txt` };
        },
};

const pngFormat: ExportFormat = {
    id: Id.png,
    label: 'PNG',
    description: 'Bitmap image of the viewBox area',
    controls: ['pngScale', 'pngBackground'],
    steps: [],
    write:
        async (svg, options, ctx) => {
            const image = await rasterizeSvg(svg, options.pngScale, options.pngBackground);
            const suffix = options.pngScale !== 1 ? `@${options.pngScale}x` : '';
            return { kind: 'image', ...image, mime: 'image/png', fileName: `${ctx.baseName}${suffix}.png` };
        },
};

//---------------------------------------------------------------------------

/** Formats in the order the Export dialog lists them */
export const EXPORT_FORMATS: readonly ExportFormat[] = [
    svgFormat,
    tsxFormat,
    dataUriFormat,
    pngFormat,
];

export function getExportFormat(id: ExportFormatId): ExportFormat {
    return EXPORT_FORMATS.find((f) => f.id === id) ?? svgFormat;
}

//---------------------------------------------------------------------------

export type ExportResult = { ok: true; output: ExportOutput; } | { ok: false; error: string; };

/** Runs the enabled steps of the format over the SVG, then its writer */
export async function runExport(format: ExportFormat, svg: string, options: ExportOptions, ctx: ExportContext): Promise<ExportResult> {
    try {
        let text = svg;
        for (const step of format.steps) {
            if (step.enabled?.(options) ?? true) {
                text = step.apply(text, options, ctx);
            }
        }
        return { ok: true, output: await format.write(text, options, ctx) };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
}

//---------------------------------------------------------------------------
