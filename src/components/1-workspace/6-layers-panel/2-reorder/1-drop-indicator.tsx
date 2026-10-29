import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { classNames } from "@/utils";
import { dropIndicatorAtom } from "./9-atoms-reorder";

/** Insertion line, or a box around the target group, inside the tree's scroll container; it glides between rows */
export function LayersDropIndicator() {
    const indicator = useAtomValue(dropIndicatorAtom);
    return (
        <AnimatePresence>
            {indicator && (
                <motion.div
                    key="drop-indicator"
                    className={classNames(
                        "absolute right-1 pointer-events-none z-10",
                        indicator.box
                            ? "bg-(--editor-accent)/10 border-[1.5px] border-(--editor-accent) rounded-sm"
                            : "-mt-px bg-(--editor-accent) rounded-full",
                    )}
                    initial={{ opacity: 0, top: indicator.top, left: indicator.left, height: lineOrBox(indicator.height) }}
                    animate={{ opacity: 1, top: indicator.top, left: indicator.left, height: lineOrBox(indicator.height) }}
                    exit={{ opacity: 0 }}
                    transition={GLIDE}
                />
            )}
        </AnimatePresence>
    );
}

const GLIDE = { type: 'spring', stiffness: 900, damping: 60, opacity: { duration: 0.1 } } as const;

function lineOrBox(height: number): number {
    return height || 2;
}
