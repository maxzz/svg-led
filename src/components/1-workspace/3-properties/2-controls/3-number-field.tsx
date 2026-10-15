import { type KeyboardEvent } from "react";
import { cn } from "@/utils/classnames";
import { MIXED, type MaybeMixed } from "./1-mixed";

type NumberFieldProps = {
    label?: string;
    value: MaybeMixed<number> | undefined;
    onChange: (value: number) => void;
    /** Optional live notification on every valid edit (typing, arrows, Escape), before commit */
    onInput?: (value: number) => void;
    min?: number;
    step?: number;
    precision?: number;
    disabled?: boolean;
    className?: string;
};

/**
 * Uncontrolled input re-keyed by the value, so outside changes (undo, dragging on the canvas)
 * replace the text. Commits on Enter or blur; ArrowUp/ArrowDown step the text (Shift x10).
 */
export function NumberField({ label, value, onChange, onInput, min, step = 1, precision = 2, disabled, className }: NumberFieldProps) {
    const text = value === MIXED || value === undefined ? '' : String(+value.toFixed(precision));

    function clamp(n: number) {
        return min === undefined ? n : Math.max(min, n);
    }

    function commit(raw: string) {
        const n = Number(raw);
        if (raw.trim() !== '' && raw !== text && Number.isFinite(n)) {
            onChange(clamp(n));
        }
    }

    function onTyped(raw: string) {
        const n = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(n)) {
            onInput?.(clamp(n));
        }
    }

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        const input = e.currentTarget;
        if (e.key === 'Enter') {
            input.blur();
        }
        else if (e.key === 'Escape') {
            input.value = text;
            if (typeof value === 'number') onInput?.(value);
            input.blur();
        }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const base = Number(input.value) || 0;
            const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            const next = min === undefined ? base + delta : Math.max(min, base + delta);
            input.value = String(+next.toFixed(precision)); // committed on Enter or blur; committing now would re-key and drop focus
            onInput?.(+next.toFixed(precision));
        }
    }

    return (
        <label className={cn("px-1.5 h-7 min-w-0 text-xs bg-muted/60 focus-within:ring-1 focus-within:ring-(--editor-accent) rounded-md flex items-center gap-1", disabled && "opacity-40", className)}>
            {label && (
                <span className="shrink-0 select-none text-[10px] text-muted-foreground">
                    {label}
                </span>
            )}
            
            <input
                className="w-full min-w-0 tabular-nums bg-transparent outline-none"
                defaultValue={text}
                placeholder={value === MIXED ? 'Mixed' : ''}
                inputMode="decimal"
                disabled={disabled}
                onChange={(e) => onTyped(e.currentTarget.value)}
                onBlur={(e) => commit(e.currentTarget.value)}
                onKeyDown={onKeyDown}
                key={text}
            />
        </label>
    );
}
