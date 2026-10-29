import { Fragment, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useRef, useState } from "react";
import { useAtom } from "jotai";
import { KeyboardIcon, XIcon } from "lucide-react";
import { COMMANDS, COMMAND_GROUP_LABELS, type CommandGroup, displayShortcut, matchShortcut } from "@/commands";
import { MODIFIERS, MODIFIER_DESCRIPTIONS, MODIFIER_LABELS, type Modifier, TOOLS, toolShortcuts } from "@/tools";
import { HintText } from "@/components/1-workspace/3-3-hint-panel/1-hint-text";
import { KeyText } from "@/ui/local-ui/9-key-text";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ui/shadcn/input-group";
import { cn } from "@/utils/classnames";
import { isOpenShortcutsHelpDialogAtom } from "./9-types-shortcuts-help";

export function ShortcutsHelpDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenShortcutsHelpDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! w-[min(64rem,calc(100vw-2rem))]! max-w-5xl gap-0!" withScroll onEscapeKeyDown={keepOpenWhileRecording}>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Help and keyboard shortcuts
                    </DialogTitle>
                    <DialogDescription className="text-xs sr-only">
                        <HintText text="[Space]+drag or the middle mouse button pans · Wheel zooms · [Shift]+wheel scrolls sideways · Double-click a group to enter isolation mode" />
                    </DialogDescription>
                </DialogHeader>

                {isOpen && <ShortcutsHelpBody />}
            </DialogContent>
        </Dialog>
    );
}

/** Mounted only while the dialog is open, so the search query starts empty each time */
function ShortcutsHelpBody() {
    const [query, setQuery] = useState('');
    const [recorded, setRecorded] = useState<RecordedKeys | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    function toggleRecording() {
        setIsRecording((v) => !v);
        clear();
    }

    function clear() {
        setQuery('');
        setRecorded(null);
        inputRef.current?.focus();
    }

    function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyK') {
            e.preventDefault();
            toggleRecording();
            return;
        }
        if (!isRecording || e.key === 'Tab') {
            return;
        }
        e.preventDefault();
        setRecorded(recordKeys(e));
    }

    const matcher = isRecording ? keysMatcher(recorded) : nameMatcher(query);

    const toolRows = filterRows(TOOL_ROWS, matcher);
    const viewSections = filterSections(VIEW_SECTIONS, matcher);
    const editorSections = filterSections(EDITOR_SECTIONS, matcher);
    const canvasRows = filterRows(CANVAS_ROWS, matcher);
    const modifierSections = filterSections(MODIFIER_SECTIONS, matcher);

    const isLeftEmpty = !toolRows.length && !viewSections.length;
    const isRightEmpty = !editorSections.length && !canvasRows.length && !modifierSections.length;

    const inputText = isRecording ? (recorded ? displayShortcut(recorded.text) : '') : query;

    return (<>
        <div className="px-4 py-2 border-b">
            <InputGroup className="rounded-sm">
                <InputGroupInput
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => !isRecording && setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    readOnly={isRecording}
                    data-recording={isRecording || undefined}
                    placeholder={isRecording ? "Press a key combination, e.g. Shift+1" : "Search by command name, e.g. 'zoom', or type keys, e.g. 'Ctrl+Z'"}
                    aria-label={isRecording ? "Press a key combination to search" : "Search commands by name"}
                    autoFocus
                />
                <InputGroupAddon align="inline-end">
                    {!!inputText && (
                        <InputGroupButton size="icon-xs" title="Clear" aria-label="Clear" onClick={clear}>
                            <XIcon />
                        </InputGroupButton>
                    )}
                    <InputGroupButton
                        size="icon-xs"
                        className={cn(isRecording && "text-primary bg-primary/10")}
                        title="Record keys (Alt+K): search by pressing a key combination"
                        aria-label="Record keys"
                        aria-pressed={isRecording}
                        onClick={toggleRecording}
                    >
                        <KeyboardIcon />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        </div>

        {isLeftEmpty && isRightEmpty
            ? (
                <div className="px-4 py-8 text-xs text-center text-muted-foreground">
                    No commands match "{inputText}"
                </div>
            )
            : (
                <div className="px-4 py-4 max-h-[90vh] md:grid-cols-2 overflow-auto grid grid-cols-1 gap-x-6 gap-y-4 items-start">
                    {!isLeftEmpty && (
                        <div className="flex flex-col gap-4">
                            {!!toolRows.length && (
                                <ShortcutIsland caption="Tools">
                                    <ShortcutRows rows={toolRows} />
                                </ShortcutIsland>
                            )}

                            {!!viewSections.length && (
                                <ShortcutIsland caption="View & help">
                                    <ShortcutSections sections={viewSections} />
                                </ShortcutIsland>
                            )}
                        </div>
                    )}

                    {!isRightEmpty && (
                        <div className="flex flex-col gap-4">
                            {!!editorSections.length && (
                                <ShortcutIsland caption="Editor">
                                    <ShortcutSections sections={editorSections} />
                                </ShortcutIsland>
                            )}

                            {!!canvasRows.length && (
                                <ShortcutIsland caption="Canvas and other keys">
                                    <ShortcutRows rows={canvasRows} />
                                </ShortcutIsland>
                            )}

                            {!!modifierSections.length && (
                                <ShortcutIsland caption="Modifier keys">
                                    <ShortcutSections sections={modifierSections} modifiers />
                                </ShortcutIsland>
                            )}
                        </div>
                    )}
                </div>
            )
        }
    </>);
}

