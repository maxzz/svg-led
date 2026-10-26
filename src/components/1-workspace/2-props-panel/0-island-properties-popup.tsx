import { useAtomValue, useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { cn } from "@/utils/classnames";
import { ScrollArea } from "@/ui/shadcn/scroll-area";
import { appSettings } from "@/store/1-ui-settings";
import { ChevronDown, ChevronUp, Pin } from "lucide-react";
import { SelectionProperties, selectionTitle, useSelectedNodes } from "./3-selection-properties";
import { ToolProperties } from "./4-tool-properties";
import { isPropertiesCollapsedAtom, propertiesModeAtom, togglePropertiesCollapsedAtom } from "./9-atoms-properties-popup";

/** Docked under the main menu; content depends on the selection and the active tool. Hidden when there is nothing to show, unless pinned. */
export function Island_PropertiesPopup() {
    const mode = useAtomValue(propertiesModeAtom);
    const collapsed = useAtomValue(isPropertiesCollapsedAtom);
    const toggle = useSetAtom(togglePropertiesCollapsedAtom);
    const { prefs } = useSnapshot(appSettings);
    const pinned = prefs.pinProperties;
    const { nodes } = useSelectedNodes();

    if (!mode && !pinned) {
        return null;
    }

    const title = mode === 'tool'
        ? 'Tool style'
        : (mode === 'selection' && selectionTitle(nodes)) || 'Properties';

    return (
        <div className="w-50 max-h-[calc(100dvh-8rem)] text-xs text-foreground bg-background ring-1 ring-foreground/10 rounded-lg shadow-md overflow-hidden flex flex-col pointer-events-auto">
            <div className="shrink-0 h-8 flex items-center">
                <button className="grow min-w-0 px-3 h-8 font-medium text-ui text-muted-foreground hover:text-foreground flex items-center justify-between" onClick={toggle} type="button">
                    <span className="truncate">{title}</span>
                    {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                </button>

                <button
                    className={cn("shrink-0 mr-1.5 size-5 flex items-center justify-center rounded", pinned ? "text-(--editor-accent) bg-muted" : "text-muted-foreground hover:text-foreground")}
                    title={pinned ? "Unpin panel" : "Pin panel on screen"}
                    aria-pressed={pinned}
                    onClick={() => { appSettings.prefs.pinProperties = !pinned; }}
                    type="button"
                >
                    <Pin className={cn("size-3", pinned && "fill-current")} />
                </button>
            </div>

            <ScrollArea fixedWidth viewportClassName="max-h-[calc(100dvh-10rem)]" className={cn(collapsed && "hidden")}>
                <div className="pl-2 pr-2 pt-1 pb-3 flex flex-col gap-3">
                    {mode === 'selection' && <SelectionProperties />}
                    {mode === 'tool' && <ToolProperties />}
                    {!mode && <div className="pl-4 select-none text-muted-foreground">Nothing selected</div>}
                </div>
            </ScrollArea>
        </div>
    );
}
