import { type ComponentType } from "react";
import { type Getter, type Setter } from "jotai";
import { type Point } from "@/svg-core";
import { type HeldKeys, type ToolId } from "@/store/4-editor";

/** Kinds of element a drawing tool creates. Its panel shows the new-shape properties that apply to the kind. */
export type NewShapeKind = 'rect' | 'ellipse' | 'line' | 'path';

/** Resize handles of the selection box: corners scale both axes, edge handles only the axis perpendicular to their edge */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

/** What is under the pointer, resolved from data-* attributes of canvas elements */
export type CanvasTarget =
    | { type: 'none'; }
    | { type: 'node'; topId: string; leafId: string; }                         // topmost and innermost element under the pointer
    | { type: 'anchor'; nodeId: string; key: string; }                         // key "si:ai"
    | { type: 'handle'; nodeId: string; key: string; side: 'in' | 'out'; }
    | { type: 'shape-handle'; nodeId: string; key: string; }
    | { type: 'resize'; handle: ResizeHandle; };

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

/** What a hint can react to, read when the hint line renders */
export type HintContext = {
    get: Getter;
    /** Modifier keys held now, so the hint shows what they do before a click */
    held: HeldKeys;
    /** A pointer gesture of the active tool is in progress */
    dragging: boolean;
};

export type ToolDef = {
    id: ToolId;
    label: string;
    shortcut: string;            // single key, shown on the toolbar button
    altShortcut?: string;        // second key that selects the tool, e.g. "1" (Excalidraw-style number keys)
    icon: ComponentType<{ className?: string; }>;
    /**
     * One short line under the toolbar while the tool is active. Keys are written in brackets, e.g. "[Shift] add",
     * and drawn as keycaps. While a modifier is held, the line shows what that modifier does (see modifierHint).
     */
    hint: (ctx: HintContext) => string;
    cursor: string;

    /** Kind of element this tool creates; the properties panel then edits the new-shape style */
    newShapeKind?: NewShapeKind;

    onPointerDown?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onPointerMove?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onPointerUp?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    /** Return true when the key was handled */
    onKeyDown?: (ctx: ToolContext, e: KeyboardEvent) => boolean;
    /** Called before another tool becomes active */
    onDeactivate?: (ctx: ToolContext) => void;
};
