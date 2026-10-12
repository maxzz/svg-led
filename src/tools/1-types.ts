import { type ComponentType } from "react";
import { type Getter, type Setter, type WritableAtom } from "jotai";
import { type Point } from "@/svg-core";
import { type ToolId } from "@/store/4-editor";
import { type LastStyle } from "@/store/2-persist";

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

/** Style new shapes are drawn with. Shared by all drawing tools (see lastStyleAtom); stroke width and dash are separate atoms. */
export type ToolStyleOptions = LastStyle;

export type ToolDef = {
    id: ToolId;
    label: string;
    shortcut: string;            // single key, shown on the toolbar button
    icon: ComponentType<{ className?: string; }>;
    hint: string;                // shown under the toolbar while the tool is active
    cursor: string;

    /** Style editor of a drawing tool; the shared last style (see lastStyleAtom) */
    optionsAtom?: WritableAtom<ToolStyleOptions, [Partial<ToolStyleOptions>], void>;

    onPointerDown?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onPointerMove?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onPointerUp?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    /** Return true when the key was handled */
    onKeyDown?: (ctx: ToolContext, e: KeyboardEvent) => boolean;
    /** Called before another tool becomes active */
    onDeactivate?: (ctx: ToolContext) => void;
};
