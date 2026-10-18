import { atom } from "jotai";
import { viewportAtom } from "@/store/4-editor";

export const zoomPercentAtom = atom(
    (get) => `${Math.round(get(viewportAtom).zoom * 100)}%`
);
