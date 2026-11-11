import { type FocusEvent, type KeyboardEvent, useRef, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Label } from "@/ui/shadcn/label";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { Control_WithHint } from "./7-0-viewbox-controls";

type PrefComboProps = {
    label: string;
    /** Tooltip text that explains the setting */
    hint: string;
    value: number;
    /** Drop-down choices; the input accepts any whole number from `min` to `max` */
    presets: readonly number[];
    min: number;
    max: number;
    onValueChange: (n: number) => void;
};

/** Input and preset drop-down in one control. Invalid text is marked red and reverted on blur or Escape. */
export function Contron_Combo({ label, hint, value, presets, min, max, onValueChange }: PrefComboProps) {
    const id = useId();
    const [draft, setDraft] = useState(String(value));
    const [invalid, setInvalid] = useState(false);
    const [prevValue, setPrevValue] = useState(value);
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Follow changes made elsewhere (presets, undo, loading a file)
    if (value !== prevValue) {
        setPrevValue(value);
        setDraft(String(value));
        setInvalid(false);
    }

    /** Applies the text if it is a valid whole number; returns whether it was accepted */
    function apply(text: string): boolean {
        const n = Number(text);
        const ok = text.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
        if (ok) {
            setDraft(String(n));
            setInvalid(false);
            if (n !== value) {
                onValueChange(n);
            }
        } else {
            setInvalid(true);
        }
        return ok;
    }

    function revert() {
        setDraft(String(value));
        setInvalid(false);
    }

    function pick(n: number) {
        setOpen(false);
        setDraft(String(n));
        setInvalid(false);
        if (n !== value) {
            onValueChange(n);
        }
    }

    function onBlur(e: FocusEvent<HTMLInputElement>) {
        if (!apply(e.currentTarget.value)) {
            revert();
        }
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            apply(e.currentTarget.value);
        }
        else if (e.key === 'Escape') {
            revert();
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <Control_WithHint hint={hint}>
                <Label className="text-xs" htmlFor={id}>
                    {label}
                </Label>

                <PopoverAnchor asChild>
                    <div className={cn("flex items-stretch w-16 h-6 rounded-md bg-muted/60 overflow-hidden", invalid ? "ring-1 ring-red-500" : "focus-within:ring-1 focus-within:ring-(--editor-accent)")}>
                        <input
                            id={id}
                            className={cn("w-full min-w-0 px-1.5 tabular-nums bg-transparent outline-none", invalid && "text-red-500")}
                            inputMode="numeric"
                            value={draft}
                            onChange={(e) => { setDraft(e.currentTarget.value); }}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                            aria-invalid={invalid}
                        />

                        <PopoverTrigger asChild>
                            <button ref={buttonRef} type="button" aria-label={`${label} presets`} className="w-5 shrink-0 grid place-items-center hover:bg-foreground/10">
                                <ChevronDown className="size-3" />
                            </button>
                        </PopoverTrigger>
                    </div>
                </PopoverAnchor>
            </Control_WithHint>

            <PopoverContent
                className="p-1 gap-0 w-(--radix-popper-anchor-width) min-w-16"
                align="end"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()} // Keep focus in the input
                onPointerDownOutside={(e) => {
                    // The trigger toggles the list itself; don't let the outside click close it first and then reopen it
                    if (buttonRef.current?.contains(e.target as Node)) {
                        e.preventDefault();
                    }
                }}
            >
                {presets.map(
                    (n) => (
                        <button key={n} type="button" className="px-1.5 py-1 text-left tabular-nums rounded hover:bg-muted" onClick={() => pick(n)}>
                            {n}
                        </button>
                    )
                )}
            </PopoverContent>
        </Popover>
    );
}
