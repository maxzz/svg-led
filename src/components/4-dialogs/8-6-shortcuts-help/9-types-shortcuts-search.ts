import { atom } from "jotai";
import { displayShortcut } from "@/commands";
import { CANVAS_ROWS, EDITOR_SECTIONS, MODIFIER_SECTIONS, type RecordedKeys, TOOL_ROWS, VIEW_SECTIONS, filterRows, filterSections, keysMatcher, nameMatcher } from "./8-shortcuts-data";

/** Text typed in name mode */
export const shortcutsQueryAtom = atom('');
/** Keys pressed in record mode */
export const shortcutsRecordedAtom = atom<RecordedKeys | null>(null);
/** Record mode: the search field captures key presses instead of text */
export const isRecordingShortcutsAtom = atom(false);
/** Height of the results area measured when the dialog opens, so filtering does not resize the dialog */
export const shortcutsResultsHeightAtom = atom<number | null>(null);

export const clearShortcutsSearchAtom = atom(
    null,
    (_get, set) => {
        set(shortcutsQueryAtom, '');
        set(shortcutsRecordedAtom, null);
    }
);

export const toggleRecordingShortcutsAtom = atom(
    null,
    (get, set) => {
        set(isRecordingShortcutsAtom, !get(isRecordingShortcutsAtom));
        set(clearShortcutsSearchAtom);
    }
);

/** Records a key press in record mode; a second Esc in a row leaves record mode and returns to the name search */
export const recordShortcutKeysAtom = atom(
    null,
    (get, set, recorded: RecordedKeys) => {
        if (recorded.text === 'Esc' && get(shortcutsRecordedAtom)?.text === 'Esc') {
            set(toggleRecordingShortcutsAtom);
            return;
        }
        set(shortcutsRecordedAtom, recorded);
    }
);

/** Called when the dialog closes, so it opens with an empty search and remeasures its height */
export const resetShortcutsHelpAtom = atom(
    null,
    (_get, set) => {
        set(clearShortcutsSearchAtom);
        set(isRecordingShortcutsAtom, false);
        set(shortcutsResultsHeightAtom, null);
    }
);

/** What the search field shows: the typed text, or the recorded keys */
export const shortcutsSearchTextAtom = atom(
    (get) => {
        if (!get(isRecordingShortcutsAtom)) {
            return get(shortcutsQueryAtom);
        }
        const recorded = get(shortcutsRecordedAtom);
        return recorded ? displayShortcut(recorded.text) : '';
    }
);

//---------------------------------------------------------------------------

const matcherAtom = atom(
    (get) => get(isRecordingShortcutsAtom) ? keysMatcher(get(shortcutsRecordedAtom)) : nameMatcher(get(shortcutsQueryAtom))
);

export const toolRowsAtom = atom((get) => filterRows(TOOL_ROWS, get(matcherAtom)));
export const viewSectionsAtom = atom((get) => filterSections(VIEW_SECTIONS, get(matcherAtom)));
export const editorSectionsAtom = atom((get) => filterSections(EDITOR_SECTIONS, get(matcherAtom)));
export const canvasRowsAtom = atom((get) => filterRows(CANVAS_ROWS, get(matcherAtom)));
export const modifierSectionsAtom = atom((get) => filterSections(MODIFIER_SECTIONS, get(matcherAtom)));

export const isLeftColumnEmptyAtom = atom(
    (get) => !get(toolRowsAtom).length && !get(viewSectionsAtom).length
);

export const isRightColumnEmptyAtom = atom(
    (get) => !get(editorSectionsAtom).length && !get(canvasRowsAtom).length && !get(modifierSectionsAtom).length
);

export const isNothingFoundAtom = atom(
    (get) => get(isLeftColumnEmptyAtom) && get(isRightColumnEmptyAtom)
);
