import { ConfirmationDialog } from "@/components/4-dialogs/8-1-confirmation/0-confirmation-dialog";
import { OptionsDialog } from "@/components/4-dialogs/8-3-options/0-options-dialog";
import { FitViewBoxDialog } from "@/components/4-dialogs/8-4-fit-viewbox/0-fit-viewbox-dialog";
import { ViewBoxSettingsDialog } from "@/components/4-dialogs/8-5-viewbox-settings/0-viewbox-settings-dialog";
import { ShortcutsHelpDialog } from "@/components/4-dialogs/8-6-shortcuts-help/0-shortcuts-help-dialog";
import { CommandPalette } from "@/components/4-dialogs/8-7-command-palette/0-command-palette";
import { FindOnCanvasDialog } from "@/components/4-dialogs/8-8-find-on-canvas/0-find-on-canvas";
import { ScrapsDialog } from "@/components/4-dialogs/8-9-scraps/0-scraps-dialog";

export function AllDialogs() {
    return (<>
        <ConfirmationDialog />
        <OptionsDialog />
        <FitViewBoxDialog />
        <ViewBoxSettingsDialog />
        <ShortcutsHelpDialog />
        <CommandPalette />
        <FindOnCanvasDialog />
        <ScrapsDialog />
    </>);
}
