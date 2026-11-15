import { type Attrs, type ViewBox } from "@/svg-core";

/** What the paste target looks like when the text arrives */
export type PasteContext = {
    docIsEmpty: boolean;         // the document has no elements yet (new or reset canvas)
    viewBox: ViewBox | null;     // the document viewBox, given to bare elements wrapped into a new <svg>
    rootAttrs: Attrs;            // the document root attributes, kept on a wrapping <svg>
};

/** Text on its way through the blocks */
export type PasteData = {
    text: string;
    asDocument: boolean;         // the text is a whole <svg> that replaces the (empty) document instead of being inserted into it
};

/**
 * One step of the paste pipeline. `apply` returns undefined when the block does not apply to the text, so the next block gets it unchanged.
 * A block that turns a foreign format into SVG markup (or reshapes the markup for the app) is added to PASTE_BLOCKS.
 */
export type PasteBlock = {
    id: string;
    label: string;
    notice?: string;             // told to the user when the block changed the pasted text
    apply: (data: PasteData, ctx: PasteContext) => PasteData | undefined;
};

export type PasteResult = PasteData & {
    applied: readonly PasteBlock[];
};
