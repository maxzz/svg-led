import { AnimatePresence, motion } from "motion/react";
import { useSnapshot } from "valtio";
import { fmtNum } from "@/svg-core";
import { appSettings } from "@/store/1-ui-settings";
import { useDocSnapshot } from "@/store/3-document";

const SLIDE_PX = 24;

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
                    key="viewbox-dims"
                    className="self-stretch -my-1 overflow-hidden flex"
                    initial={{ width: 0 }}
                    animate={{ width: "auto" }}
                    exit={{ width: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <motion.div
                        className="flex items-stretch pl-2"
                        initial={{ x: SLIDE_PX, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: SLIDE_PX, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        <div className="flex flex-col justify-center pr-2 select-none whitespace-nowrap text-[10px] leading-3 font-code tabular-nums text-muted-foreground" title="ViewBox">
                            <span>viewBox</span>
                            <span>{fmtNum(vb.x, 3)} {fmtNum(vb.y, 3)} {fmtNum(vb.width, 3)} {fmtNum(vb.height, 3)}</span>
                        </div>

                        <div className="w-px self-stretch bg-foreground/15" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
