import { proxy } from "valtio";
import { type SvgDoc } from "@/svg-core";
import { appSettings } from "../1-ui-settings";

export type DocState = {
    doc: SvgDoc;
    fileName: string;            // name used by Save; set by Open and drag-and-drop
};

/**
 * The SVG document. Every node is its own nested Valtio proxy, so a component that renders
 * one node with useSnapshot(nodeProxy) re-renders only when that node changes.
 */
export const docState = proxy<DocState>({
    doc: createEmptyDoc(),
    fileName: 'untitled.svg',
});

export function createEmptyDoc(): SvgDoc {
    return {
        viewBox: { x: 0, y: 0, width: 512, height: 512 },
        rootAttrs: { xmlns: 'http://www.w3.org/2000/svg' },
        children: [],
    };
}

/** Decimal digits used whenever geometry is written back */
export function docPrecision(): number {
    return appSettings.prefs.precision;
}

export const SAMPLE_SVG = 
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect x="56" y="56" width="400" height="400" rx="48" fill="#e8f1fb" stroke="#1971c2" stroke-width="6"/>
    <path d="M136 320 C136 200 216 152 256 152 C296 152 376 200 376 320" fill="none" stroke="#e03131" stroke-width="12" stroke-linecap="round"/>
    <circle cx="256" cy="320" r="48" fill="#ffd43b" stroke="#2f9e44" stroke-width="6"/>
    <path d="M176 392 L336 392" stroke="#343a40" stroke-width="10" stroke-linecap="round"/>
</svg>
`;
