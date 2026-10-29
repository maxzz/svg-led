import { atom } from "jotai";

/** Kept apart from the search atoms: @/commands imports this file, and the search atoms import @/commands */
export const isOpenShortcutsHelpDialogAtom = atom(false);
