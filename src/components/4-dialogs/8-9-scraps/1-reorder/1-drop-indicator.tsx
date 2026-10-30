import { useAtomValue } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { dropIndicatorAtom } from "./9-atoms-reorder";

/** Insertion line inside the scraps list; it glides between rows */
export function ScrapsDropIndicator() {
    const indicator = useAtomValue(dropIndicatorAtom);
    return (
        <AnimatePresence>
            {indicator && (
                <motion.div
                    key="drop-indicator"
                    className="absolute left-1 right-1 -mt-px h-0.5 bg-(--editor-accent) rounded-full pointer-events-none z-10"
                    aria-hidden
                    initial={{ opacity: 0, top: indicator.top }}
                    animate={{ opacity: 1, top: indicator.top }}
                    exit={{ opacity: 0 }}
                    transition={GLIDE}
                />
            )}
        </AnimatePresence>
    );
}

const GLIDE = { type: 'spring', stiffness: 900, damping: 60, opacity: { duration: 0.1 } } as const;
