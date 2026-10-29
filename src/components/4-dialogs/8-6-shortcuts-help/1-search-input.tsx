import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { KeyboardIcon, XIcon } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { cn } from "@/utils/classnames";
import { recordKeys } from "./8-shortcuts-data";
import { clearShortcutsSearchAtom, isRecordingShortcutsAtom, recordShortcutKeysAtom, shortcutsQueryAtom, shortcutsSearchTextAtom, toggleRecordingShortcutsAtom } from "./9-types-shortcuts-search";

export function ShortcutsSearchInput() {
    return (
        <div className="px-4 py-2 border-b">
            <InputGroup className="rounded-sm">
                <SearchField />
                <InputGroupAddon align="inline-end">
                    <ClearButton />
                    <RecordKeysButton />
                </InputGroupAddon>
            </InputGroup>
        </div>
    );
}

function SearchField() {
    const isRecording = useAtomValue(isRecordingShortcutsAtom);
    const searchText = useAtomValue(shortcutsSearchTextAtom);
    const setQuery = useSetAtom(shortcutsQueryAtom);
    const recordShortcutKeys = useSetAtom(recordShortcutKeysAtom);
    const toggleRecording = useSetAtom(toggleRecordingShortcutsAtom);

    function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyK') {
            e.preventDefault();
            toggleRecording();
            return;
        }
        if (!isRecording || e.key === 'Tab') {
            return;
        }
        e.preventDefault();
        if (!e.repeat) { // a held Esc must not count as the second press
            recordShortcutKeys(recordKeys(e));
        }
    }

    return (
        <InputGroupInput
            value={searchText}
            onChange={(e) => !isRecording && setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={isRecording}
            data-recording={isRecording || undefined}
            placeholder={isRecording ? "Press a key combination, e.g. Shift+1 (Esc twice returns to name search)" : "Search by command name, e.g. 'zoom', or type keys, e.g. 'Ctrl+Z'"}
            aria-label={isRecording ? "Press a key combination to search" : "Search commands by name"}
            autoFocus
        />
    );
}

function ClearButton() {
    const searchText = useAtomValue(shortcutsSearchTextAtom);
    const clear = useSetAtom(clearShortcutsSearchAtom);

    if (!searchText) {
        return null;
    }

    return (
        <InputGroupButton size="icon-xs" title="Clear" aria-label="Clear" onClick={(e) => { clear(); focusSearchField(e); }}>
            <XIcon />
        </InputGroupButton>
    );
}

function RecordKeysButton() {
    const isRecording = useAtomValue(isRecordingShortcutsAtom);
    const toggleRecording = useSetAtom(toggleRecordingShortcutsAtom);

    return (
        <InputGroupButton
            size="icon-xs"
            className={cn(isRecording && "text-primary bg-primary/10")}
            title="Record keys (Alt+K): search by pressing a key combination"
            aria-label="Record keys"
            aria-pressed={isRecording}
            onClick={(e) => { toggleRecording(); focusSearchField(e); }}
        >
            <KeyboardIcon />
        </InputGroupButton>
    );
}

/** The buttons take focus when clicked; give it back to the field so typing or recording continues there */
function focusSearchField(e: MouseEvent<HTMLElement>) {
    e.currentTarget.closest('[data-slot="input-group"]')?.querySelector('input')?.focus();
}

/** In record mode Esc is a key to search for, so it must not close the dialog */
export function keepOpenWhileRecording(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.dataset?.recording) {
        e.preventDefault();
    }
}
