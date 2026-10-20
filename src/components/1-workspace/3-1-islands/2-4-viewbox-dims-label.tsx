import { AnimatePresence, motion } from "motion/react";
import { useSnapshot } from "valtio";
import { fmtNum } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { useDocSnapshot } from "@/store/3-document";

const SLIDE_PX = 24;

/**
 * ViewBox numbers shown inside the zoom island (bottom-left corner) while "Use viewBox" is enabled.
 * The label slides out of the island's right edge (right to left) and retracts back into it when disabled.
 */
export function ViewBoxDimsLabel() {
    const { showViewBox } = useSnapshot(appSettings.prefs);
    const vb = useDocSnapshot().viewBox;

    const isShown = showViewBox && !!vb;

    return (
        <AnimatePresence initial={false}>
            {isShown && vb && (
                <motion.div
                    key="viewbox-dims"
                    className="overflow-hidden flex items-center"
                    initial={{ width: 0 }}
                    animate={{ width: "auto" }}
                    exit={{ width: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <motion.span
                        className="select-none whitespace-nowrap pl-1 pr-2 text-[10px] font-code tabular-nums text-muted-foreground"
                        initial={{ x: SLIDE_PX, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: SLIDE_PX, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        title="ViewBox"
                    >
                        viewBox {fmtNum(vb.x, 3)} {fmtNum(vb.y, 3)} {fmtNum(vb.width, 3)} {fmtNum(vb.height, 3)}
                    </motion.span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
