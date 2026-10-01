import { useSetAtom } from "jotai";
import { isOpenOptionsDialogAtom } from "@/components/4-dialogs/8-3-options/9-types-options";
import { Button } from "@/ui/shadcn/button";
import { IconSliders } from "@/ui/icons/normal";

export function ButtonOptions() {
    const setIsOpen = useSetAtom(isOpenOptionsDialogAtom);

    return (
        <Button
            className="size-6 rounded"
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            title="Options"
            type="button"
        >
            <IconSliders className="size-3.5" />
        </Button>
    );
}
