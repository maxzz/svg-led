import { type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/utils/classnames";
import { PresenceRow } from "./5-presence-controls";

/** Section of the Properties popup. `check` goes in its left column, beside the title; the body is indented past that column. */
export function Section({ title, check, children, className }: { title: string; check?: ReactNode; children: ReactNode; className?: string; }) {
    return (
        <section className={cn("flex flex-col gap-1.5", className)}>
            <PresenceRow check={check}>
                <h3 className="select-none text-[11px] text-muted-foreground">
                    {title}
                </h3>
            </PresenceRow>

            <div className="pl-4 flex flex-col gap-1.5">
                {children}
            </div>
        </section>
    );
}

/**
 * Section whose body slides open and closed like an accordion item; the caller owns the open state.
 * With `gutter`, the title sits after the left column that holds `check`, and the body is laid out by the caller.
 * `chevronBefore` puts the chevron before the title; by default it sits after the title.
 */
export function CollapsibleSection({ title, open, onOpenChange, check, gutter = false, chevronBefore, children }: {
    title: string; open: boolean; onOpenChange: (open: boolean) => void; check?: ReactNode; gutter?: boolean; chevronBefore?: boolean; children: ReactNode;
}) {
    const chevronIcon = (
        <ChevronRight className={cn("shrink-0 size-3 transition-transform duration-200", open && "rotate-90")} />
    );

    const heading = (
        <h3 className="text-[11px]">
            <button className="select-none w-full text-left text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer" type="button" aria-expanded={open} onClick={() => onOpenChange(!open)}>
                {chevronBefore && chevronIcon}
                {title}
                {!chevronBefore && chevronIcon}
            </button>
        </h3>
    );

    return (
        <section className="flex flex-col gap-1.5">
            {gutter ? <PresenceRow check={check}>{heading}</PresenceRow> : heading}

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
export const segmentGroupClasses = "gap-0 rounded-md border border-foreground/15";

/** Button classes for a Segmented row shown as one control: square corners, divider on the right of each option */
export const segmentButtonClasses = "\
px-1 \
rounded-none \
first:rounded-l-[7px] \
last:rounded-r-[7px] \
border-r \
border-foreground/15 \
last:border-r-0 \
\
data-[active=true]:relative \
data-[active=true]:z-10 \
data-[active=true]:border-r-0 \
\
focus-visible:relative \
focus-visible:z-10 \
focus-visible:outline-none \
focus-visible:ring-1 \
focus-visible:ring-(--editor-accent)";
