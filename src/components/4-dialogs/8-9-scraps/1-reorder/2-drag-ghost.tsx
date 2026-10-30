import { createPortal } from "react-dom";
import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { Archive } from "lucide-react";
import { ghostX, ghostY, reorderDragAtom } from "./9-atoms-reorder";

/** Label that follows the pointer while a scrap is dragged in the list */
export function ScrapsDragGhost() {
    const drag = useAtomValue(reorderDragAtom);
    return createPortal(
        <AnimatePresence>
            {drag && (
                <motion.div
                    key="scraps-drag-ghost"
                    className="fixed top-0 left-0 pointer-events-none z-[60]"
                    style={{ x: ghostX, y: ghostY }}
                >
                    <motion.div
                        className="ml-3 mt-2 px-2 h-6 max-w-56 text-xs text-foreground bg-background border border-(--editor-accent)/60 rounded-md shadow-md truncate flex items-center gap-1.5"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.12 }}
                    >
                        <Archive className="shrink-0 size-3.5 text-(--editor-accent)" />
                        <span className="truncate">{drag.name}</span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
