import { useState, type KeyboardEvent } from "react";
import { cn } from "@/utils/classnames";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/ui/shadcn/popover";

import { activeButtonClasses } from "./2-section";
import { MIXED, type MaybeMixed } from "./1-mixed";
import { EyeDropperButton, hasEyeDropper } from "./4-2-eyedropper-button";

type ColorRowProps = {
    value: MaybeMixed<string | undefined> | undefined;
    swatches: readonly string[];
    defaultShade?: number; // Shade index (0-4) used when a palette family is picked. Excalidraw uses 4 for strokes and 1 for fills.
    onChange: (value: string) => void;
};

/** Swatches, a palette popover and a text field for any CSS color */
export function ColorRow({ value, swatches, defaultShade = 4, onChange }: ColorRowProps) {
    const current = value === MIXED ? '' : value ?? '';
    const [open, setOpen] = useState(false);

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    }

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
                {swatches.map(
                    (color) => <Swatch color={color} active={sameColor(color, current)} onClick={() => onChange(color)} key={color} />
                )}

                <div className="mx-0.5 w-px h-4 bg-border" />

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button className="relative size-5 ring-1 ring-foreground/15 rounded overflow-hidden cursor-pointer" style={{ background: CHECKERS }} title="Pick a color" type="button">
                            {isPaint(current) && <span className="absolute inset-0" style={{ background: current }} />}
                        </button>
                    </PopoverTrigger>

                    <PopoverContent className="w-52" side="right" align="start">
                        <ColorPalette current={current} onChange={onChange} defaultShade={defaultShade} />
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
 * Excalidraw-style palette: color families, their shades, and a hex row.
 * The selector button opens the full picker in a second popover, anchored to the palette's right edge.
 */
function ColorPalette({ current, onChange, defaultShade }: { current: string; onChange: (css: string) => void; defaultShade: number; }) {
    const [activeShade, setActiveShade] = useState(defaultShade);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [picker, setPicker] = useState<PickerModule | null>(pickerModule);

    // Which cell the current value belongs to. Its shade (if any) drives the grid and shade row.
    const matched = matchCell(current);
    const shade = matched?.shade ?? activeShade;
    const family = matched && matched.shade !== null ? matched.cell : null;

    function pick(cell: PaletteCell, index: number) {
        setActiveShade(index);
        onChange(cellColor(cell, index));
    }

    /** Opens the full picker. The popover only opens once its module is loaded, so nothing flashes. */
    function requestPicker(open: boolean) {
        if (!open) {
            setPickerOpen(false);
            return;
        }
        if (picker) {
            setPickerOpen(true);
            return;
        }
        loadColorPicker().then(
            (m) => {
                setPicker(m);
                setPickerOpen(true);
            },
            () => { } // failed to load the picker
        );
    }

    // Hotkeys like Excalidraw: q..b pick a color, Shift+1..5 pick a shade of the selected family.
    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }
        const digit = /^Digit([1-5])$/.exec(e.code)?.[1];
        if (e.shiftKey) {
            if (digit && family) {
                e.preventDefault();
                pick(family, Number(digit) - 1);
            }
            return;
        }
        const cell = PALETTE_CELLS.find((c) => c.key === e.key);
        if (cell) {
            e.preventDefault();
            pick(cell, shade);
        }
    }

    return (
        <Popover open={pickerOpen} onOpenChange={requestPicker}>
            <PopoverAnchor asChild>
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3" onKeyDown={onKeyDown}>
                        <div className="text-xs">
                            Colors
                        </div>
                        <div className="grid grid-cols-5 gap-y-1.5">
                            {PALETTE_CELLS.map(
                                (cell) => (
                                    <PaletteCellButton
                                        key={cell.id}
                                        color={cellColor(cell, shade)}
                                        label={cell.key}
                                        title={cell.id}
                                        active={matched?.cell.id === cell.id}
                                        onClick={() => pick(cell, shade)}
                                    />
                                )
                            )}
                        </div>

                        <div className="text-xs">
                            Shades
                        </div>
                        <div className="grid grid-cols-5 gap-y-1.5">
                            {family?.shades
                                ? family.shades.map(
                                    (color, i) => (
                                        <PaletteCellButton
                                            key={i}
                                            color={color}
                                            label={`⇧${i + 1}`}
                                            title={`${family.id} ${i + 1}`}
                                            active={i === shade}
                                            onClick={() => pick(family, i)}
                                        />
                                    )
                                )
                                : Array.from({ length: 5 }, (_, i) => <div key={i} className="h-9 bg-muted/60 rounded-md" />)}
                        </div>
                    </div>

                    <div className="text-xs">
                        Hex code
                    </div>
                    <div className="flex items-center gap-1.5">
                        <HexField value={current} onChange={onChange} />
                        <PickerButton current={current} />
                        {hasEyeDropper() && (
                            <EyeDropperButton onPick={onChange} />
                        )}
                    </div>
                </div>
            </PopoverAnchor>

            <PopoverContent className="w-64" side="right" align="start" sideOffset={8}>
                {picker && (
                    <picker.default value={current} onChange={onChange} />
                )}
            </PopoverContent>
        </Popover>
    );
}

