import { type ReactNode } from "react";
import { cn } from "@/utils/classnames";

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string; }) {
    return (
        <section className={cn("flex flex-col gap-1.5", className)}>
            <h3 className="select-none text-[11px] text-muted-foreground">
                {title}
            </h3>
            
            {children}
        </section>
    );
}

export type SegmentOption<T extends string | number> = { value: T; label: ReactNode; title?: string; };

/** Row of option buttons; value may be undefined (nothing active) for mixed selections */
export function Segmented<T extends string | number>({ options, value, onChange }: { options: readonly SegmentOption<T>[]; value: T | undefined; onChange: (value: T) => void; }) {
    return (
        <div className="flex flex-wrap items-center gap-1">
            {options.map(
                (o) => (
                    <button className={optionButtonClasses} data-active={o.value === value} title={o.title} onClick={() => onChange(o.value)} type="button" key={String(o.value)}>
                        {o.label}
                    </button>
                )
            )}
        </div>
    );
}

export const optionButtonClasses = "\
shrink-0 \
min-w-7 h-7 px-1.5 \
text-xs \
text-foreground/80 \
bg-muted/60 \
hover:bg-muted \
data-[active=true]:text-(--editor-accent) \
data-[active=true]:bg-(--editor-accent)/12 \
data-[active=true]:ring-1 \
data-[active=true]:ring-(--editor-accent)/40 \
disabled:opacity-40 \
rounded-md \
flex items-center justify-center \
cursor-pointer";
