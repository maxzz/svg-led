import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { IconColorPicker } from "@/ui/icons/normal/editor-manual-fields";
import { Segmented, type SegmentOption } from "./2-section";
import { NumberField } from "./3-number-field";
import { CHECKERS } from "./4-color-row";
import { COLOR_MODELS, type ColorModelId, type Hsv, type Triple, formatColor, formatHsv, hsvOf, modelOf, modelValues, valuesOf } from "./5-color-model";

type ColorPickerPanelProps = {
    value: string;
    onChange: (css: string) => void;
};

/** Default export so the panel can be lazy-loaded the first time the picker opens. */
export default function ColorPickerPanel({ value, onChange }: ColorPickerPanelProps) {
    const [state, setState] = useState(() => ({ source: value, hsv: hsvOf(value, 0) }));

    // The value changed from outside (text field, swatch, undo). Our own commits store their text as `source` first, so they don't loop back here.
    const stale = value !== state.source;
    const hsv = stale ? hsvOf(value, state.hsv.h) : state.hsv;
    if (stale) {
        setState({ source: value, hsv });
    }

    const model = modelOf(value);
    const fields = COLOR_MODELS[model].fields;
    const values = valuesOf(value, model) ?? modelValues(hsv, model);

    function commit(next: Hsv, css: string) {
        setState({ source: css, hsv: next });
        onChange(css);
    }

    function setHsv(next: Hsv) {
        commit(next, formatHsv(next, model));
    }

    function setModel(id: ColorModelId) {
        if (id === model) {
            return;
        }
        const css = formatColor(id, valuesOf(value, id) ?? modelValues(hsv, id), hsv.a);
        commit(hsvOf(css, hsv.h), css);
    }

    function setField(i: number, n: number) {
        const next: Triple = [...values];
        next[i] = clampTo(n, fields[i]);
        const css = formatColor(model, next, hsv.a);
        commit(hsvOf(css, hsv.h), css);
    }

    return (
        <div className="flex flex-col gap-2">
            <SaturationArea hue={hsv.h} s={hsv.s} v={hsv.v} onChange={(s, v) => setHsv({ ...hsv, s, v })} />

            <div className="flex items-center gap-2">
                {'EyeDropper' in window && <EyeDropperButton onPick={(hex) => setHsv({ ...hsvOf(hex, hsv.h), a: hsv.a })} />}
                <Bar label="Hue" t={hsv.h / 360} background={HUE_GRADIENT} onChange={(t) => setHsv({ ...hsv, h: t * 360 })} />
            </div>

            <Bar label="Alpha" t={hsv.a} background={`linear-gradient(to right, transparent, ${formatHsv({ ...hsv, a: 1 }, 'hex')})`} checkered onChange={(a) => setHsv({ ...hsv, a })} />

            <Segmented options={MODEL_OPTIONS} value={model} onChange={setModel} />

            <div className="grid grid-cols-4 gap-1" key={model}>
                {fields.map((f, i) => (
                    <NumberField key={i} label={f.label} value={values[i]} precision={f.precision} min={f.min} onChange={(n) => setField(i, n)} />
                ))}
                <NumberField label="A" value={hsv.a * 100} precision={0} min={0} onChange={(n) => setHsv({ ...hsv, a: clamp01(n / 100) })} />
            </div>
        </div>
    );
}

//---------------------------------------------------------------------------

/** Saturation (x) and brightness (y) for the current hue. Arrow keys move the handle when focused. */
function SaturationArea({ hue, s, v, onChange }: { hue: number; s: number; v: number; onChange: (s: number, v: number) => void; }) {
    function pick(e: PointerEvent<HTMLDivElement>) {
        const r = e.currentTarget.getBoundingClientRect();
        onChange(clamp01((e.clientX - r.left) / r.width), clamp01(1 - (e.clientY - r.top) / r.height));
    }

    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
        const dy = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
        if (!dx && !dy) {
            return;
        }
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 0.01;
        onChange(clamp01(s + dx * step), clamp01(v + dy * step));
    }

    return (
        <div
            className="relative h-36 touch-none focus-visible:ring-1 focus-visible:ring-(--editor-accent) outline-none rounded-md cursor-crosshair"
            style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue} 100% 50%))` }}
            role="application"
            aria-label="Saturation and brightness"
            tabIndex={0}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
            onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e); }}
            onKeyDown={onKeyDown}
        >
            <div className="absolute size-3.5 -translate-x-1/2 -translate-y-1/2 border-2 border-white rounded-full shadow-[0_0_0_1px_rgb(0_0_0/0.35)] pointer-events-none" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }} />
        </div>
    );
}

/** Horizontal slider for a 0..1 value over a gradient. Arrow keys step it when focused. */
function Bar({ label, t, background, checkered, onChange }: { label: string; t: number; background: string; checkered?: boolean; onChange: (t: number) => void; }) {
    function pick(e: PointerEvent<HTMLDivElement>) {
        const r = e.currentTarget.getBoundingClientRect();
        onChange(clamp01((e.clientX - r.left) / r.width));
    }

    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        const dir = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
        if (!dir) {
            return;
        }
        e.preventDefault();
        onChange(clamp01(t + dir * (e.shiftKey ? 0.1 : 0.01)));
    }

    return (
        <div
            className="relative grow h-3 touch-none focus-visible:ring-(--editor-accent) outline-none ring-1 ring-foreground/15 rounded-full cursor-pointer"
            style={{ background: checkered ? `${background}, ${CHECKERS}` : background }}
            role="slider"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(t * 100)}
            tabIndex={0}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
            onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e); }}
            onKeyDown={onKeyDown}
        >
            <div className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-[0_0_0_1px_rgb(0_0_0/0.35)] pointer-events-none" style={{ left: `${t * 100}%` }} />
        </div>
    );
}

type EyeDropperApi = { open: () => Promise<{ sRGBHex: string; }>; };

/** Samples a color from anywhere on screen (Chromium's EyeDropper API). Escape cancels. */
function EyeDropperButton({ onPick }: { onPick: (hex: string) => void; }) {
    const EyeDropper = (window as unknown as { EyeDropper: new () => EyeDropperApi; }).EyeDropper;

    async function pick() {
        try {
            onPick((await new EyeDropper().open()).sRGBHex);
        } catch {
            // cancelled
        }
    }

    return (
        <button className="shrink-0 size-7 bg-muted/60 hover:bg-muted rounded-md flex items-center justify-center cursor-pointer" title="Pick a color from the screen" type="button" onClick={pick}>
            <IconColorPicker className="size-4" />
        </button>
    );
}

//---------------------------------------------------------------------------

const HUE_GRADIENT = 'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)';

const MODEL_OPTIONS: SegmentOption<ColorModelId>[] = (Object.keys(COLOR_MODELS) as ColorModelId[]).map((id) => ({
    value: id,
    label: COLOR_MODELS[id].label,
    title: COLOR_MODELS[id].fn ? `CSS ${COLOR_MODELS[id].fn}()` : 'Hex',
}));

function clamp01(n: number): number {
    return Math.min(1, Math.max(0, n));
}

function clampTo(n: number, { min = -Infinity, max = Infinity }: { min?: number; max?: number; }): number {
    return Math.min(max, Math.max(min, n));
}
