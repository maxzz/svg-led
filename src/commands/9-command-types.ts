import { type Getter, type Setter } from "jotai";

export type CommandGroup = 'file' | 'edit' | 'object' | 'viewbox' | 'view' | 'tools' | 'help';

export type CommandContext = { get: Getter; set: Setter; };

export type Command = {
    id: string;
    label: string;
    group: CommandGroup;
    /** Display and matching form, e.g. "Ctrl+Shift+S"; Ctrl also matches Cmd on macOS */
    shortcut?: string;
    /** Extra hidden key bindings (e.g. "Backspace" next to "Delete") */
    alsoKeys?: string[];
    keywords?: string;
    enabled?: (get: Getter) => boolean;
    run: (ctx: CommandContext) => void | Promise<void>;
};

export const COMMAND_GROUP_LABELS: Record<CommandGroup, string> = {
    file: 'File',
    edit: 'Edit',
    object: 'Object',
    viewbox: 'ViewBox',
    view: 'View',
    tools: 'Tools',
    help: 'Help',
};
