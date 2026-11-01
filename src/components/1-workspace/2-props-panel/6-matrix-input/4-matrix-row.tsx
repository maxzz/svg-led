import { type FocusEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { Check, CircleQuestionMark, Eraser } from "lucide-react";
import { cn } from "@/utils/classnames";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/shadcn/tooltip";
import { notice } from "@/ui/local-ui/7-toaster";
import { fieldInputClasses } from "../2-props-panel-controls/3-0-number-field";
import {
    type MatrixFieldState, applyMatrixAtom, clearMatrixInvalidAtom, commitMatrixTextAtom, matrixFieldAtom, removeMatrixAtom,
} from "./3-atoms-matrix-input";

//---------------------------------------------------------------------------
// The matrix row under Position and size. It is mounted from that section and reads the
// current selection itself, so it can be placed anywhere the selection should be edited.

const APPLY_TIP = "Apply the matrix to the selected elements. Their points are recalculated and the matrix is removed.";
const APPLY_DISABLED_TIP = "This element has no points the matrix can be written into.";
const REMOVE_TIP = "Remove the matrix and leave the points where they are.";
const ABOUT_TIP = "Transform matrix of the selection, a b c d e f. A point (x, y) moves to (a·x + c·y + e, b·x + d·y + f). An SVG transform such as rotate(45) is accepted too.";

/** Grid `gap-1` between the size fields and this row. */
const ROW_GAP = 4;
/** Room so the focus ring is not clipped by overflow-hidden. Offset by the same margin, so the gap stays ROW_GAP. */
const RING = 2;

export function MatrixRow() {
    const field = useAtomValue(matrixFieldAtom);

    return (
        <AnimatePresence initial={false}>
            {field.shown && (
                <motion.div
                    key="selection-matrix"
                    className="min-w-0 overflow-hidden col-span-2"
                    data-matrix-row
                    initial={{ height: 0, opacity: 0, marginTop: -ROW_GAP, paddingTop: 0, paddingBottom: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: -RING, paddingTop: RING, paddingBottom: RING }}
                    exit={{ height: 0, opacity: 0, marginTop: -ROW_GAP, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <TooltipProvider>
                        <div className="min-w-0 flex items-center gap-1">
                            <MatrixInput field={field} />
                            <ApplyButton canApply={field.canApply} />
                            <RemoveButton />
                        </div>
                    </TooltipProvider>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function MatrixInput({ field }: { field: MatrixFieldState }) {
    const commit = useSetAtom(commitMatrixTextAtom);
    const clearInvalid = useSetAtom(clearMatrixInvalidAtom);

    function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.currentTarget.blur();
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.currentTarget.value = field.text;
            clearInvalid();
            e.currentTarget.blur();
        }
    }

    function onBlur(e: FocusEvent<HTMLInputElement>) {
        if (commit(e.currentTarget.value) === "invalid") {
            warnInvalidMatrix(e.currentTarget.value);
        }
    }

    return (
        <div
            className={cn(
                "grow px-1.5 h-5.5 min-w-0 text-xs bg-muted/60 rounded flex items-center gap-1",
                field.invalid ? "ring-1 ring-destructive" : "focus-within:ring-1 focus-within:ring-(--editor-accent)",
            )}
            data-invalid={field.invalid || undefined}
        >
            <input
                key={field.inputKey}
                className={cn(fieldInputClasses, "placeholder:text-muted-foreground")}
                defaultValue={field.text}
                placeholder={field.placeholder}
                aria-label="Transform matrix"
                aria-invalid={field.invalid}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                data-matrix-input
                onChange={clearInvalid}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
            />
            <MatrixTip tip={ABOUT_TIP}>
                <button
                    className="shrink-0 size-4 text-muted-foreground hover:text-foreground rounded-full flex items-center justify-center cursor-help"
                    type="button"
                    aria-label="About the transform matrix"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <CircleQuestionMark className="size-3" />
                </button>
            </MatrixTip>
        </div>
    );
}

function ApplyButton({ canApply }: { canApply: boolean }) {
    const apply = useSetAtom(applyMatrixAtom);

    return (
        <MatrixTip tip={canApply ? APPLY_TIP : APPLY_DISABLED_TIP}>
            <span className="shrink-0 inline-flex">
                <button
                    className={cn(matrixButtonClasses, !canApply && "pointer-events-none")}
                    type="button"
                    aria-label="Apply matrix"
                    disabled={!canApply}
                    onClick={apply}
                >
                    <Check className="size-3.5" />
                </button>
            </span>
        </MatrixTip>
    );
}

function RemoveButton() {
    const remove = useSetAtom(removeMatrixAtom);

    // Keep the field from committing on the way to this button: Remove discards the matrix
    // rather than writing whatever is currently typed. Mouse down, not pointer down:
    // canceling pointerdown also cancels the click.
    function keepField(e: MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
    }

    return (
        <MatrixTip tip={REMOVE_TIP}>
            <span className="shrink-0 inline-flex">
                <button
                    className={matrixButtonClasses}
                    type="button"
                    aria-label="Remove matrix"
                    onMouseDown={keepField}
                    onClick={remove}
                >
                    <Eraser className="size-3.5" />
                </button>
            </span>
        </MatrixTip>
    );
}

function MatrixTip({ tip, children }: { tip: string; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                {children}
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4} className="whitespace-normal max-w-64 text-left leading-snug">
                {tip}
            </TooltipContent>
        </Tooltip>
    );
}

function warnInvalidMatrix(raw: string) {
    const shown = raw.trim() || "Empty input";
    notice.warning(
        <div className="flex flex-col gap-1">
            <div>
                <span className={warningSpanClasses}>{shown}</span> is not a valid matrix.
            </div>
            <div className="text-pretty leading-5 opacity-80">
                Use six numbers or an SVG transform, for example <span className={warningSpanClasses}>matrix(1 0 0 1 10 20)</span> or <span className={warningSpanClasses}>rotate(45)</span>.
            </div>
        </div>,
    );
}

const matrixButtonClasses = "\
shrink-0 \
size-5.5 \
text-foreground/80 \
bg-muted/60 \
hover:bg-muted \
disabled:opacity-40 \
rounded \
flex items-center justify-center \
cursor-pointer";

const warningSpanClasses = "px-1 bg-background/20 border border-background/40 rounded";
