import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { fmtNum } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { canvasSizeAtom, rectToScreen, viewportAtom } from "@/store/4-editor";

/** Dims everything outside the viewBox and frames it, like an artboard */
export function ViewBoxFrame() {
    const { prefs } = useSnapshot(appSettings);
    const { doc } = useSnapshot(docState);
    const vp = useAtomValue(viewportAtom);
    const size = useAtomValue(canvasSizeAtom);

    if (!prefs.showViewBox || !doc.viewBox) {
        return null;
    }

    const vb = doc.viewBox;
    const r = rectToScreen(vp, vb);
    const outside = `M0 0 H${size.width} V${size.height} H0 Z M${r.x} ${r.y} V${r.y + r.height} H${r.x + r.width} V${r.y} Z`;
    const label = `viewBox ${fmtNum(vb.x, 3)} ${fmtNum(vb.y, 3)} ${fmtNum(vb.width, 3)} ${fmtNum(vb.height, 3)}`;

    return (
        <g className="pointer-events-none">
            <path d={outside} fillRule="evenodd" className="fill-foreground/5" />
            <rect x={r.x} y={r.y} width={r.width} height={r.height} fill="none" className="stroke-(--editor-accent)" strokeWidth={1} strokeDasharray="4 3" />
            <text x={r.x} y={r.y - 6} className="select-none font-code text-[10px] fill-muted-foreground">
                {label}
            </text>
        </g>
    );
}
