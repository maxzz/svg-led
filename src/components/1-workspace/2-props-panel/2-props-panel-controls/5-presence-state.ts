/** Presence of a property: checked (written to the file), unchecked (left out), or mixed across the selection */
export type PresenceState = boolean | 'indeterminate';

/** Checked when every state is checked, unchecked when every state is unchecked (or there are none), otherwise mixed */
export function combinePresence(states: readonly PresenceState[]): PresenceState {
    if (states.every((s) => s === false)) {
        return false;
    }
    if (states.every((s) => s === true)) {
        return true;
    }
    return 'indeterminate';
}
