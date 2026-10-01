import { type ComponentType } from "react";
import { type Getter, type Setter, type WritableAtom } from "jotai";
import { type Point } from "@/svg-core";
import { type ToolId } from "@/store/4-editor";

/** What is under the pointer, resolved from data-* attributes of canvas elements */
export type CanvasTarget =
    | { type: 'none'; }
    | { type: 'node'; topId: string; leafId: string; }                         // topmost and innermost element under the pointer
    | { type: 'anchor'; nodeId: string; key: string; }                         // key "si:ai"
    | { type: 'handle'; nodeId: string; key: string; side: 'in' | 'out'; }
    | { type: 'shape-handle'; nodeId: string; key: string; }
    | { type: 'resize'; corner: 'nw' | 'ne' | 'se' | 'sw'; };

export type ToolPointerEvent = {
    screen: Point;               // canvas pixels
    doc: Point;                  // document coordinates
    button: number;
    shift: boolean;
    alt: boolean;
    ctrl: boolean;               // Ctrl, or Cmd on macOS
    clickCount: number;
    target: CanvasTarget;
};

export type ToolContext = {
    get: Getter;
    set: Setter;
};

/** Style defaults a drawing tool applies to new shapes; edited in the properties popup when nothing is selected */
export type ToolStyleOptions = {
    stroke: string;
    fill: string;
    strokeWidth: number;
};

export type ToolDef = {
    id: ToolId;
    label: string;
    shortcut: string;            // single key, shown on the toolbar button
    icon: ComponentType<{ className?: string; }>;
    hint: string;                // shown under the toolbar while the tool is active
    cursor: string;

    /** Per-tool options, stored under svg-led__tool:<id>__v1 */
    optionsAtom?: WritableAtom<ToolStyleOptions, [Partial<ToolStyleOptions>], void>;

    onPointerDown?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onPointerMove?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onPointerUp?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    /** Return true when the key was handled */
    onKeyDown?: (ctx: ToolContext, e: KeyboardEvent) => boolean;
    /** Called before another tool becomes active */
    onDeactivate?: (ctx: ToolContext) => void;
};
