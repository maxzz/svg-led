export const ExportFormatId = {
    svg: 'svg',
    png: 'png',
    tsx: 'tsx',
    dataUri: 'data-uri',
} as const;

export type ExportFormatId = typeof ExportFormatId[keyof typeof ExportFormatId];

/** Which elements are exported */
export type ExportScope = 'selection' | 'all';

/** The coordinate system of the exported <svg>: the document viewBox, or a viewBox fitted around the exported elements */
export type ExportBounds = 'viewBox' | 'content';

/** All fields of the Export dialog. Each format reads only the fields of its controls. */
export type ExportOptions = {
    format: ExportFormatId;
    scope: ExportScope;
    bounds: ExportBounds;
    tailwind: boolean;           // SVG and React: presentation attributes as Tailwind classes
    pngScale: number;            // PNG: pixels per viewBox unit
    pngBackground: string;       // PNG: CSS color painted under the drawing; empty is transparent
    componentName: string;       // React: component name; empty derives it from the file name
    dataUriBase64: boolean;      // Data URI: base64 instead of URL encoding
    dataUriCss: boolean;         // Data URI: wrapped as a CSS background-image declaration
};

export type ExportContext = {
    baseName: string;            // document file name without extension
};

/** Option controls the dialog shows for a format */
export type ExportControlId = 'tailwind' | 'pngScale' | 'pngBackground' | 'componentName' | 'dataUriEncoding';

export type ExportTextLanguage = 'xml' | 'typescript' | 'css' | 'plaintext';

export type ExportOutput =
    | { kind: 'text'; text: string; language: ExportTextLanguage; mime: string; fileName: string; }
    | { kind: 'image'; blob: Blob; dataUrl: string; width: number; height: number; mime: string; fileName: string; };

/** A filter over the SVG text before the format writes it; skipped when `enabled` says so */
export type ExportStep = {
    id: string;
    label: string;
    enabled?: (options: ExportOptions) => boolean;
    apply: (svg: string, options: ExportOptions, ctx: ExportContext) => string;
};

/**
 * One target format of the Export dialog: the SVG text goes through `steps`, then `write` makes the output.
 * A new format is a new object in EXPORT_FORMATS; its controls come from the dialog's control registry.
 */
export type ExportFormat = {
    id: ExportFormatId;
    label: string;
    description: string;
    controls: readonly ExportControlId[];
    steps: readonly ExportStep[];
    write: (svg: string, options: ExportOptions, ctx: ExportContext) => ExportOutput | Promise<ExportOutput>;
};
