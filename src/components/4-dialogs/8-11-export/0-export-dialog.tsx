import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Copy, Download } from "lucide-react";
import { Button } from "@/ui/shadcn/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { doCopyExportAtom, doDownloadExportAtom, exportResultAtom, isOpenExportDialogAtom } from "./9-atoms-export";
import { ExportSettings } from "./1-export-settings";
import { ExportPreview } from "./3-export-preview";

/** One dialog for every export target: pick a format, check the preview, then download it or copy it to the clipboard */
export function ExportDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenExportDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! w-[min(56rem,calc(100vw-2rem))]! max-w-none! h-[min(36rem,calc(100vh-4rem))] text-xs overflow-hidden flex flex-col gap-0!">
                <DialogHeader className="px-4 py-3 text-left border-b gap-1">
                    <DialogTitle className="text-sm">
                        Export
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Choose a format, check the preview, then download the file or copy it to the clipboard.
                    </DialogDescription>
                </DialogHeader>

                {isOpen && (
                    <div className="min-h-0 overflow-hidden flex flex-1">
                        <ExportSettings />
                        <ExportPreview />
                    </div>
                )}

                <DialogFooter className="m-0 px-4 py-3 border-t">
                    <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                        Close
                    </Button>
                    {isOpen && <ActionButtons />}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ActionButtons() {
    const ready = useAtomValue(exportResultAtom)?.ok === true;
    const doDownload = useSetAtom(doDownloadExportAtom);
    const doCopy = useSetAtom(doCopyExportAtom);

    return (<>
        <Button variant="outline" size="sm" disabled={!ready} onClick={() => doDownload()}>
            <Download className="size-3.5" />
            Download
        </Button>
        <Button size="sm" disabled={!ready} onClick={() => doCopy()}>
            <Copy className="size-3.5" />
            Copy
        </Button>
    </>);
}
