import { Fragment } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ChevronRight, Layers } from "lucide-react";
import { docState } from "@/store/3-document";
import { exitIsolationLevelAtom, exitIsolationToAtom, isolationChainAtom } from "@/store/6-layers";
import { Island } from "@/ui/local-ui/9-island";
import { classNames } from "@/utils";

/** Isolation path, as in Illustrator: back one level, the document, then every isolated group; a click goes back to that level */
export function Island_IsolationBreadcrumbs() {
    const chain = useAtomValue(isolationChainAtom);

    return (
        <AnimatePresence initial={false}>
            {chain.length > 0 && (
                <motion.div
                    className="pointer-events-auto"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                >
                    <Breadcrumbs />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function Breadcrumbs() {
    const chain = useAtomValue(isolationChainAtom);
    const { fileName } = useSnapshot(docState);
    const back = useSetAtom(exitIsolationLevelAtom);
    const goTo = useSetAtom(exitIsolationToAtom);

    return (
        <Island className="max-w-[min(90vw,48rem)] overflow-x-auto">
            <button className={crumbClasses} title="Back one level — Esc, or double-click outside of any element" onClick={() => back()} type="button">
                <ArrowLeft className="size-3.5" />
            </button>

            <button className={crumbClasses} title="Exit isolation mode" onClick={() => goTo(null)} type="button">
                <Layers className="size-3.5" />
                <span className="truncate">{fileName}</span>
            </button>

            {chain.map((level, i) => {
                const last = i === chain.length - 1;
                return (
                    <Fragment key={level.id}>
                        <ChevronRight className="shrink-0 size-3 text-muted-foreground" />
                        <button
                            className={classNames(crumbClasses, last ? "font-bold text-foreground" : "underline decoration-dotted underline-offset-2")}
                            title={last ? "Isolated group" : "Isolate this group"}
                            disabled={last}
                            onClick={() => goTo(level.id)}
                            type="button"
                        >
                            <span className="truncate">{level.label}</span>
                        </button>
                    </Fragment>
                );
            })}
        </Island>
    );
}

const crumbClasses = "shrink-0 px-1.5 max-w-48 h-7 text-xs text-foreground/80 hover:bg-muted disabled:hover:bg-transparent transition-colors rounded-md flex items-center gap-1 cursor-pointer disabled:cursor-default";