// * Click to select, Shift+click to add, drag to move (Alt+drag copies), double-click a group to enter isolation mode, Ctrl+click to select inside a group
// * Space+drag or the middle mouse button pans; the wheel zooms, Shift+wheel scrolls sideways.

//---------------------------------------------------------------------------

type ShortcutRowData = { id: string; label: string; shortcuts: string[]; };
type ShortcutSectionData = { id: string; heading: string; rows: ShortcutRowData[]; };

type Matcher = {
    row: (row: ShortcutRowData) => boolean;
    heading: (heading: string) => boolean;
};

const matchAll: Matcher = { row: () => true, heading: () => false };

function words(text: string): string[] {
    return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** 'Ctrl+Shift+Z' -> ['ctrl', 'shift', 'z']; Mac symbols are spelled out */
function keyTokens(text: string): string[] {
    return text.toLowerCase()
        .replace(/⌘/g, '+ctrl+').replace(/⌥/g, '+alt+').replace(/⇧/g, '+shift+')
        .split('+').map((t) => t.trim()).filter(Boolean);
}

/**
 * Every typed word must start a word of the label ('h' finds 'Hand' and 'Hide selection'),
 * or every typed key must be a whole key of the shortcut ('h' finds Ctrl+Shift+H, but never matches inside 'Shift').
 * Text with '+' or without letters and digits ('Ctrl+Z', 'shift+1', '?') is read as keys only.
 */
function nameMatcher(query: string): Matcher {
    const text = query.trim();
    if (!text) {
        return matchAll;
    }

    const isKeysOnly = text.includes('+') || !words(text).length;
    const keys = isKeysOnly ? keyTokens(text) : words(text);
    const matchesKeys = (row: ShortcutRowData) => row.shortcuts.some((s) => { const tokens = keyTokens(s); return keys.every((k) => tokens.includes(k)); });

    if (isKeysOnly) {
        return { row: matchesKeys, heading: () => false };
    }

    const queryWords = words(text);
    const matchesText = (label: string) => {
        const labelWords = words(label);
        return queryWords.every((q) => labelWords.some((w) => w.startsWith(q)));
    };
    return { row: (row) => matchesText(row.label) || matchesKeys(row), heading: matchesText };
}

/** A key combination pressed in record mode; 'event' is absent while only modifiers are held */
type RecordedKeys = {
    text: string;
    mods: string[];
    event?: KeyboardEvent;
};

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);

