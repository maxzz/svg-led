import { type KeyboardEvent } from "react";
import { cn } from "@/utils/classnames";
import { MIXED, type MaybeMixed } from "./1-mixed";

export const STROKE_SWATCHES = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00'];
export const FILL_SWATCHES = ['none', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99'];

type ColorRowProps = {
    value: MaybeMixed<string | undefined> | undefined;
    swatches: readonly string[];
    onChange: (value: string) => void;
};

/** Swatches, a system color picker and a text field for any CSS color */
export function ColorRow({ value, swatches, onChange }: ColorRowProps) {
    const current = value === MIXED ? '' : value ?? '';

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

                <label className="relative size-6 ring-1 ring-foreground/15 rounded-md overflow-hidden cursor-pointer" title="Pick a color">
                    <span className="absolute inset-0" style={{ background: isPaint(current) ? current : CHECKERS }} />
                    <input
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        type="color"
                        value={toHexColor(current)}
                        onChange={(e) => onChange(e.currentTarget.value)}
                    />
                </label>
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

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void; }) {
    return (
        <button
            className={cn("size-6 ring-1 ring-foreground/15 rounded-md cursor-pointer", active && "ring-2 ring-(--editor-accent) ring-offset-1 ring-offset-background")}
            style={{ background: color === 'none' ? CHECKERS : color }}
            title={color}
            onClick={onClick}
            type="button"
        />
    );
}

const CHECKERS = 'repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 50% / 8px 8px';

function isPaint(value: string): boolean {
    return !!value && value !== 'none' && value !== 'transparent' && !value.startsWith('url(');
}

function sameColor(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
}

let ctx2d: CanvasRenderingContext2D | null | undefined;

/** Any CSS color to #rrggbb for <input type="color">; non-paint values become black */
export function toHexColor(value: string): string {
    if (!isPaint(value)) {
        return '#000000';
    }
    if (/^#[0-9a-f]{6}$/i.test(value)) {
        return value;
    }
    ctx2d ??= document.createElement('canvas').getContext('2d');
    if (!ctx2d) {
        return '#000000';
    }
    ctx2d.fillStyle = '#000000';
    ctx2d.fillStyle = value;
    const normalized = ctx2d.fillStyle;
    return normalized.startsWith('#') ? normalized : '#000000';
}
