import { AnimatePresence, motion } from "motion/react";
import { useAtomValue } from "jotai";
import { useSnapshot } from "valtio";
import { type Point, type SvgDoc, applyMatrix, findNode, fmtNum, nodeCtm, pathDataToSubpaths } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { useDocSnapshot } from "@/store/3-document";
import { type PointRef, pointerDocAtom } from "@/store/4-editor";
import { cn } from "@/utils/classnames";
import { shownPointRefAtom } from "./9-atoms-pointer-coords";

/**
 * ViewBox numbers shown inside the help island (bottom-right corner) while "Use viewBox" is enabled.
 * The label slides out to the left of the viewBox settings button (right to left) and retracts back when disabled.
 */
export function ViewBoxDimsLabel() {
    const { showViewBox } = useSnapshot(appSettings.prefs);
    const vb = useDocSnapshot().viewBox;

    const isShown = showViewBox && !!vb;

    return (
        <AnimatePresence initial={false}>
            {isShown && vb && (
                <motion.div
                    className="self-stretch -my-1 -ml-1 overflow-hidden flex bg-foreground/3 rounded-l-[10px]"
                    initial={{ width: 0 }}
                    animate={{ width: "auto" }}
                    exit={{ width: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    key="viewbox-dims"
                >
                    <motion.div
                        className="flex items-stretch pl-2"
                        initial={{ x: SLIDE_PX, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: SLIDE_PX, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <div className="flex flex-col justify-center pr-2 select-none whitespace-nowrap text-[9px] leading-3 font-code tabular-nums text-muted-foreground" title="ViewBox">
                            <span>
                                viewBox
                            </span>
                            <span>
                                {fmtNum(vb.x, 3)}{' '}
                                {/* <span className="mx-px text-[7px]">x</span> */}
                                {fmtNum(vb.y, 3)}{' '}
                                {/* {' '}     */}
                                {fmtNum(vb.width, 3)}{' '}
                                {/* <span className="mx-px text-[7px]">x</span> */}
                                {fmtNum(vb.height, 3)}
                            </span>
                            
                            <PointerCoords />
                        </div>

                        <div className="w-px self-stretch bg-foreground/15" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/**
 * Position in document units, shown as a third line under the viewBox numbers.
 * While the pointer is over a path anchor or direction handle, it shows that point's coordinates (accent color);
 * otherwise the pointer's own position.
 * Each value sits in a fixed-width slot (in `ch`, sized for values like -1234.56), so a change in X never moves Y,
 * and the three lines fill the same 36px as the island's buttons, so the island keeps its height.
 */
function PointerCoords() {
    const { showPointerCoords } = useSnapshot(appSettings.prefs);
    const pointer = useAtomValue(pointerDocAtom);
    const pointRef = useAtomValue(shownPointRefAtom);
    const doc = useDocSnapshot();

    if (!showPointerCoords) {
        return null;
    }

    const onPoint = pointRef ? pointInDoc(doc, pointRef) : null;
    const at = onPoint ?? pointer;

    return (
        <span className="whitespace-nowrap flex gap-x-1">
            <span className={cn("w-[8ch] text-right", onPoint && "text-(--editor-accent)")} title={onPoint ? "Point X" : "Pointer X"}>
                {at ? fmtNum(at.x, 2) : '–'}
            </span>
            <span className={cn("w-[8ch] text-right", onPoint && "text-(--editor-accent)")} title={onPoint ? "Point Y" : "Pointer Y"}>
                {at ? fmtNum(at.y, 2) : '–'}
            </span>
        </span>
    );
}

/** Document-space position of a path anchor or handle, or null when the node is gone or is not a path */
function pointInDoc(doc: SvgDoc, ref: PointRef): Point | null {
    const loc = findNode(doc, ref.nodeId);
    if (loc?.node.kind !== 'path') {
        return null;
    }

    const [si, ai] = ref.key.split(':').map(Number);
    const anchor = pathDataToSubpaths(loc.node.d)[si]?.anchors[ai];
    const local = ref.side ? anchor?.[ref.side] : anchor;
    return local ? applyMatrix(nodeCtm(loc), local) : null;
}

const SLIDE_PX = 24;
