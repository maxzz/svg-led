import { type ComponentType } from "react";
import { type Getter, type Setter } from "jotai";
import { type Point } from "@/svg-core";
import { type HeldKeys, type ToolId } from "@/store/4-editor";

/**
 * Tool definition interface.
 * @param id - The tool ID.
 * @param label - The tool label.
 * @param shortcut - The tool shortcut key, shown on the toolbar button.
 * @param altShortcut - The tool alternative shortcut key, e.g. "1" (Excalidraw-style number keys).
 * @param icon - The tool icon component.
 * @param hint - The tool hint function, one short line under the toolbar while the tool is active. Keys are written in brackets, e.g. "[Shift] add", and drawn as keycaps. While a modifier is held, the line shows what that modifier does (see modifierHint).
 * @param cursor - The tool cursor type.
 * @param getCursor - Optional Tailwind class name of a cursor utility (from the cursors plugin) that depends on app state (hover, selection); takes precedence over `cursor`.
 * @param newShapeKind - The tool new shape kind, kind of element this tool creates; the properties panel then edits the new-shape style.
 * @param onPointerDown - The tool pointer down event handler.
 * @param onPointerMove - The tool pointer move event handler.
 * @param onPointerUp - The tool pointer up event handler.
 * @param onKeyDown - The tool key down event handler, return true when the key was handled.
 * @param onDeactivate - The tool deactivate event handler, called before another tool becomes active.
 */
export type ToolDef = {
    id: ToolId;
    label: string;
    shortcut: string;            // single key, shown on the toolbar button
    altShortcut?: string;        // second key that selects the tool, e.g. "1" (Excalidraw-style number keys)
    icon: ComponentType<{ className?: string; }>;
    hint: (ctx: HintContext) => string;
    cursor: string;
    getCursor?: (get: Getter) => string; // Tailwind class name, e.g. "cursor-solid-move"
    newShapeKind?: NewShapeKind; // Kind of element this tool creates; the properties panel then edits the new-shape style
    onPointerDown?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onPointerMove?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onPointerUp?: (ctx: ToolContext, e: ToolPointerEvent) => void;
    onKeyDown?: (ctx: ToolContext, e: KeyboardEvent) => boolean; // Return true when the key was handled
    onDeactivate?: (ctx: ToolContext) => void; // Called before another tool becomes active
};

//---------------------------------------------------------------------------

/** Kinds of element a drawing tool creates. Its panel shows the new-shape properties that apply to the kind. */
export type NewShapeKind = 'rect' | 'ellipse' | 'line' | 'path';

//---------------------------------------------------------------------------

export type ToolContext = {
    get: Getter;
    set: Setter;
};

/** What a hint can react to, read when the hint line renders */
export type HintContext = {
    get: Getter;
    held: HeldKeys; // Modifier keys held now, so the hint shows what they do before a click
    dragging: boolean; // A pointer gesture of the active tool is in progress
};

//---------------------------------------------------------------------------
// Tool pointer event types

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

/** What is under the pointer, resolved from data-* attributes of canvas elements */
export type CanvasTarget =
    | { type: 'none'; }
    | { type: 'node'; topId: string; leafId: string; }                         // topmost and innermost element under the pointer
    | { type: 'anchor'; nodeId: string; key: string; }                         // key "si:ai"
    | { type: 'handle'; nodeId: string; key: string; side: 'in' | 'out'; }
    | { type: 'shape-handle'; nodeId: string; key: string; }
    | { type: 'resize'; handle: ResizeHandle; };

/** Resize handles of the selection box: corners scale both axes, edge handles only the axis perpendicular to their edge */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
