import { useAtomValue } from "jotai";
import { ToolId, activeToolIdAtom } from "@/store/4-editor";
import { Overlay_ViewBoxFrame } from "./1-overlay-viewbox-frame";
import { Overlay_Selection } from "./2-overlay-selection";
import { Overlay_Points } from "./3-overlay-points";
import { Overlay_Pen } from "./4-overlay-pen";
import { Marquee, Lasso } from "./5-marquee";
import { SnapGuidesOverlay } from "@/tools/core-snapping";
import { PointSnapOverlay } from "@/tools/core-point-snapping";

/** Editor decorations drawn in screen space so they keep their size at any zoom */
export function OverlayLayer() {
    const tool = useAtomValue(activeToolIdAtom);

    return (
        <g>
            <Overlay_ViewBoxFrame />

            {tool === ToolId.points
                ? <Overlay_Points />
                : tool === ToolId.pen
                    ? <Overlay_Pen />
                    : <Overlay_Selection />
            }

            <Marquee />
            <Lasso />
            <SnapGuidesOverlay />
            <PointSnapOverlay />
        </g>
    );
}
