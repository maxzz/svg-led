import { type SyntheticEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { classNames } from "@/utils";
import { blurRenameAtom, cancelRenameAtom, commitRenameAtom, isRenamingFamily, renameErrorAtom, startRenameAtom } from "./9-atoms-rename";

type LayerNameProps = {
    id: string;
    name: string;                // what the row shows: the id attribute or a tag such as <Path>
    idAttr: string;              // the id attribute itself, empty when there is none
    dimmed: boolean;
};

/** Name of a layer; double-click (or F2 with one selected layer) edits it in place */
export function LayerName({ id, name, idAttr, dimmed }: LayerNameProps) {
    const renaming = useAtomValue(isRenamingFamily(id));
    const startRename = useSetAtom(startRenameAtom);

    if (renaming) {
        return <LayerNameInput value={idAttr} placeholder={name} />;
    }
    return (
        <span
            className={classNames("truncate", dimmed && "text-muted-foreground")}
            title={`${name} · double-click to rename`}
            onDoubleClick={(e) => { e.stopPropagation(); startRename(id); }}
        >
            {name}
        </span>
    );
}

function LayerNameInput({ value, placeholder }: { value: string; placeholder: string; }) {
    const error = useAtomValue(renameErrorAtom);
    const commit = useSetAtom(commitRenameAtom);
    const blur = useSetAtom(blurRenameAtom);
    const cancel = useSetAtom(cancelRenameAtom);

    return (
        <input
            className={classNames(
                "grow px-1 min-w-0 h-5 text-xs bg-background border outline-none rounded-xs",
                error ? "border-destructive ring-1 ring-destructive/40" : "border-(--editor-accent)",
            )}
            data-row-control
            defaultValue={value}
            placeholder={placeholder}
            title={error ?? "Enter applies · Esc cancels · empty removes the id"}
            aria-invalid={!!error}
            spellCheck={false}
            autoFocus
            ref={selectAll}
            onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    commit(e.currentTarget.value);
                } else if (e.key === 'Escape') {
                    cancel();
                }
            }}
            onBlur={(e) => blur(e.currentTarget.value)}
            onClick={stop}
            onDoubleClick={stop}
        />
    );
}

function selectAll(el: HTMLInputElement | null) {
    el?.select();
}

function stop(e: SyntheticEvent) {
    e.stopPropagation();
}
