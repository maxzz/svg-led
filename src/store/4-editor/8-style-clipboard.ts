import { atom } from "jotai";
import { type StyleSnapshot } from "../3-document";

/** Style copied by "Copy style" and applied by "Paste style"; null until something was copied */
export const copiedStyleAtom = atom<StyleSnapshot | null>(null);
