import { jotaiStore } from "../0-app-store";
import { installAutosaveController } from "./1-autosave";
import { installKeyboardController } from "./2-keyboard";
import { installClipboardController } from "./3-clipboard";
import { installCodeSyncController } from "./4-monaco-code-sync";
import { installToolSpringController } from "@/tools/3-core-points-prev-tool-spring";

export { applyCodeToCanvas, reloadCodeFromCanvas, setCodeSync } from "./4-monaco-code-sync";

/** Wires everything that runs outside React; called once from main.tsx */
export function installControllers(): void {
    installAutosaveController();
    installKeyboardController(jotaiStore);
    installToolSpringController(jotaiStore);
    installClipboardController(jotaiStore);
    installCodeSyncController(jotaiStore);
}
