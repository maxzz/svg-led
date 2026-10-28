import { atomWithToolOptions } from "@/store/2-persist";
import { ToolId } from "@/store/4-editor";

export const pointsOptionsAtom = atomWithToolOptions<PointsToolOptions>(ToolId.points,
    {
        showAllHandles: false,
    }
);

type PointsToolOptions = {
    showAllHandles: boolean;     // show every direction handle, not only those of selected anchors
};
