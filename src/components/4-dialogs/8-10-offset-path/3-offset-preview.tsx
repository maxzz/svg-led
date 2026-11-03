import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings } from "@/store/1-ui-settings";
import { docState } from "@/store/3-document";
import { type SvgDoc, findNode, makeFmt, matrixToString, nodeCtm, offsetPathData, pathFillRule } from "@/svg-core";
import { attrsToProps } from "@/components/1-workspace/1-canvas/2-doc-layer/2-attrs-to-props";
import { isOpenOffsetPathDialogAtom, offsetLiveAtom, offsetPathTargetIdsAtom } from "./9-atoms-offset-path";

const fmt = makeFmt(4);

/** The offset copies, drawn in document space until OK inserts them or Cancel drops them. */
export function OffsetPathPreview() {
    const open = useAtomValue(isOpenOffsetPathDialogAtom);
    if (!open) {
        return null;
    }
    return <OffsetPathPreviewShapes />;
}

function OffsetPathPreviewShapes() {
    const ids = useAtomValue(offsetPathTargetIdsAtom);
    const live = useAtomValue(offsetLiveAtom);
    const { dlgOffsetPath, prefs } = useSnapshot(appSettings);
    const { doc } = useSnapshot(docState);
    if (!dlgOffsetPath.preview || !ids.length) {
        return null;
    }

    const request = {
        offset: live ?? dlgOffsetPath.offset,
        joins: dlgOffsetPath.joins,
        miterLimit: dlgOffsetPath.miterLimit,
    };
    const shapes = [];
    for (const id of ids) {
        const loc = findNode(doc as SvgDoc, id);
        if (!loc || loc.node.kind !== 'path') {
            continue;
        }
        const d = offsetPathData(loc.node.d, { ...request, fillRule: pathFillRule(loc.node.attrs) }, prefs.precision);
        if (!d) {
            continue;
        }
        const props = attrsToProps(loc.node.attrs);
        delete props.transform;
        delete props.id;
        shapes.push(
            <g key={id} transform={matrixToString(nodeCtm(loc), fmt)} className="pointer-events-none">
                <path {...props} d={d} pointerEvents="none" />
            </g>
        );
    }
    return <>{shapes}</>;
}
