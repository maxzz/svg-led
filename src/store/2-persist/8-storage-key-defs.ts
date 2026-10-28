/**
 * All localStorage keys used by the app, in one place.
 * Bump the version of a key when its stored shape changes incompatibly.
 */
const APP_PREFIX = "svg-led";

export const STORAGE_KEYS = {
    app: `${APP_PREFIX}__app__v1`,                  // app-level preferences (valtio appSettings)
    toolbar: `${APP_PREFIX}__toolbar__v1`,          // active tool and tool lock
    doc: `${APP_PREFIX}__doc__v1`,                  // autosaved document source
    newShape: `${APP_PREFIX}__new-shape__v1`,       // properties new shapes are created with; shared by all creation tools
    scraps: `${APP_PREFIX}__scraps__v1`,            // named sets of elements saved from the canvas (Scraps dialog)
} as const;

/** Keys the separate per-property atoms used before `newShape`. Read once to migrate their values, then removed. */
export const LEGACY_STYLE_KEYS = {
    style: `${APP_PREFIX}__style__v1`,              // colors, caps, joins and opacity
    strokeWidth: `${APP_PREFIX}__stroke-width__v1`, // stroke width
    strokeDash: `${APP_PREFIX}__stroke-dash__v1`,   // dash style and custom dash array
    cornerRadius: `${APP_PREFIX}__corner-radius__v1`, // rectangle corner radius
} as const;

/** Options of a single tool live under their own key so the shared options object stays small */
export function toolOptionsKey(toolId: string): string {
    return `${APP_PREFIX}__tool:${toolId}__v1`;
}

/** Remembered values of a dialog (e.g. fit-to-viewBox padding) */
export function dialogOptionsKey(dialogId: string): string {
    return `${APP_PREFIX}__dlg:${dialogId}__v1`;
}