function recordKeys(e: ReactKeyboardEvent): RecordedKeys {
    const mods = [(e.ctrlKey || e.metaKey) && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift'].filter((m): m is string => !!m);
    if (MODIFIER_KEYS.has(e.key)) {
        return { text: mods.join('+'), mods };
    }
    const key = recordedKeyName(e);
    return {
        text: [...mods, key].join('+'),
        mods,
        event: e.nativeEvent,
    };
}

/** Layout-independent name of the main key, spelled like the shortcut list: Shift+1 stays '1', not '!' */
function recordedKeyName(e: ReactKeyboardEvent): string {
    const c = e.code;
    if (c.startsWith('Key')) return c.slice(3);
    if (c.startsWith('Digit')) return c.slice(5);
    if (e.key.startsWith('Arrow')) return 'Arrows';
    const byCode: Record<string, string> = { BracketLeft: '[', BracketRight: ']', Equal: '=', Minus: '-', Slash: '/', Comma: ',', Period: '.', Space: 'Space', Escape: 'Esc' };
    return byCode[c] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key);
}

/** Modifiers alone find every shortcut that uses them; a full combination finds the shortcuts it would trigger */
function keysMatcher(recorded: RecordedKeys | null): Matcher {
    if (!recorded) {
        return matchAll;
    }
    const mods = recorded.mods.map((m) => m.toLowerCase());
    const recordedTokens = keyTokens(recorded.text);
    const { event } = recorded;

    return {
        row: (row) => row.shortcuts.some((s) => {
            const tokens = keyTokens(s);
            if (!event) {
                return mods.every((m) => tokens.includes(m));
            }
            const isSameKeys = tokens.length === recordedTokens.length && recordedTokens.every((t) => tokens.includes(t));
            return isSameKeys || matchShortcut(event, s);
        }),
        heading: () => false,
    };
}

/** In record mode Esc is a key to search for, so it must not close the dialog */
function keepOpenWhileRecording(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.dataset?.recording) {
        e.preventDefault();
    }
}

function filterRows(rows: ShortcutRowData[], matcher: Matcher): ShortcutRowData[] {
    return rows.filter(matcher.row);
}

/** A section whose heading matches keeps all its rows; otherwise only the matching rows, and empty sections are dropped */
function filterSections(sections: ShortcutSectionData[], matcher: Matcher): ShortcutSectionData[] {
    return sections
        .map((section) => (matcher.heading(section.heading) ? section : { ...section, rows: filterRows(section.rows, matcher) }))
        .filter((section) => section.rows.length);
}

//---------------------------------------------------------------------------

const TOOL_ROWS: ShortcutRowData[] = TOOLS.map(
    (tool) => ({ id: tool.id, label: tool.label, shortcuts: toolShortcuts(tool) })
);

function commandSections(groups: CommandGroup[]): ShortcutSectionData[] {
    return groups.map(
        (group) => ({
            id: group,
            heading: COMMAND_GROUP_LABELS[group],
            rows: COMMANDS
                .filter((c) => c.group === group && c.shortcut)
                .map((c) => ({ id: c.id, label: c.label, shortcuts: [c.shortcut!, ...(c.alsoKeys ?? [])] })),
        })
    ).filter((section) => section.rows.length);
}

const EDITOR_SECTIONS = commandSections(['file', 'edit', 'object']);
const VIEW_SECTIONS = commandSections(['view', 'viewbox', 'help']);

/** Keys and mouse actions that are not commands (they are handled by tools, controllers or dialogs), so the command list does not show them */
const CANVAS_ROWS: ShortcutRowData[] = [
    { label: 'Copy the selection as SVG', shortcuts: ['Ctrl+C'] },
    { label: 'Cut the selection as SVG', shortcuts: ['Ctrl+X'] },
    { label: 'Paste SVG markup from the clipboard', shortcuts: ['Ctrl+V'] },
    { label: 'Pan: hold Space and drag, or drag with the middle mouse button', shortcuts: ['Space'] },
    { label: 'Zoom around the pointer (Ctrl+wheel zooms faster)', shortcuts: ['Wheel'] },
    { label: 'Scroll sideways', shortcuts: ['Shift+Wheel'] },
    { label: 'Nudge the selection by 1 (in Points: move the selected anchors)', shortcuts: ['Arrows'] },
    { label: 'Nudge the selection by 10', shortcuts: ['Shift+Arrows'] },
    { label: 'Back to Select, then leave isolation, then clear the selection', shortcuts: ['Esc'] },
    { label: 'Delete the selection (in Points: the selected anchors)', shortcuts: ['Delete', 'Backspace'] },
    { label: 'Pen: remove the last point while drawing', shortcuts: ['Backspace', 'Delete'] },
    { label: 'Pen: finish the path', shortcuts: ['Enter', 'Esc'] },
    { label: 'Double-click a group to isolate it; double-click empty canvas to leave one level', shortcuts: ['Double-click'] },
    { label: 'Scraps list: move between scraps', shortcuts: ['Arrows', 'Home', 'End'] },
    { label: 'Scraps list: load the selected scrap', shortcuts: ['Enter'] },
].map((row) => ({ ...row, id: row.label }));

