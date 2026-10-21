import { type ReactNode } from "react";
import { cn } from "@/utils/classnames";

/** A key drawn as a keycap, used by the hint line and the shortcut help */
export function KeyText({ children, className }: { children: ReactNode; className?: string; }) {
    return <kbd className={cn("shrink-0 px-1 py-px font-mono text-[10px] leading-4 bg-muted border border-foreground/20 rounded", className)}>{children}</kbd>;
}
