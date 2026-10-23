import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { cn } from "@/utils/classnames";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { IconRadix_ChevronDown } from "@/ui/icons/normal/radix-icons/07-chevron-down";
import { IconRadix_Cross1 } from "@/ui/icons/normal/radix-icons/11-cross-1";
export type ComboFieldProps = {
    label?: string;
    /** Committed text. The draft follows it whenever it changes from outside (undo, canvas selection, a valid commit). */
    value: string;
    placeholder?: string;
    /** History entries, newest first. Picking one calls `onCommit` with it. */
    items: readonly string[];
    /** Called on every edit, before commit */
    onChange?: (text: string) => void;
    /** Called on Enter, on blur, and when a history item is picked. Return `false` if the text is invalid:
     *  the field keeps the text and stays in the error state until Escape or a successful commit. */
    onCommit: (text: string) => boolean;
    onRemoveItem: (item: string) => void;
    /** Called on Escape while in the error state. The draft is already reset to `value`; use this to restore something else. */
    onEscape?: () => void;
    className?: string;
};

/**
 * Text input with a history drop-down on the right (MRU list).
 * Each history row shows an X on hover that removes that entry.
 * Stateless about the list itself: the owner supplies `items` and handles `onCommit` / `onRemoveItem`.
 */
export function ComboField({ label, value, placeholder, items, onChange, onCommit, onRemoveItem, onEscape, className }: ComboFieldProps) {
    const [draft, setDraft] = useState(value);
    const [invalid, setInvalid] = useState(false);
    const [prevValue, setPrevValue] = useState(value);
    const [menuOpen, setMenuOpen] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const skipCommit = useRef(false);    // Set while Escape blurs the input, so the blur doesn't commit the discarded draft
    const escapeByMenu = useRef(false);  // Set when Escape closed the history menu, so the input doesn't also handle it

    // Adjust state during render when `value` changes from outside (React's recommended pattern, no effect needed)
    if (value !== prevValue) {
        setPrevValue(value);
        setDraft(value);
        setInvalid(false);
    }

    function commit(text: string) {
        setInvalid(!onCommit(text));
    }

    function pick(item: string) {
        setMenuOpen(false);
        setDraft(item);
        commit(item);
    }

    function onBlur(e: FocusEvent<HTMLInputElement>) {
        if (!skipCommit.current) {
            commit(e.currentTarget.value);
        }
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.currentTarget.blur(); // Commits in onBlur
        }
        else if (e.key === 'Escape') {
            if (escapeByMenu.current) {
                return;
            }
            const wasInvalid = invalid;
            setDraft(value);
            setInvalid(false);
            skipCommit.current = true;
            e.currentTarget.blur();
            skipCommit.current = false;
            if (wasInvalid) {
                onEscape?.();
            }
        }
    }

    return (
        <Popover open={menuOpen && items.length > 0} onOpenChange={setMenuOpen}>
            <PopoverAnchor asChild>
                <div
                    className={cn(
                        "flex items-center gap-1 px-1.5 h-5.5 min-w-0 text-xs bg-muted/60 rounded",
                        invalid ? "ring-1 ring-red-500" : "focus-within:ring-1 focus-within:ring-(--editor-accent)",
                        className,
                    )}
                >
                    {label && (
                        <span className="shrink-0 select-none text-[10px] text-muted-foreground">
                            {label}
                        </span>
                    )}

                    <input
                        className={cn("w-full min-w-0 tabular-nums bg-transparent outline-none font-condensed", invalid && "text-red-500")}
                        value={draft}
                        placeholder={placeholder}
                        aria-invalid={invalid}
                        onChange={(e) => {
                            setDraft(e.currentTarget.value);
                            onChange?.(e.currentTarget.value);
                        }}
                        onBlur={onBlur}
                        onKeyDown={onKeyDown}
                    />

                    <span className="self-stretch shrink-0 w-px bg-border" aria-hidden />

                    <PopoverTrigger asChild>
                        <button
                            ref={buttonRef}
                            type="button"
                            aria-label="Show history"
                            disabled={items.length === 0}
                            className="shrink-0 grid place-items-center size-4 rounded text-foreground hover:bg-foreground/10 disabled:opacity-40 disabled:pointer-events-none"
                        >
                            <IconRadix_ChevronDown className="size-3" />
                        </button>
                    </PopoverTrigger>
                </div>
            </PopoverAnchor>

            <PopoverContent
                align="start"
                sideOffset={4}
                className="p-1 gap-0 w-(--radix-popper-anchor-width) max-h-60 overflow-auto"
                onOpenAutoFocus={(e) => e.preventDefault()} // Keep focus in the input
                onEscapeKeyDown={() => {
                    escapeByMenu.current = true;
                    setTimeout(() => { escapeByMenu.current = false; }, 0);
                }}
                onPointerDownOutside={(e) => {
                    // The trigger toggles the menu itself; don't let the outside click close it first and then reopen it
                    if (buttonRef.current?.contains(e.target as Node)) {
                        e.preventDefault();
                    }
                }}
            >
                <motion.ul
                    className="flex flex-col"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                >
                    {items.map((item) => (
                        <li key={item} className="group flex items-center gap-1 rounded hover:bg-muted">
                            <button
                                type="button"
                                className="flex-1 min-w-0 px-1.5 py-1 text-left font-condensed tabular-nums truncate"
                                onClick={() => pick(item)}
                            >
                                {item}
                            </button>

                            <button
                                type="button"
                                aria-label={`Remove ${item}`}
                                className="shrink-0 mr-1 grid place-items-center size-4 rounded text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-foreground/10"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveItem(item);
                                }}
                            >
                                <IconRadix_Cross1 className="size-2.5" />
                            </button>
                        </li>
                    ))}
                </motion.ul>
            </PopoverContent>
        </Popover>
    );
}
