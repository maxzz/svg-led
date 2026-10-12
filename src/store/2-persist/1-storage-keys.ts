/**
 * All localStorage keys used by the app, in one place.
 * Bump the version of a key when its stored shape changes incompatibly.
 */
const APP_PREFIX = "svg-led";

export const STORAGE_KEYS = {
    app: `${APP_PREFIX}__app__v1`,                  // app-level preferences (valtio appSettings)
    toolbar: `${APP_PREFIX}__toolbar__v1`,          // active tool and tool lock
    doc: `${APP_PREFIX}__doc__v1`,                  // autosaved document source
    strokeWidth: `${APP_PREFIX}__stroke-width__v1`, // last stroke width picked in the properties palette
    strokeDash: `${APP_PREFIX}__stroke-dash__v1`,   // last dash style or custom dash array picked in the properties palette
} as const;

/** Options of a single tool live under their own key so the shared options object stays small */
export function toolOptionsKey(toolId: string): string {
    return `${APP_PREFIX}__tool:${toolId}__v1`;
}

/** Remembered values of a dialog (e.g. fit-to-viewBox padding) */
export function dialogOptionsKey(dialogId: string): string {
    return `${APP_PREFIX}__dlg:${dialogId}__v1`;
}
