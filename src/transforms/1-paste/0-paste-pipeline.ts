import { type PasteBlock, type PasteContext, type PasteResult } from "./9-paste-types";
import { Block_extractMarkup } from "./1-block-extract-markup";
import { Block_jsxToSvg } from "./2-block-jsx-to-svg";
import { Block_adoptDocument, Block_wrapFragment } from "./3-block-empty-canvas";
import { Block_rootStyleToGroup } from "./4-block-root-style-to-group";

/**
 * Blocks run in this order; each one gets the output of the blocks before it.
 * Format converters come first, then the blocks that decide how the SVG lands in the document.
 */
export const PASTE_BLOCKS: readonly PasteBlock[] = [
    Block_extractMarkup,
    Block_jsxToSvg,
    Block_adoptDocument,
    Block_wrapFragment,
    Block_rootStyleToGroup,
];

/** Turns pasted or dropped text into SVG markup the document can take */
export function runPastePipeline(text: string, ctx: PasteContext, blocks: readonly PasteBlock[] = PASTE_BLOCKS): PasteResult {
    let data = { text, asDocument: false };
    const applied: PasteBlock[] = [];

    for (const block of blocks) {
        const next = block.apply(data, ctx);
        if (next) {
            data = next;
            applied.push(block);
        }
    }

    return { ...data, applied };
}
