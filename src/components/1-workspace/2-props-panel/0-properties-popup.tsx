import { useAtomValue, useSetAtom } from "jotai";
import { cn } from "@/utils/classnames";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SelectionProperties } from "./3-selection-properties";
import { ToolProperties } from "./4-tool-properties";
import { isPropertiesCollapsedAtom, propertiesModeAtom, togglePropertiesCollapsedAtom } from "./9-atoms-properties-popup";

const TITLES = { selection: 'Properties', tool: 'Tool style' } as const;

/** Docked under the main menu; content depends on the selection and the active tool. Hidden when there is nothing to show. */
export function PropertiesPopup() {
    const mode = useAtomValue(propertiesModeAtom);
    const collapsed = useAtomValue(isPropertiesCollapsedAtom);
    const toggle = useSetAtom(togglePropertiesCollapsedAtom);

    if (!mode) {
        return null;
    }

    return (
        <div className="w-50 max-h-[calc(100dvh-8rem)] text-xs text-foreground bg-background ring-1 ring-foreground/10 rounded-lg shadow-md overflow-hidden flex flex-col pointer-events-auto">
            <button className="shrink-0 px-3 h-8 font-medium text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-between" onClick={toggle} type="button">
                {TITLES[mode]}
                {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
            </button>

            <ScrollArea fixedWidth viewportClassName="max-h-[calc(100dvh-10rem)]" className={cn(collapsed && "hidden")}>
                <div className="px-3 pt-1 pb-3 flex flex-col gap-3">
                    {mode === 'selection' && <SelectionProperties />}
                    {mode === 'tool' && <ToolProperties />}
                </div>
            </ScrollArea>
        </div>
    );
}
