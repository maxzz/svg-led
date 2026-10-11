import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { viewportAtom } from "@/store/4-editor";

/** Grid in document units; hidden when cells get too small to be useful */
export function GridLayer() {
    const { prefs } = useSnapshot(appSettings);
    const vp = useAtomValue(viewportAtom);

    let step = prefs.gridSize * vp.zoom;
    if (!prefs.showGrid || !(step > 0)) {
        return null;
    }

    while (step < 6) {
        step *= 5;
    }

    return (<>
        <defs>
            <pattern id="editor-grid" width={step} height={step} patternUnits="userSpaceOnUse" x={vp.x % step} y={vp.y % step}>
                <path d={`M${step} 0 H0 V${step}`} fill="none" strokeWidth={1} className="stroke-foreground/10" />
            </pattern>
        </defs>
        
        <rect width="100%" height="100%" fill="url(#editor-grid)" className="pointer-events-none" />
    </>);
}
