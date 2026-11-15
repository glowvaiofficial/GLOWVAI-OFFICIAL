// Unsaved-change guard rules. Pure, so they can be tested; the component wires them to the browser.
export const UNSAVED_MESSAGE = "You have unsaved stock changes. Leave this page and lose them?";

/** True when leaving should ask first: something changed and no save is running. */
export const shouldWarnOnLeave = (changed: number, saving: boolean): boolean => changed > 0 && !saving;

/** Save is allowed only when at least one row changed and no save is in flight. */
export const canSave = (changed: number, saving: boolean): boolean => changed > 0 && !saving;
