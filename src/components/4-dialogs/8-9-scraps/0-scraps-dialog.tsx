import { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Button } from "@/ui/shadcn/button";
import { type Scrap, isOpenScrapsDialogAtom, scrapsAtom } from "./9-types-scraps";
import { LoadSection } from "./1-0-load-section";
import { SaveSection } from "./2-0-save-section";

export function ScrapsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenScrapsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent
                className="p-0! w-[min(30rem,calc(100vw-2rem))]! max-w-none! text-xs gap-0!"
                onEscapeKeyDown={(e) => {
                    const target = e.target;
                    // Esc leaves the name field; the next Esc closes the dialog
                    if (target instanceof HTMLInputElement && target.dataset.scrapRename !== undefined) {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader className="px-4 py-3 text-left border-b gap-1">
                    <DialogTitle className="text-sm">
                        Scraps
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Save canvas elements to browser storage and bring them back later.
                    </DialogDescription>
                </DialogHeader>

                {isOpen && <Body />}

                <DialogFooter className="m-0 px-4 py-3">
                    <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Mounted while the dialog is open, so the drafts start fresh every time */
function Body() {
    const scraps = useAtomValue(scrapsAtom);
    const [selectedName, setSelectedName] = useState<string | null>(scraps[0]?.name ?? null);
    const [nameDraft, setNameDraft] = useState(() => nextScrapName(scraps));
    // Set before the renamed scrap lands in the list, so the selection does not jump to the first row
    const pendingSelection = useRef<string | null>(null);

    function selectScrap(name: string) {
        pendingSelection.current = null;
        setSelectedName(name);
        setNameDraft(name);
    }

    function noteRename(from: string, to: string) {
        if (selectedName === from) {
            pendingSelection.current = to;
            setSelectedName(to);
        }
        setNameDraft((draft) => draft.trim() === from ? to : draft);
    }

    return (
        <div className="px-4 py-3 flex flex-col gap-4">
            <LoadSection selectedName={selectedName} setSelectedName={setSelectedName} selectScrap={selectScrap} noteRename={noteRename} pendingSelection={pendingSelection} />
            <SaveSection nameDraft={nameDraft} setNameDraft={setNameDraft} />
        </div>
    );
}

function nextScrapName(scraps: readonly Scrap[]): string {
    const names = new Set(scraps.map((s) => s.name));
    let n = scraps.length + 1;
    while (names.has(`Scrap ${n}`)) {
        n++;
    }
    return `Scrap ${n}`;
}