const MODIFIER_GROUP_LABELS: Record<keyof typeof MODIFIERS, string> = {
    select: 'Selection tool',
    points: 'Edit points tool',
    shapes: 'Shape tools',
    pen: 'Pen tool',
};

const MODIFIER_SECTIONS: ShortcutSectionData[] = (Object.keys(MODIFIERS) as (keyof typeof MODIFIERS)[]).map(
    (group) => ({
        id: group,
        heading: MODIFIER_GROUP_LABELS[group],
        rows: Object.entries(MODIFIERS[group]).map(
            ([key, mod]) => ({
                id: key,
                label: (MODIFIER_DESCRIPTIONS[group] as Record<string, string>)[key],
                shortcuts: [MODIFIER_LABELS[mod as Modifier]],
            })
        ),
    })
);

//---------------------------------------------------------------------------

/** A bordered card with a caption, like the islands of the Excalidraw help dialog */
function ShortcutIsland({ caption, children }: { caption: string; children: ReactNode; }) {
    return (
        <section className="p-3 border rounded-lg flex flex-col gap-3">
            <h3 className="text-xs font-semibold">{caption}</h3>
            {children}
        </section>
    );
}

/** A bordered list whose items are separated by horizontal lines */
function ShortcutList({ children }: { children: ReactNode; }) {
    return (
        <div className="flex flex-col divide-y rounded-md border">
            {children}
        </div>
    );
}

/** A section heading placed above its list of items */
function ShortcutSectionHeading({ children }: { children: ReactNode; }) {
    return (
        <h4 className="font-semibold text-xs">{children}</h4>
    );
}

function ShortcutRows({ rows }: { rows: ShortcutRowData[]; }) {
    return (
        <ShortcutList>
            {rows.map(
                (row) => <ShortcutRow label={row.label} shortcuts={row.shortcuts} key={row.id} />
            )}
        </ShortcutList>
    );
}

/** Modifier rows put the key first: "Shift  click to add or remove an element from the selection" */
function ShortcutSections({ sections, modifiers }: { sections: ShortcutSectionData[]; modifiers?: boolean; }) {
    return (<>
        {sections.map(
            (section) => (
                <div className="flex flex-col gap-1.5" key={section.id}>
                    <ShortcutSectionHeading>{section.heading}</ShortcutSectionHeading>
                    {modifiers
                        ? (
                            <ShortcutList>
                                {section.rows.map(
                                    (row) => <ModifierRow label={row.label} modifier={row.shortcuts[0]} key={row.id} />
                                )}
                            </ShortcutList>
                        )
                        : <ShortcutRows rows={section.rows} />
                    }
                </div>
            )
        )}
    </>);
}

/** One action, then each way to trigger it: "Redo  Ctrl Shift Z  or  Ctrl Y" */
function ShortcutRow({ label, shortcuts }: { label: string; shortcuts: string[]; }) {
    return (
        <div className="px-2.5 py-1.5 text-xs flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <div className="shrink-0 flex items-center gap-1">
                {shortcuts.map(
                    (shortcut, i) => (
                        <Fragment key={shortcut}>
                            {i > 0 && <span className="text-[10px] text-muted-foreground">or</span>}
                            {shortcut.split('+').map(
                                (key, j) => <KeyText key={j}>{displayShortcut(key)}</KeyText>
                            )}
                        </Fragment>
                    )
                )}
            </div>
        </div>
    );
}

function ModifierRow({ label, modifier }: { label: string; modifier: string; }) {
    return (
        <div className="px-2.5 py-1.5 text-xs flex items-baseline gap-2">
            <KeyText>{displayShortcut(modifier)}</KeyText>
            <span className="text-muted-foreground">{label}</span>
        </div>
    );
}
