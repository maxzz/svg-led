import { type ComponentType, useState } from "react";
import { useAtom } from "jotai";
import { TabSelect } from "@/ui/local-ui/5-tab-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { isOpenOptionsDialogAtom } from "./9-types-options";
import { Tab_Monaco } from "./1-tab-monaco";
import { Tab_General } from "./2-tab-general";

type OptionsTabId = 'monaco' | 'general';

const optionsTabs: { id: OptionsTabId; label: string; Panel: ComponentType; }[] = [
    { id: 'monaco', label: 'Monaco editor', Panel: Tab_Monaco },
    { id: 'general', label: 'General', Panel: Tab_General },
];

export function OptionsDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenOptionsDialogAtom);
    const [tabId, setTabId] = useState<OptionsTabId>(optionsTabs[0].id);

    const activeTab = optionsTabs.find((item) => item.id === tabId) ?? optionsTabs[0];
    const Panel = activeTab.Panel;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="p-0! max-w-none! w-[min(40rem,calc(100vw-2rem))]! h-[min(28rem,calc(100vh-4rem))] text-xs overflow-hidden flex flex-col gap-0" modal>
                <DialogHeader className="px-4 py-3 text-left border-b gap-0">
                    <DialogTitle className="text-sm">
                        Options
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Application settings
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex flex-1 gap-0 overflow-hidden">
                    <TabSelect<OptionsTabId>
                        aria-label="Options"
                        className="shrink-0 min-h-0 w-44 bg-muted/30 border-r overflow-y-auto"
                        items={optionsTabs.map((item) => ({ value: item.id, label: item.label }))}
                        orientation="vertical"
                        value={activeTab.id}
                        onValueChange={setTabId}
                    />

                    <div className="min-w-0 min-h-0 flex-1 overflow-y-auto px-4 py-3">
                        <Panel />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
