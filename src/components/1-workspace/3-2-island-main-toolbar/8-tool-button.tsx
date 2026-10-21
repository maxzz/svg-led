import { useAtomValue, useSetAtom } from "jotai";
import { activeToolIdAtom, setActiveToolAtom } from "@/store/4-editor";
import { type ToolDef, toolShortcuts } from "@/tools";
import { islandButtonClasses } from "@/ui/local-ui/9-island";

export function ToolButton({ tool }: { tool: ToolDef; }) {
    const active = useAtomValue(activeToolIdAtom) === tool.id;
    const setTool = useSetAtom(setActiveToolAtom);
    const Icon = tool.icon;

    return (
        <button
            className={islandButtonClasses}
            data-active={active}
            title={`${tool.label} — ${toolShortcuts(tool).join(' or ')}`}
            aria-label={tool.label}
            onClick={() => setTool(tool.id)}
            type="button"
        >
            <Icon className="size-4" />
            <span className="absolute right-1 bottom-0.5 text-[8px] text-muted-foreground uppercase">
                {tool.shortcut}
            </span>
        </button>
    );
}
