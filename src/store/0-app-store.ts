import { getDefaultStore } from "jotai";

/**
 * The single Jotai store of the app. It is handed to <Provider> in main.tsx and used by
 * module-level controllers (keyboard, code sync, autosave) that live outside React.
 * It is the default store, so code that calls getDefaultStore() sees the same atoms.
 */
export const appStore = getDefaultStore();

export type AppStore = typeof appStore;
