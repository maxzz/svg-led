import { type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
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

/** Section whose body slides open and closed like an accordion item; the caller owns the open state */
export function CollapsibleSection({ title, open, onOpenChange, children }: { title: string; open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode; }) {
    return (
        <section className="flex flex-col gap-1.5">
            <h3 className="text-[11px]">
                <button className="select-none w-full text-left text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer" type="button" aria-expanded={open} onClick={() => onOpenChange(!open)}>
                    <ChevronRight className={cn("shrink-0 size-3 transition-transform duration-200", open && "rotate-90")} />
                    {title}
                </button>
            </h3>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        className="overflow-hidden flex flex-col gap-1.5"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

export type SegmentOption<T extends string | number> = { value: T; label: ReactNode; title?: string; };

/** Row of option buttons; value may be undefined (nothing active) for mixed selections */
export function Segmented<T extends string | number>({ options, value, onChange, className, buttonClassName }: {
    options: readonly SegmentOption<T>[]; value: T | undefined;
    onChange: (value: T) => void;
    className?: string;
    buttonClassName?: string;
}) {
    return (
        <div className={cn("flex flex-wrap items-center gap-1", className)}>
            {options.map(
                (o) => (
                    <button className={cn(optionButtonClasses, buttonClassName)} data-active={o.value === value} title={o.title} onClick={() => onChange(o.value)} type="button" key={String(o.value)}>
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
\
data-[active=true]:ring-1 \
data-[active=true]:text-(--editor-accent) \
data-[active=true]:bg-(--editor-accent)/12 \
data-[active=true]:ring-(--editor-accent)/40 \
\
disabled:opacity-40 \
rounded-md \
flex items-center justify-center \
cursor-pointer";

/** Container for a Segmented row that reads as one control: a single outlined box with dividers between the options */
export const segmentGroupClasses = "gap-0 rounded-md ring-1 ring-foreground/15 overflow-hidden";

/** Button classes for a Segmented row shown as one control: square corners, divider on the right of each option */
export const segmentButtonClasses = "\
px-1 \
rounded-none \
first:rounded-l-md \
last:rounded-r-md \
border-r \
border-foreground/15 \
last:border-r-0 \
\
data-[active=true]:ring-inset \
\
focus-visible:outline-none \
focus-visible:ring-1 \
focus-visible:ring-inset \
focus-visible:ring-(--editor-accent)";