//---------------------------------------------------------------------------
// Full picker (Color.js + picker UI), loaded on demand.
// Hovering the selector button starts the load; clicking it opens the picker once the module is ready.
// The picker never mounts with a placeholder, so the palette stays put while it loads.

type PickerModule = typeof import("./4-1-color-picker-panel");

let pickerModule: PickerModule | null = null;
let pickerLoad: Promise<PickerModule> | null = null;

function loadColorPicker(): Promise<PickerModule> {
    pickerLoad ??= import("./4-1-color-picker-panel").then(
        (m) => (pickerModule = m),
        (err) => {
            pickerLoad = null;
            throw err;
        },
    );
    return pickerLoad;
}

//---------------------------------------------------------------------------
// Palette

// Excalidraw's palette (packages/common/src/colors.ts). Each family has five shades, lightest first.
const FAMILIES = {
    gray:   /**/["#f8f9fa", "#e9ecef", "#ced4da", "#868e96", "#343a40"],
    bronze: /**/["#f8f1ee", "#eaddd7", "#d2bab0", "#a18072", "#846358"],
    cyan:   /**/["#e3fafc", "#99e9f2", "#3bc9db", "#15aabf", "#0c8599"],
    blue:   /**/["#e7f5ff", "#a5d8ff", "#4dabf7", "#228be6", "#1971c2"],
    violet: /**/["#f3f0ff", "#d0bfff", "#9775fa", "#7950f2", "#6741d9"],
    grape:  /**/["#f8f0fc", "#eebefa", "#da77f2", "#be4bdb", "#9c36b5"],
    pink:   /**/["#fff0f6", "#fcc2d7", "#f783ac", "#e64980", "#c2255c"],
    green:  /**/["#ebfbee", "#b2f2bb", "#69db7c", "#40c057", "#2f9e44"],
    teal:   /**/["#e6fcf5", "#96f2d7", "#38d9a9", "#12b886", "#099268"],
    yellow: /**/["#fff9db", "#ffec99", "#ffd43b", "#fab005", "#f08c00"],
    orange: /**/["#fff4e6", "#ffd8a8", "#ffa94d", "#fd7e14", "#e8590c"],
    red:    /**/["#fff5f5", "#ffc9c9", "#ff8787", "#fa5252", "#e03131"],
} as const;

type PaletteCell = { key: string; id: string; fixed?: string; shades?: readonly string[]; };

/** Grid order and hotkeys follow Excalidraw. `transparent` is stored as `none` for SVG. */
const PALETTE_CELLS: readonly PaletteCell[] = [
    { key: 'q', id: 'transparent',  /**/fixed: 'none' },
    { key: 'w', id: 'white',      /**/fixed: '#ffffff' },
    { key: 'e', id: 'gray',       /**/shades: FAMILIES.gray },
    { key: 'r', id: 'black',      /**/fixed: '#1e1e1e' },
    { key: 't', id: 'bronze',       /**/shades: FAMILIES.bronze },
    { key: 'a', id: 'cyan',       /**/shades: FAMILIES.cyan },
    { key: 's', id: 'blue',       /**/shades: FAMILIES.blue },
    { key: 'd', id: 'violet',     /**/shades: FAMILIES.violet },
    { key: 'f', id: 'grape',        /**/shades: FAMILIES.grape },
    { key: 'g', id: 'pink',       /**/shades: FAMILIES.pink },
    { key: 'z', id: 'green',      /**/shades: FAMILIES.green },
    { key: 'x', id: 'teal',       /**/shades: FAMILIES.teal },
    { key: 'c', id: 'yellow',     /**/shades: FAMILIES.yellow },
    { key: 'v', id: 'orange',     /**/shades: FAMILIES.orange },
    { key: 'b', id: 'red',        /**/shades: FAMILIES.red },
];

