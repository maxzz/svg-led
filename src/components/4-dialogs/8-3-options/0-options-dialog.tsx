import { useId } from "react";
import { useAtom } from "jotai";
import { useSnapshot } from "valtio";
import { appSettings, WelcomeTransition } from "@/store/1-ui-settings";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { Label } from "@/ui/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/shadcn/select";
import { isOpenOptionsDialogAtom } from "./9-types-options";

export function OptionsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenOptionsDialogAtom);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-sm! gap-0!" modal>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Options
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Application settings
                    </DialogDescription>
                </DialogHeader>

                <div className="px-4 py-4 flex flex-col gap-4">
                    <WelcomeTransitionSelect />
                </div>
            </DialogContent>
        </Dialog>
    );
}

function WelcomeTransitionSelect() {
    const { welcomeTransition } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={id}>
                Welcome page transition
            </Label>

            <Select value={welcomeTransition} onValueChange={(value) => { appSettings.welcomeTransition = value as WelcomeTransition; }}>
                <SelectTrigger id={id} className="min-w-36" size="sm">
                    <SelectValue />
                </SelectTrigger>

                <SelectContent position="popper" align="end">
                    {TRANSITION_ITEMS.map(
                        ([label, value]) => (
                            <SelectItem value={value} key={value}>
                                {label}
                            </SelectItem>
                        )
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}

const TRANSITION_ITEMS: readonly (readonly [label: string, value: WelcomeTransition])[] = [
    ["Split into quarters", WelcomeTransition.quadrants],
    ["Sliding doors", WelcomeTransition.doors],
];
