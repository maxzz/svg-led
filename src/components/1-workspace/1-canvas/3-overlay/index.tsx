import { useAtomValue } from "jotai";
import { ToolId, activeToolIdAtom } from "@/store/4-editor";
import { ViewBoxFrame } from "./1-viewbox-frame";
import { SelectionOverlay } from "./2-selection-overlay";
import { PointsOverlay } from "./3-points-overlay";
import { PenOverlay } from "./4-pen-overlay";
import { Marquee } from "./5-marquee";
import { Lasso } from "./6-lasso";
import { SnapGuidesOverlay } from "@/tools/core-snapping";

/** Editor decorations drawn in screen space so they keep their size at any zoom */
export function OverlayLayer() {
    const tool = useAtomValue(activeToolIdAtom);

    return (
        <g>
            <ViewBoxFrame />
            {tool === ToolId.points
                ? <PointsOverlay />
                : tool === ToolId.pen
                    ? <PenOverlay />
                    : <SelectionOverlay />
            }
            <Marquee />
            <Lasso />
            <SnapGuidesOverlay />
        </g>
    );
}
