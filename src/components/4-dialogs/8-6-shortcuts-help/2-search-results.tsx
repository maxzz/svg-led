import { useLayoutEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { ShortcutIsland, ShortcutRows, ShortcutSections } from "./3-shortcut-list";
import { canvasRowsAtom, editorSectionsAtom, isLeftColumnEmptyAtom, isNothingFoundAtom, isRightColumnEmptyAtom, modifierSectionsAtom, shortcutsResultsHeightAtom, shortcutsSearchTextAtom, toolRowsAtom, viewSectionsAtom } from "./9-types-shortcuts-search";

/** Keeps the height it had with the full list, so filtering does not shrink and regrow the dialog */
export function ShortcutsSearchResults() {
    const [height, setHeight] = useAtom(shortcutsResultsHeightAtom);
    const isNothingFound = useAtomValue(isNothingFoundAtom);
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(
        () => {
            if (height === null && ref.current) {
                setHeight(ref.current.offsetHeight);
            }
        },
        [height, setHeight]
    );

    return (
        <div ref={ref} className="max-h-[90vh] overflow-auto" style={height === null ? undefined : { height }}>
            {isNothingFound
                ? <NothingFound />
                : (
                    <div className="px-4 py-4 md:grid-cols-2 grid grid-cols-1 gap-x-6 gap-y-4 items-start">
                        <LeftColumn />
                        <RightColumn />
                    </div>
                )
            }
        </div>
    );
}

function NothingFound() {
    const searchText = useAtomValue(shortcutsSearchTextAtom);
    return (
        <div className="px-4 py-8 text-xs text-center text-muted-foreground">
            No commands match "{searchText}"
        </div>
    );
}

function LeftColumn() {
    const isEmpty = useAtomValue(isLeftColumnEmptyAtom);
    if (isEmpty) {
        return null;
    }
    return (
        <div className="flex flex-col gap-4">
            <ToolsIsland />
            <ViewIsland />
        </div>
    );
}

function RightColumn() {
    const isEmpty = useAtomValue(isRightColumnEmptyAtom);
    if (isEmpty) {
        return null;
    }
    return (
        <div className="flex flex-col gap-4">
            <EditorIsland />
            <CanvasIsland />
            <ModifiersIsland />
        </div>
    );
}

//---------------------------------------------------------------------------

function ToolsIsland() {
    const rows = useAtomValue(toolRowsAtom);
    return !!rows.length && (
        <ShortcutIsland caption="Tools">
            <ShortcutRows rows={rows} />
        </ShortcutIsland>
    );
}

function ViewIsland() {
    const sections = useAtomValue(viewSectionsAtom);
    return !!sections.length && (
        <ShortcutIsland caption="View & help">
            <ShortcutSections sections={sections} />
        </ShortcutIsland>
    );
}

function EditorIsland() {
    const sections = useAtomValue(editorSectionsAtom);
    return !!sections.length && (
        <ShortcutIsland caption="Editor">
            <ShortcutSections sections={sections} />
        </ShortcutIsland>
    );
}

function CanvasIsland() {
    const rows = useAtomValue(canvasRowsAtom);
    return !!rows.length && (
        <ShortcutIsland caption="Canvas and other keys">
            <ShortcutRows rows={rows} />
        </ShortcutIsland>
    );
}

function ModifiersIsland() {
    const sections = useAtomValue(modifierSectionsAtom);
    return !!sections.length && (
        <ShortcutIsland caption="Modifier keys">
            <ShortcutSections sections={sections} modifiers />
        </ShortcutIsland>
    );
}
