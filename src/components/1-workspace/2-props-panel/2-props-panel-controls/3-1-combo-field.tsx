import { type FocusEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/classnames";
import { motion } from "motion/react";
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
 * When the history is empty the drop-down shows a single "empty" row that just closes it.
 * Stateless about the list itself: the owner supplies `items` and handles `onCommit` / `onRemoveItem`.
 */
export function ComboField({ label, value, placeholder, items, onChange, onCommit, onRemoveItem, onEscape, className }: ComboFieldProps) {
    const [draft, setDraft] = useState(value);
    const [invalid, setInvalid] = useState(false);
    const [prevValue, setPrevValue] = useState(value);
    const [menuOpen, setMenuOpen] = useState(false);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const focusInputOnClose = useRef(false); // Set when Escape closes the menu: focus goes back to the input, not the button
    const skipCommit = useRef(false);    // Set while Escape blurs the input, so the blur doesn't commit the discarded draft

    // While the history menu is open, Escape only closes it. The listener runs in the capture phase on window,
    // so the event stops there and never reaches the input, the global shortcuts (which would clear the selection
    // and hide the Properties popup), or other handlers.
    useEffect(
        () => {
            if (!menuOpen) {
                return;
            }
            function onEscapeCapture(e: globalThis.KeyboardEvent) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    focusInputOnClose.current = true;
                    setMenuOpen(false);
                }
            }
            const abortController = new AbortController();
            window.addEventListener('keydown', onEscapeCapture, { capture: true, signal: abortController.signal });
            return () => abortController.abort();
        },
        [menuOpen]);

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
        <div className={cn("flex items-center gap-1.5 min-w-0 text-xs", className)}>
            {label && (
                <span className="shrink-0 select-none text-[10px] text-muted-foreground">
                    {label}
                </span>
            )}

            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                <PopoverAnchor asChild>
                    <div
                        className={cn(
                            "flex flex-1 items-stretch h-5.5 min-w-0 text-xs bg-muted/60 rounded overflow-hidden",
                            invalid ? "ring-1 ring-red-500" : "focus-within:ring-1 focus-within:ring-(--editor-accent)",
                        )}
                    >
                        <div className="flex flex-1 items-center pl-1.5 min-w-0">
                            <input
                                ref={inputRef}
                                className={cn("w-full min-w-0 tabular-nums bg-transparent outline-none", invalid && "text-red-500")}
                                value={draft}
                                onChange={(e) => {
                                    setDraft(e.currentTarget.value);
                                    onChange?.(e.currentTarget.value);
                                }}
                                onBlur={onBlur}
                                onKeyDown={onKeyDown}
                                placeholder={placeholder}
                                aria-invalid={invalid}
                            />
                        </div>

                        <span className="w-px shrink-0 bg-border" aria-hidden />

                        <PopoverTrigger asChild>
                            <button
                                ref={buttonRef}
                                type="button"
                                aria-label="Show history"
                                className="w-6 shrink-0 grid place-items-center text-foreground hover:bg-foreground/10"
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
                    onCloseAutoFocus={(e) => {
                        // Radix would send focus back to the trigger button; only Escape moves it to the input instead
                        e.preventDefault();
                        if (focusInputOnClose.current) {
                            focusInputOnClose.current = false;
                            inputRef.current?.focus();
                        }
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
                        {items.length === 0 && (
                            <li>
                                <button className="w-full px-1.5 py-1 text-left text-muted-foreground" onClick={() => setMenuOpen(false)} type="button">
                                    History is empty
                                </button>
                            </li>
                        )}

                        {items.map((item) => (
                            <li key={item} className="group flex items-center gap-1 rounded hover:bg-muted">
                                <button className="flex-1 min-w-0 px-1.5 py-1 text-left tabular-nums truncate" onClick={() => pick(item)} type="button">
                                    {item}
                                </button>

                                <button
                                    className="shrink-0 mr-1 grid place-items-center size-4 rounded text-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-foreground/10"
                                    onClick={(e) => { e.stopPropagation(); onRemoveItem(item); }}
                                    aria-label={`Remove ${item}`}
                                    type="button"
                                >
                                    <IconRadix_Cross1 className="size-2.5" />
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                </PopoverContent>
            </Popover>
        </div>
    );
}
