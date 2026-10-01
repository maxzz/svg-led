import { type ComponentProps } from "react";
import { cn } from "@/utils/classnames";

/** Floating panel over the canvas (toolbar, menus, zoom controls) */
export function Island({ className, ...rest }: ComponentProps<"div">) {
    return <div className={cn("p-1 text-foreground bg-background ring-1 ring-foreground/10 rounded-lg shadow-md flex items-center gap-0.5", className)} {...rest} />;
}

export const islandButtonClasses = "\
relative shrink-0 \
size-9 \
text-foreground/80 \
hover:bg-muted \
data-[active=true]:text-(--editor-accent) \
data-[active=true]:bg-(--editor-accent)/12 \
disabled:opacity-40 \
transition-colors \
rounded-md \
flex items-center justify-center \
cursor-pointer";
