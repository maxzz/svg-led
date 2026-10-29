import { Fragment, type ReactNode } from "react";
import { displayShortcut } from "@/commands";
import { KeyText } from "@/ui/local-ui/9-key-text";
import { type ShortcutRowData, type ShortcutSectionData } from "./8-shortcuts-data";

/** A bordered card with a caption, like the islands of the Excalidraw help dialog */
export function ShortcutIsland({ caption, children }: { caption: string; children: ReactNode; }) {
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

export function ShortcutRows({ rows }: { rows: ShortcutRowData[]; }) {
    return (
        <ShortcutList>
            {rows.map(
                (row) => <ShortcutRow label={row.label} shortcuts={row.shortcuts} key={row.id} />
            )}
        </ShortcutList>
    );
}

/** Modifier rows put the key first: "Shift  click to add or remove an element from the selection" */
export function ShortcutSections({ sections, modifiers }: { sections: ShortcutSectionData[]; modifiers?: boolean; }) {
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
