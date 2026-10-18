import { useSetAtom } from "jotai";
import { CircleQuestionMark } from "lucide-react";
import { runCommandAtom } from "@/commands";
import { Island, islandButtonClasses } from "@/ui/local-ui/9-island";

export function Island_Help() {
    const run = useSetAtom(runCommandAtom);
    
    return (
        <Island className="pointer-events-auto">
            <button className={islandButtonClasses} title="Help — ?" onClick={() => run('help.shortcuts')} type="button">
                <CircleQuestionMark className="size-4" />
            </button>
        </Island>
    );
}
