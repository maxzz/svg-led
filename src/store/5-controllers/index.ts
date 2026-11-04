import { appStore } from "../0-app-store";
import { installAutosave } from "./1-autosave";
import { installKeyboard } from "./2-keyboard";
import { installClipboard } from "./3-clipboard";
import { installCodeSync } from "./4-code-sync";
import { installToolSpring } from "@/tools/3-core-points-prev-tool-spring";
export { applyCodeToCanvas, reloadCodeFromCanvas, setCodeSync } from "./4-code-sync";

/** Wires everything that runs outside React; called once from main.tsx */
export function installControllers(): void {
    installAutosave();
    installKeyboard(appStore);
    installToolSpring(appStore);
    installClipboard(appStore);
    installCodeSync(appStore);
}