/** Hex text field. Shows the hex digits (with `#`) for hex colors, otherwise the raw CSS text. */
function HexField({ value, onChange }: { value: string; onChange: (css: string) => void; }) {
    const isHex = value.startsWith('#');
    const text = isHex ? value.slice(1) : value;

    function commit(raw: string) {
        const v = raw.trim();
        if (!v || v === text) {
            return;
        }
        onChange(/^#?[0-9a-f]{3,8}$/i.test(v) ? `#${v.replace(/^#/, '')}` : v);
    }

    return (
        <div className="grow px-2 h-7 min-w-0 bg-muted/60 focus-within:ring-1 focus-within:ring-(--editor-accent) rounded-md flex items-center gap-1">
            {isHex && <span className="text-xs font-mono text-muted-foreground">
                #
            </span>}
            <input
                className="grow min-w-0 text-xs font-mono bg-transparent outline-none"
                aria-label="Hex code"
                defaultValue={text}
                spellCheck={false}
                onBlur={(e) => commit(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                key={value}
            />
        </div>
    );
}

/** Square showing the current color. Toggles the full picker popover. Hovering it starts loading the picker. */
function PickerButton({ current }: { current: string; }) {
    return (
        <PopoverTrigger asChild>
            <button
                className="relative shrink-0 size-7 ring-1 ring-foreground/15 rounded-md overflow-hidden cursor-pointer"
                style={{ background: CHECKERS }}
                onPointerEnter={() => { loadColorPicker().catch(() => { }); }}
                title="Open the color picker"
                type="button"
            >
                {isPaint(current) && (
                    <span className="absolute inset-0" style={{ background: current }} />
                )}
            </button>
        </PopoverTrigger>
    );
}

function PaletteCellButton({ color, label, title, active, onClick }: { color: string; label: string; title: string; active: boolean; onClick: () => void; }) {
    return (
        <button
            className={cn("relative size-8 ring-1 ring-foreground/15 rounded-md cursor-pointer", active && activeButtonClasses)}
            style={{ background: color === 'none' ? CHECKERS : color }}
            onClick={onClick}
            title={title}
            type="button"
        >
            <span className={cn("absolute right-1 bottom-0.5 font-mono text-[10px] leading-none pointer-events-none", isDarkHex(color) ? "text-white/85" : "text-black/60")}>
                {label}
            </span>
        </button>
    );
}

/** Finds the palette cell that holds `value`, and the shade index if it's a family color. */
function matchCell(value: string): { cell: PaletteCell; shade: number | null; } | null {
    const v = value.toLowerCase() === 'transparent' ? 'none' : value.toLowerCase();

    for (const cell of PALETTE_CELLS) {
        if (cell.fixed !== undefined) {
            if (cell.fixed.toLowerCase() === v) {
                return { cell, shade: null };
            }
        } else {
            const i = cell.shades?.indexOf(v) ?? -1;
            if (i >= 0) {
                return { cell, shade: i };
            }
        }
    }

    return null;
}

function cellColor(cell: PaletteCell, index: number): string {
    return cell.fixed ?? cell.shades?.[index] ?? '';
}

/** Perceived brightness (YIQ) of a #rrggbb color. Decides whether the cell label is light or dark. */
function isDarkHex(color: string): boolean {
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
        return false;
    }
    const n = parseInt(color.slice(1), 16);
    return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 < 160;
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void; }) {
    return (
        <button
            className={cn("size-5 ring-1 ring-foreground/15 rounded cursor-pointer", active && activeButtonClasses)}
            style={{ background: color === 'none' ? CHECKERS : color }}
            onClick={onClick}
            title={color}
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

//---------------------------------------------------------------------------

export const STROKE_SWATCHES = /**/['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00'];
export const FILL_SWATCHES =   /**/[/**/ 'none', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99'];
