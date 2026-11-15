import { type MarkupElement, getAttr, parseMarkup, printSvgMarkup, rootElement, setAttr } from "../0-markup/1-markup-tree";

export type RasterImage = { blob: Blob; dataUrl: string; width: number; height: number; };

/** Renders the SVG to a PNG at `scale` pixels per viewBox unit (or per width/height unit without a viewBox). Browser only. */
export async function rasterizeSvg(svg: string, scale: number, background: string): Promise<RasterImage> {
    const nodes = parseMarkup(svg);
    const root = nodes && rootElement(nodes);
    const size = root && intrinsicSize(root);
    if (!nodes || !root || !size) {
        throw new Error('The SVG has neither a viewBox nor a width and height');
    }

    const width = Math.max(1, Math.round(size.width * scale));
    const height = Math.max(1, Math.round(size.height * scale));
    setAttr(root, 'width', String(width));
    setAttr(root, 'height', String(height));

    const url = URL.createObjectURL(new Blob([printSvgMarkup(nodes)], { type: 'image/svg+xml' }));
    try {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        await img.decode();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        if (background) {
            ctx.fillStyle = background;
            ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) {
            throw new Error('PNG encoding failed');
        }
        return { blob, dataUrl: canvas.toDataURL('image/png'), width, height };
    } finally {
        URL.revokeObjectURL(url);
    }
}

function intrinsicSize(root: MarkupElement): { width: number; height: number; } | undefined {
    const vb = (getAttr(root, 'viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
    if (vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) {
        return { width: vb[2], height: vb[3] };
    }
    const width = parseFloat(getAttr(root, 'width') ?? '');
    const height = parseFloat(getAttr(root, 'height') ?? '');
    return width > 0 && height > 0 ? { width, height } : undefined;
}
