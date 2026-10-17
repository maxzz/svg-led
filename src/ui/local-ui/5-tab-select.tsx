import { type KeyboardEvent, type ReactNode, useId, useRef } from "react"; // 10.17.26
import { LayoutGroup, motion } from "motion/react";
import { cn } from "@/utils/classnames";

export type TabSelectItem<T extends string> = {
    value: T;
    label: ReactNode;
    disabled?: boolean;
};

const highlightTransition = { type: "spring", bounce: 0.2, visualDuration: 0.3 } as const;

/** Selectable tabs. The active item's background slides to the next selection. */
export function TabSelect<T extends string>({ items, value, onValueChange, orientation = "vertical", className, itemClassName, "aria-label": ariaLabel }: {
    items: readonly TabSelectItem<T>[];
    value: T;
    onValueChange: (value: T) => void;
    orientation?: "vertical" | "horizontal";
    className?: string;
    itemClassName?: string;
    "aria-label"?: string;
}) {
    const groupId = useId();
    const itemRefs = useRef(new Map<T, HTMLButtonElement>());
    const vertical = orientation === "vertical";

    function selectAt(index: number) {
        const item = items[index];
        if (!item || item.disabled) {
            return;
        }
        onValueChange(item.value);
        itemRefs.current.get(item.value)?.focus();
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        const index = items.findIndex((item) => item.value === value);
        const nextKey = vertical ? "ArrowDown" : "ArrowRight";
        const prevKey = vertical ? "ArrowUp" : "ArrowLeft";
        let next: number | undefined;

        if (event.key === nextKey) next = stepToEnabled(items, index, 1);
        else if (event.key === prevKey) next = stepToEnabled(items, index, -1);
        else if (event.key === "Home") next = stepToEnabled(items, -1, 1);
        else if (event.key === "End") next = stepToEnabled(items, items.length, -1);
        else return;

        event.preventDefault();
        if (next != null) {
            selectAt(next);
        }
    }

    return (
        <LayoutGroup id={groupId}>
            <motion.div
                layoutScroll
                className={cn("p-2 gap-0.5 flex", vertical ? "flex-col items-stretch" : "flex-row items-center", className)}
                onKeyDown={onKeyDown}
                aria-orientation={orientation}
                aria-label={ariaLabel}
                role="tablist"
            >
                {items.map(
                    (item) => {
                        const selected = item.value === value;
                        return (
                            <button
                                ref={(node) => { if (node) itemRefs.current.set(item.value, node); else itemRefs.current.delete(item.value); }}
                                className={cn(
                                    "relative group whitespace-normal px-2.5 py-2 text-xs text-left focus-visible:outline-none rounded cursor-pointer",
                                    vertical && "w-full justify-start",
                                    selected ? "text-foreground z-10" : "text-foreground/60 hover:text-foreground",
                                    itemClassName,
                                )}
                                tabIndex={selected ? 0 : -1}
                                disabled={item.disabled}
                                onClick={() => onValueChange(item.value)}
                                key={item.value}
                                aria-selected={selected}
                                role="tab"
                                type="button"
                            >
                                {selected && (
                                    <motion.div
                                        className="absolute inset-0 bg-background shadow-sm group-focus-visible:ring-[1px] group-focus-visible:ring-ring/50 group-focus-visible:outline-1 group-focus-visible:outline-ring pointer-events-none z-0"
                                        style={{ borderRadius: "var(--radius-md)" }}
                                        layoutId={`${groupId}-highlight`}
                                        initial={false}
                                        transition={highlightTransition}
                                        aria-hidden
                                    />
                                )}

                                <span className="relative z-10">
                                    {item.label}
                                </span>
                            </button>
                        );
                    }
                )}
            </motion.div>
        </LayoutGroup>
    );
}

function stepToEnabled<T extends string>(items: readonly TabSelectItem<T>[], from: number, delta: 1 | -1): number | undefined {
    const count = items.length;
    for (let step = 1; step <= count; step++) {
        const index = (from + delta * step + count) % count;
        if (!items[index]?.disabled) {
            return index;
        }
    }
    return undefined;
}
