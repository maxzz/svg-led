import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { HintText } from "@/components/1-workspace/3-3-hint-panel/1-hint-text";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { isOpenShortcutsHelpDialogAtom } from "./9-types-shortcuts-help";
import { resetShortcutsHelpAtom } from "./9-types-shortcuts-search";
import { ShortcutsSearchInput, keepOpenWhileRecording } from "./1-search-input";
import { ShortcutsSearchResults } from "./2-search-results";

export function ShortcutsHelpDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenShortcutsHelpDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! w-[min(64rem,calc(100vw-2rem))]! max-w-5xl gap-0!" withScroll onEscapeKeyDown={keepOpenWhileRecording}>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Help and keyboard shortcuts
                    </DialogTitle>
                    <DialogDescription className="text-xs sr-only">
                        <HintText text="[Space]+drag or the middle mouse button pans · Wheel zooms · [Shift]+wheel scrolls sideways · Double-click a group to enter isolation mode" />
                    </DialogDescription>
                </DialogHeader>

                {isOpen && <ShortcutsHelpBody />}
            </DialogContent>
        </Dialog>
    );
}

// * Click to select, Shift+click to add, drag to move (Alt+drag copies), double-click a group to enter isolation mode, Ctrl+click to select inside a group
// * Space+drag or the middle mouse button pans; the wheel zooms, Shift+wheel scrolls sideways.

/** Mounted only while the dialog is open; resets the search on close, so the dialog always opens with the full list */
function ShortcutsHelpBody() {
    const reset = useSetAtom(resetShortcutsHelpAtom);
    useEffect(() => reset, [reset]);

    return (<>
        <ShortcutsSearchInput />
        <ShortcutsSearchResults />
    </>);
}
