import { lazy, Suspense, useState, type KeyboardEvent } from "react";
import { cn } from "@/utils/classnames";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";
import { MIXED, type MaybeMixed } from "./1-mixed";

// Color.js and the full picker load only when "Custom color" is first opened.
const ColorPickerPanel = lazy(() => import("./6-color-picker-panel"));

export const STROKE_SWATCHES = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00'];
export const FILL_SWATCHES = ['none', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99'];

/** Palette shown in the popover. Rows: neutrals, then hues from light to dark. */
const PALETTE = [
    'none',
    '#1e1e1e', '#495057', '#868e96', '#ced4da', '#f8f9fa',
    '#ffc9c9', '#ff8787', '#fa5252', '#e03131', '#c92a2a',
    '#b2f2bb', '#69db7c', '#40c057', '#2f9e44', '#2b8a3e',
    '#a5d8ff', '#4dabf7', '#228be6', '#1971c2', '#1864ab',
    '#ffec99', '#ffd43b', '#fcc419', '#f08c00', '#e8590c',
];

type ColorRowProps = {
    value: MaybeMixed<string | undefined> | undefined;
    swatches: readonly string[];
    onChange: (value: string) => void;
};

/** Swatches, a palette popover and a text field for any CSS color */
export function ColorRow({ value, swatches, onChange }: ColorRowProps) {
    const current = value === MIXED ? '' : value ?? '';
    const [open, setOpen] = useState(false);

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    }

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
                {swatches.map(
                    (color) => <Swatch color={color} active={sameColor(color, current)} onClick={() => onChange(color)} key={color} />
                )}

                <div className="mx-0.5 w-px h-5 bg-border" />

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button className="relative size-6 ring-1 ring-foreground/15 rounded-md overflow-hidden cursor-pointer" style={{ background: CHECKERS }} title="Pick a color" type="button">
                            {isPaint(current) && <span className="absolute inset-0" style={{ background: current }} />}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" side="right" align="start">
                        <ColorPopoverBody current={current} onChange={onChange} onPicked={() => setOpen(false)} />
                    </PopoverContent>
                </Popover>
            </div>

            <input
                className="px-1.5 h-7 font-mono text-[11px] bg-muted/60 focus:ring-1 focus:ring-(--editor-accent) outline-none rounded-md"
                defaultValue={current}
                placeholder={value === MIXED ? 'Mixed' : 'none'}
                spellCheck={false}
                onBlur={(e) => { const v = e.currentTarget.value.trim(); v && v !== current && onChange(v); }}
                onKeyDown={onKeyDown}
                key={current}
            />
        </div>
    );
}

/**
 * Popover content: the palette first (no extra loading). "Custom color" at the bottom
 * switches to the full picker, which is lazy-loaded on first use. Remounting on each
 * open resets the view back to the palette.
 */
function ColorPopoverBody({ current, onChange, onPicked }: { current: string; onChange: (css: string) => void; onPicked: () => void; }) {
    const [custom, setCustom] = useState(false);

    if (!custom) {
        return (
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-5 gap-1.5">
                    {PALETTE.map((color) => (
                        <Swatch
                            color={color}
                            active={sameColor(color, current)}
                            onClick={() => { onChange(color); onPicked(); }}
                            key={color}
                            className="h-7 w-full"
                        />
                    ))}
                </div>

                <button className="h-7 text-xs bg-muted/60 hover:bg-muted rounded-md cursor-pointer" onClick={() => setCustom(true)} type="button">
                    Custom color…
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <button className="self-start text-xs text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => setCustom(false)} type="button">
                ← Palette
            </button>
            <Suspense fallback={<div className="h-64" />}>
                <ColorPickerPanel value={current} onChange={onChange} />
            </Suspense>
        </div>
    );
}

function Swatch({ color, active, onClick, className = "size-6" }: { color: string; active: boolean; onClick: () => void; className?: string; }) {
    return (
        <button
            className={cn("ring-1 ring-foreground/15 rounded-md cursor-pointer", className, active && "ring-2 ring-(--editor-accent) ring-offset-1 ring-offset-background")}
            style={{ background: color === 'none' ? CHECKERS : color }}
            title={color}
            onClick={onClick}
            type="button"
        />
    );
}

export const CHECKERS = 'repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 50% / 8px 8px';

function isPaint(value: string): boolean {
    return !!value && value !== 'none' && value !== 'transparent' && !value.startsWith('url(');
}

function sameColor(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
}
