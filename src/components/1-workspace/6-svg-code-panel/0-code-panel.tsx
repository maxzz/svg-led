import { lazy, Suspense } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { appSettings } from "@/store/1-ui-settings";
import { codeDirtyAtom, codeErrorAtom } from "@/store/4-editor";
import { applyCodeToCanvas, reloadCodeFromCanvas, setCodeSync } from "@/store/5-controllers";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Button } from "@/ui/shadcn/button";
import { isPanelResizingAtom, panelResizeDownAtom, panelResizeMoveAtom, panelResizeUpAtom } from "./9-atoms-code-panel";

const MonacoHost = lazy(() => import("./1-monaco-host"));

const SLIDE = { type: 'spring', stiffness: 420, damping: 40 } as const;

/** SVG source of the document, slides out from the left edge */
export function CodePanel() {
    const { codePanel } = useSnapshot(appSettings);
    const resizing = useAtomValue(isPanelResizingAtom);

    return (
        <AnimatePresence initial={false}>
            {codePanel.open && (
                <motion.aside
                    className="relative shrink-0 h-full bg-background border-r overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: codePanel.width }}
                    exit={{ width: 0 }}
                    transition={resizing ? { duration: 0 } : SLIDE}
                >
                    <div className="h-full flex flex-col" style={{ width: codePanel.width }}>
                        <PanelHeader />
                        <ErrorBar />
                        <div className="grow min-h-0">
                            <Suspense fallback={<div className="p-3 text-muted-foreground">Loading editor...</div>}>
                                <MonacoHost />
                            </Suspense>
                        </div>
                    </div>
                    <ResizeHandle />
                </motion.aside>
            )}
        </AnimatePresence>
    );
}

function PanelHeader() {
    const { codePanel } = useSnapshot(appSettings);
    const dirty = useAtomValue(codeDirtyAtom);

    return (
        <div className="shrink-0 px-3 h-11 border-b flex items-center gap-2">
            <span className="text-xs font-medium">SVG source</span>

            <label className="select-none ml-auto text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer" title="Two-way sync between the code and the canvas">
                <Checkbox checked={codePanel.sync} onCheckedChange={(v) => setCodeSync(v === true)} />
                Sync
            </label>

            {!codePanel.sync && (<>
                <Button variant="outline" size="xs" disabled={!dirty} onClick={() => applyCodeToCanvas()} title="Parse the code and replace the canvas">
                    Apply
                </Button>
                <Button variant="ghost" size="xs" disabled={!dirty} onClick={() => reloadCodeFromCanvas()} title="Replace the code with the canvas">
                    Reload
                </Button>
            </>)}

            <Button variant="ghost" size="icon-xs" onClick={() => { appSettings.codePanel.open = false; }} title="Close — Ctrl+B">
                <X />
            </Button>
        </div>
    );
}

function ErrorBar() {
    const error = useAtomValue(codeErrorAtom);
    if (!error) {
        return null;
    }
    
    return (
        <div className="shrink-0 whitespace-pre-wrap px-3 py-1.5 max-h-20 text-[11px] text-destructive bg-destructive/10 border-b overflow-auto">
            {error}
        </div>
    );
}

function ResizeHandle() {
    const down = useSetAtom(panelResizeDownAtom);
    const move = useSetAtom(panelResizeMoveAtom);
    const up = useSetAtom(panelResizeUpAtom);

    return (
        <div
            className="absolute top-0 right-0 w-1.5 h-full hover:bg-(--editor-accent)/30 active:bg-(--editor-accent)/50 transition-colors cursor-col-resize touch-none"
            onPointerDown={(e) => down({ clientX: e.clientX, pointerId: e.pointerId, target: e.currentTarget })}
            onPointerMove={(e) => move({ clientX: e.clientX })}
            onPointerUp={() => up()}
            onPointerCancel={() => up()}
        />
    );
}
