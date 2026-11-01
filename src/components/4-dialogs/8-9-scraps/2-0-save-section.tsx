import { useId } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { topLevelIds } from "@/store/3-document";
import { selectionAtom } from "@/store/4-editor";
import { classNames } from "@/utils";
import { doAsyncExecuteConfirmDialogAtom } from "../8-1-confirmation/9-types-confirmation";
import { getConfirmOverwriteScrapMessages } from "../8-1-confirmation/8-confirmation-ui-messages";
import { type ScrapSaveScope, doSaveScrapAtom, isOpenScrapsDialogAtom, scrapsAtom, scrapsOptionsAtom } from "./9-types-scraps";

export function SaveSection({ nameDraft, setNameDraft }: { nameDraft: string; setNameDraft: (name: string) => void; }) {
    const scraps = useAtomValue(scrapsAtom);
    const selectedCount = useAtomValue(selectionAtom).length;
    const allCount = topLevelIds().length;
    const [options, setOptions] = useAtom(scrapsOptionsAtom);
    const doSave = useSetAtom(doSaveScrapAtom);
    const doAsyncExecuteConfirmDialog = useSetAtom(doAsyncExecuteConfirmDialogAtom);
    const setIsOpen = useSetAtom(isOpenScrapsDialogAtom);
    const nameId = useId();

    const scope: ScrapSaveScope = options.saveScope === 'selection' && selectedCount ? 'selection' : 'all';
    const name = nameDraft.trim();
    const existing = scraps.some((s) => s.name === name);
    const count = scope === 'selection' ? selectedCount : allCount;

    const scopes = [
        { value: 'selection', label: `Selected (${selectedCount})`, disabled: !selectedCount },
        { value: 'all', label: `All (${allCount})` },
    ] as const;

    async function save() {
        if (!name || !count) {
            return;
        }
        if (existing && !await doAsyncExecuteConfirmDialog(getConfirmOverwriteScrapMessages(name))) {
            return;
        }
        doSave({ name, scope }) && setIsOpen(false);
    }

    return (
        <form className="pt-3 border-t flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <Label className="text-xs font-medium" htmlFor={nameId}>
                Save as scrap
            </Label>

            <Input
                className="h-8 text-xs"
                id={nameId}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.currentTarget.value)}
                placeholder="Scrap name"
                autoComplete="off"
            />

            <p className={classNames("h-3 text-[10px]", existing ? "text-orange-700" : "text-muted-foreground")}>
                {existing ? 'A scrap with this name exists; saving overwrites it after confirmation.' : 'Click a saved scrap to reuse its name.'}
            </p>

            <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                    Elements
                </span>
                <TabSelect<ScrapSaveScope>
                    className="p-0.5 bg-muted rounded-md"
                    itemClassName="py-1"
                    items={scopes}
                    value={scope}
                    onValueChange={(saveScope) => setOptions({ saveScope })}
                    orientation="horizontal"
                    aria-label="Elements to save"
                />
                <Button className="ml-auto" size="sm" type="submit" disabled={!name || !count}>
                    Save
                </Button>
            </div>
        </form>
    );
}
