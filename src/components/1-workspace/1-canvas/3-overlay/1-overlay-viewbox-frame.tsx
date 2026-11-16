import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { canvasSizeAtom, rectToScreen, viewportAtom } from "@/store/4-editor";

/** Dims everything outside the viewBox and frames it, like an artboard */
export function Overlay_ViewBoxFrame() {
    const { showViewBox } = useSnapshot(appSettings.prefs);
    const { viewBox } = useSnapshot(docState.doc);

    const vp = useAtomValue(viewportAtom);
    const size = useAtomValue(canvasSizeAtom);

    if (!showViewBox || !viewBox) {
        return null;
    }

    const vb = viewBox;
    const r = rectToScreen(vp, vb);
    const outside = `M0 0 H${size.width} V${size.height} H0 Z M${r.x} ${r.y} V${r.y + r.height} H${r.x + r.width} V${r.y} Z`;

    return (
        <g className="pointer-events-none">
            {/* Background around the viewBox */}
            <path d={outside} fillRule="evenodd" className="fill-foreground/5" />

            {/* Stroke around the viewBox */}
            <rect x={r.x} y={r.y} width={r.width} height={r.height} fill="none" className="stroke-foreground/20" strokeWidth={1} strokeDasharray="1 1" />
        </g>
    );
}
