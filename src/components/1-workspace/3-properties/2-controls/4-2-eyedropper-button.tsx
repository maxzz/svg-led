import { IconColorPicker } from "@/ui/icons/normal/editor-manual-fields";

type EyeDropperApi = { open: () => Promise<{ sRGBHex: string; }>; };

/** Samples a color from anywhere on screen. Escape cancels. */
export function EyeDropperButton({ onPick }: { onPick: (hex: string) => void; }) {
    
    const EyeDropper = (window as unknown as { EyeDropper: new () => EyeDropperApi; }).EyeDropper;

    async function pick() {
        try {
            onPick((await new EyeDropper().open()).sRGBHex);
        } catch {
            // cancelled
        }
    }

    return (
        <button className="shrink-0 size-7 bg-muted/60 hover:bg-muted rounded-md flex items-center justify-center cursor-pointer" title="Pick a color from the screen" type="button" onClick={pick}>
            <IconColorPicker className="size-4" />
        </button>
    );
}

/** Chromium's EyeDropper API. Other browsers don't have it, so the button is hidden there. */
export function hasEyeDropper(): boolean {
    return 'EyeDropper' in window;
}
