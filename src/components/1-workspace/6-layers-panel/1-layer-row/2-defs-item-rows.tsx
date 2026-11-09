import { useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { Braces, Shapes } from "lucide-react";

import { type DefsClassItem, type DefsDecl, type DefsElementItem, type DefsItem, defsItemId } from "@/svg-core";
import { defsSelectionAtom, setDefsSelectionAtom } from "@/store/4-editor";
import { setDefsClassActive, setDefsDeclActive, setDefsElementActive } from "@/store/6-layers";
import { ROW_INDENT_PX, containsSelectedDefsFamily, isExpandedFamily, toggleExpandedAtom } from "../9-atoms-layers-panel";
import { defsDragDownAtom } from "../2-reorder";
import { Defs_Icon, EyeToggle_Icon, Expander_Icon, SelectionCircle_Defs_Icon } from "./8-row-common-parts";

/** The items of a `<defs>` element at one depth; each element comes with the items nested in it */
export function DefsItemRows({ defsId, items, depth }: { defsId: string; items: readonly DefsItem[]; depth: number; }) {
    return (<>
        {items.map(
            (item) => (
                item.kind === 'class'
                    ? <DefsClassRow key={item.key} defsId={defsId} item={item} depth={depth} />
                    : <DefsElementRow key={item.key} defsId={defsId} item={item} depth={depth} />
            )
        )}
    </>);
}

/**
 * A class inside `<defs>`. Its eye turns the class on or off (its selector is renamed); selecting the row selects the class,
 * highlights its rule in the code, and shows its declarations in a table under it.
 * The padlock column stays empty so the cells line up with the layer rows.
 */
function DefsClassRow({ defsId, item, depth }: { defsId: string; item: DefsClassItem; depth: number; }) {
    const id = defsItemId(defsId, item.part);
    const selected = useAtomValue(defsSelectionAtom).includes(id);
    const select = useSetAtom(setDefsSelectionAtom);
    const dragDown = useSetAtom(defsDragDownAtom);

    return (<>
        <div
            className={classNames(
                "select-none h-7 border-b border-foreground/5 flex items-stretch",
                selected ? "text-foreground bg-(--editor-accent)/12" : "text-muted-foreground hover:bg-muted/60",
            )}
            data-defs-item={item.key}
            data-defs-drop="class"
            data-defs-id={defsId}
            data-defs-style={item.styleIndex}
            data-defs-name={item.name}
            data-defs-depth={depth}
            title={`Class ${item.label} in <defs> · drag to move`}
            onPointerDown={(e) => dragDown({ source: { kind: 'class', defsId, styleIndex: item.styleIndex, name: item.name, label: item.label }, button: e.button, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, target: e.target as Element, row: e.currentTarget })}
            onClick={() => select([id])}
        >
            <EyeToggle_Icon on={!item.off} title={`${item.off ? "Turn on" : "Turn off"} class ${item.label}`} onToggle={() => setDefsClassActive(defsId, item.styleIndex, item.name, item.off)} />

            <span className="shrink-0 w-7 border-r border-foreground/5" />

            <div className="grow min-w-0 flex items-center gap-1.5" style={{ paddingLeft: 4 + depth * ROW_INDENT_PX }}>
                <span className="shrink-0 size-4" />

                <Defs_Icon icon={Braces} />

                <span className={classNames("truncate", item.off && "line-through opacity-60")}>
                    {item.label}
                </span>
            </div>

            <SelectionCircle_Defs_Icon selected={selected} containsSelected={false} onSelect={() => select([id])} />
        </div>

        {selected && (
            <DeclTable defsId={defsId} item={item} depth={depth} />
        )}
    </>);
}

/** The declarations of a class as a table: eye, property, value. Each eye comments its declaration out, or restores it. */
function DeclTable({ defsId, item, depth }: { defsId: string; item: DefsClassItem; depth: number; }) {
    return (
        <div
            className="my-1 mr-1 text-xs ring-1 ring-foreground/15 rounded overflow-hidden"
            style={{ marginLeft: 4 + depth * ROW_INDENT_PX }}
            data-defs-decls={item.key}
        >
            {item.decls.length === 0 && (
                <div className="px-2 py-1 text-muted-foreground">No declarations</div>
            )}
            {item.decls.map(
                (decl) => (
                    <DeclRow key={decl.key} defsId={defsId} item={item} decl={decl} />
                )
            )}
        </div>
    );
}

function DeclRow({ defsId, item, decl }: { defsId: string; item: DefsClassItem; decl: DefsDecl; }) {
    return (
        <div className={classNames("h-6 border-b border-foreground/5 last:border-b-0 flex items-stretch", decl.off ? "text-muted-foreground" : "text-foreground")} data-defs-decl={decl.key}>
            <EyeToggle_Icon
                on={!decl.off}
                disabled={!decl.toggleable}
                title={decl.toggleable ? `${decl.off ? "Turn on" : "Turn off"} ${decl.prop}` : "This declaration holds the comment end, so it cannot be turned off"}
                onToggle={() => setDefsDeclActive(defsId, item.styleIndex, item.name, decl.index, decl.off)}
            />

            <span className={classNames("w-2/5 shrink-0 px-2 truncate flex items-center border-r border-foreground/5", decl.off && "line-through opacity-60")}>
                {decl.prop}
            </span>
            <span className={classNames("grow min-w-0 px-2 truncate flex items-center", decl.off && "line-through opacity-60")}>
                {decl.value}
            </span>
        </div>
    );
}

/**
 * An element inside `<defs>`. Its eye renames its tag (see `setDefsElementActive`). Its row and selection circle select it;
 * its children are listed under it when it is expanded. The padlock cell stays empty: locking does not apply here.
 */
function DefsElementRow({ defsId, item, depth }: { defsId: string; item: DefsElementItem; depth: number; }) {
    const id = defsItemId(defsId, item.part);

    const selected = useAtomValue(defsSelectionAtom).includes(id);
    const containsSelected = useAtomValue(containsSelectedDefsFamily(id));
    const open = useAtomValue(isExpandedFamily(id));

    const toggleExpanded = useSetAtom(toggleExpandedAtom);
    const select = useSetAtom(setDefsSelectionAtom);
    const dragDown = useSetAtom(defsDragDownAtom);

    const hasChildren = item.children.length > 0;
    const isStyle = item.tag.toLowerCase() === 'style';

    return (<>
        <div
            className={classNames(
                "select-none h-7 border-b border-foreground/5 flex items-stretch",
                selected ? "text-foreground bg-(--editor-accent)/12" : "text-muted-foreground hover:bg-muted/60",
            )}
            data-defs-element={id}
            data-defs-drop={isStyle ? 'style' : 'element'}
            data-defs-id={defsId}
            data-defs-style={item.part}
            data-defs-root={item.topLevel ? item.root : undefined}
            data-defs-depth={depth}
            title={`<${item.tag}> in <defs>${item.topLevel ? " · drag to move" : ""}`}
            onPointerDown={item.topLevel ? (e) => dragDown({ source: { kind: 'element', defsId, root: item.root, label: item.label }, button: e.button, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, target: e.target as Element, row: e.currentTarget }) : undefined}
            onClick={() => select([id])}
        >
            <EyeToggle_Icon on={!item.off} title={`${item.off ? "Turn on" : "Turn off"} <${item.tag}>`} onToggle={() => setDefsElementActive(defsId, Number(item.part), item.off)} />

            <span className="shrink-0 w-7 border-r border-foreground/5" />

            <div className="grow min-w-0 flex items-center gap-1.5" style={{ paddingLeft: 4 + depth * ROW_INDENT_PX }}>

                <Expander_Icon isGroup={hasChildren} open={open} onToggle={() => toggleExpanded(id)} />

                <Defs_Icon icon={isStyle ? Braces : Shapes} />

                <span className={classNames("truncate", item.off && "line-through opacity-60")}>
                    {item.label}
                </span>
            </div>

            <SelectionCircle_Defs_Icon selected={selected} containsSelected={hasChildren && containsSelected} onSelect={() => select([id])} />
        </div>

        {open && hasChildren && (
            <DefsItemRows defsId={defsId} items={item.children} depth={depth + 1} />
        )}
    </>);
}
