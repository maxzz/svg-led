import { AnimatePresence, motion } from "motion/react";
import { useSnapshot } from "valtio";
import { fmtNum } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { useDocSnapshot } from "@/store/3-document";
import { Island } from "@/ui/local-ui/9-island";

const SLIDE_PX = 24;

/** Current viewBox numbers, shown in the bottom-left corner while "Use viewBox" is enabled */
export function Island_ViewBoxDims() {
    const { showViewBox } = useSnapshot(appSettings.prefs);
    const vb = useDocSnapshot().viewBox;

    const isShown = showViewBox && !!vb;

    return (
        <AnimatePresence initial={false}>
            {isShown && vb && (
                <motion.div
                    key="viewbox-dims"
                    className="pointer-events-auto"
                    initial={{ opacity: 0, x: SLIDE_PX }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: SLIDE_PX }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <Island>
                        <span className="select-none whitespace-nowrap px-2 h-9 flex items-center text-[10px] font-code tabular-nums text-muted-foreground" title="ViewBox">
                            viewBox {fmtNum(vb.x, 3)} {fmtNum(vb.y, 3)} {fmtNum(vb.width, 3)} {fmtNum(vb.height, 3)}
                        </span>
                    </Island>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
