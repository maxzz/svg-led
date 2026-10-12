import { appStore } from "../0-app-store";
import { installAutosave } from "./1-autosave";
import { installKeyboard } from "./2-keyboard";
import { installClipboard } from "./3-clipboard";
import { installCodeSync } from "./4-code-sync";
import { installStyleFromSelection } from "./5-style-from-selection";

export { applyCodeToCanvas, reloadCodeFromCanvas, setCodeSync } from "./4-code-sync";

/** Wires everything that runs outside React; called once from main.tsx */
export function installControllers(): void {
    installAutosave();
    installKeyboard(appStore);
    installClipboard(appStore);
    installCodeSync(appStore);
    installStyleFromSelection(appStore);
}
