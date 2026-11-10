import { appStore } from "../0-app-store";
import { installAutosaveController } from "./1-autosave";
import { installKeyboardController } from "./2-keyboard";
import { installClipboardController } from "./3-clipboard";
import { installCodeSync } from "./4-monaco-code-sync";
import { installToolSpringController } from "@/tools/3-core-points-prev-tool-spring";

export { applyCodeToCanvas, reloadCodeFromCanvas, setCodeSync } from "./4-monaco-code-sync";

/** Wires everything that runs outside React; called once from main.tsx */
export function installControllers(): void {
    installAutosaveController();
    installKeyboardController(appStore);
    installToolSpringController(appStore);
    installClipboardController(appStore);
    installCodeSync(appStore);
}
