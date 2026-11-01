import { type SyntheticEvent, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { toast } from "sonner";
import { classNames } from "@/utils";
import { doRenameScrapAtom } from "./9-types-scraps";

/** In-place name. Enter applies, Esc cancels, and leaving the field applies a valid name. */
export function ScrapNameInput({ name, onRenamed, onCancel }: { name: string; onRenamed: (name: string, focus: boolean) => void; onCancel: (focus: boolean) => void; }) {
    const doRename = useSetAtom(doRenameScrapAtom);
    const [error, setError] = useState<string | null>(null);
    const open = useRef(true);

    function commit(text: string, focus: boolean): boolean {
        const rv = doRename({ from: name, to: text });
        if (!rv.ok) {
            if (rv.error) {
                setError(rv.error);
                toast.error(rv.error, { id: SCRAP_RENAME_TOAST });
            }
            return false;
        }
        open.current = false;
        onRenamed(rv.name, focus);
        return true;
    }

    function cancel(focus: boolean) {
        if (!open.current) {
            return;
        }
        open.current = false;
        onCancel(focus);
    }

    return (
        <input
            className={classNames(
                "select-text px-1 w-full min-w-0 h-5 text-xs bg-background outline-none border rounded-xs cursor-text",
                error ? "border-destructive ring-1 ring-destructive/40" : "border-(--editor-accent)",
            )}
            data-row-control
            data-scrap-rename=""
            defaultValue={name}
            aria-label="Scrap name"
            aria-invalid={!!error}
            title={error ?? "Enter applies · Esc cancels"}
            spellCheck={false}
            autoFocus
            ref={selectAll}
            onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit(e.currentTarget.value, true);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancel(true);
                }
            }}
            onBlur={(e) => {
                if (!open.current) {
                    return;
                }
                // A row button, such as Delete, takes the click; applying the name first would replace that button
                const next = e.relatedTarget;
                if (next instanceof Element && next.closest('[data-row-control]')) {
                    cancel(false);
                    return;
                }
                commit(e.currentTarget.value, false) || cancel(false);
            }}
            onClick={stop}
            onDoubleClick={stop}
        />
    );
}

const SCRAP_RENAME_TOAST = 'scrap-rename';

function selectAll(el: HTMLInputElement | null) {
    el?.select();
}

function stop(e: SyntheticEvent) {
    e.stopPropagation();
}
