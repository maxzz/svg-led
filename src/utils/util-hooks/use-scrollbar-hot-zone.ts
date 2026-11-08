import { type RefObject, useEffect } from "react";

/**
 * Adds the `scrollbar-hot` class to the element only while the pointer is over its vertical scrollbar strip.
 * CSS `:hover` can't do this because it fires for the whole scroll container, so pointer position is checked instead.
 */
export function useScrollbarHotZone<T extends HTMLElement>(ref: RefObject<T | null>): void {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onPointerMove = (e: PointerEvent) => {
            const rect = el.getBoundingClientRect();
            const barLeft = rect.left + el.clientLeft + el.clientWidth; // left edge of the vertical scrollbar
            const hasBar = el.offsetWidth - el.clientWidth > 0;
            el.classList.toggle("scrollbar-hot", hasBar && e.clientX >= barLeft);
        };

        const onPointerLeave = () => el.classList.remove("scrollbar-hot");

        el.addEventListener("pointermove", onPointerMove);
        el.addEventListener("pointerleave", onPointerLeave);
        return () => {
            el.removeEventListener("pointermove", onPointerMove);
            el.removeEventListener("pointerleave", onPointerLeave);
            el.classList.remove("scrollbar-hot");
        };
    }, [ref]);
}
