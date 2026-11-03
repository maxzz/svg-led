import { atom } from "jotai";
import { toast } from "sonner";
import { appSettings } from "@/store/1-ui-settings";
import { getNodeProxy } from "@/store/3-document";
import { selectionAtom, setSelectionAtom } from "@/store/4-editor";
import { applyOffsetPaths } from "./2-apply-offset";

/** Dialog visibility. The paths it edits are frozen in `offsetPathTargetIdsAtom` when it opens. */
export const isOpenOffsetPathDialogAtom = atom(false);

/** Selected path ids the dialog offsets. Later selection changes do not retarget it. */
export const offsetPathTargetIdsAtom = atom<string[]>([]);

/** Offset field slider. Open while that field is the one being edited. */
export const offsetSliderOpenAtom = atom(false);

/**
 * Distance typed into the field before Enter or blur commits it.
 * The field keeps the committed number as its key, so typing does not remount it.
 * Preview reads this until the value is committed.
 */
export const offsetLiveAtom = atom<number | null>(null);

export const openOffsetPathDialogAtom = atom(null, (get, set) => {
    const ids = get(selectionAtom).filter((id) => getNodeProxy(id)?.kind === 'path');
    if (!ids.length) {
        return;
    }
    set(offsetLiveAtom, null);
    set(offsetSliderOpenAtom, true);
    set(offsetPathTargetIdsAtom, ids);
    set(isOpenOffsetPathDialogAtom, true);
});

/** `ok` creates the offset paths. Either way the dialog closes and the field values stay in settings. */
export const closeOffsetPathDialogAtom = atom(null, (get, set, ok: boolean) => {
    if (!get(isOpenOffsetPathDialogAtom)) {
        return;
    }
    const ids = get(offsetPathTargetIdsAtom);
    const live = get(offsetLiveAtom);
    if (ok && live !== null && Number.isFinite(live)) {
        appSettings.dlgOffsetPath.offset = live;
    }
    const saved = appSettings.dlgOffsetPath;
    const options = { offset: saved.offset, joins: saved.joins, miterLimit: saved.miterLimit };

    set(offsetLiveAtom, null);
    set(offsetSliderOpenAtom, false);
    set(offsetPathTargetIdsAtom, []);
    set(isOpenOffsetPathDialogAtom, false);

    if (!ok) {
        return;
    }
    const created = applyOffsetPaths(ids, options);
    if (created.length) {
        set(setSelectionAtom, created);
    } else {
        toast.info('The offset left no geometry');
    }
});
