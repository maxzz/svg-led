import { lazy, Suspense } from "react";
import { useSnapshot } from "valtio";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { appSettings } from "@/store/1-ui-settings";
import { type Scrap } from "./9-types-scraps";

const ScrapSourceEditor = lazy(() => import("./2-2-dlg-scrap-source-preview-editor"));

/** SVG markup of one scrap, highlighted like the source panel. A long source scrolls inside the editor. */
export function ScrapSourceDialog({ scrap, onClose }: { scrap: Scrap; onClose: () => void; }) {
    const fontSize = useSnapshot(appSettings).monaco.fontSize;
    const lines = scrap.svg.split("\n").length;

    return (
        <Dialog open onOpenChange={(open) => { !open && onClose(); }}>
            <DialogContent className="p-0! w-[min(40rem,calc(100vw-2rem))]! max-w-none! text-xs gap-0!">
                <DialogHeader className="px-4 py-3 text-left border-b gap-1">
                    <DialogTitle className="text-sm">
                        {scrap.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Scrap source
                    </DialogDescription>
                </DialogHeader>

                <div style={{ height: `min(${lines * Math.round(fontSize * 1.6) + 20}px, 24rem, calc(100dvh - 10rem))` }}>
                    <Suspense fallback={<div className="p-3 text-xs text-muted-foreground">Loading source...</div>}>
                        <ScrapSourceEditor svg={scrap.svg} />
                    </Suspense>
                </div>
            </DialogContent>
        </Dialog>
    );
}
