import { atom } from "jotai";
import { runCommandAtom } from "@/commands";

export const isOpenCommandPaletteAtom = atom(false);

/** Closes the palette first so a command that opens another dialog gets focus */
export const runPaletteCommandAtom = atom(
    null,
    (_get, set, id: string) => {
        set(isOpenCommandPaletteAtom, false);
        setTimeout(() => set(runCommandAtom, id), 0);
    }
);
