import { type GroupNode } from "@/svg-core";
import { LayerRow } from "./0-all-layer-row";

/** Children of a group, the last one (topmost on the canvas) first */
export function GroupChildren({ group, count, depth, hiddenByParent, lockedByParent }: { group: GroupNode; count: number; depth: number; hiddenByParent: boolean; lockedByParent: boolean; }) {
    const rows = [];

    for (let i = count - 1; i >= 0; i--) {
        const child = group.children[i];
        child && rows.push(
            <LayerRow key={child.id} node={child} depth={depth} hiddenByParent={hiddenByParent} lockedByParent={lockedByParent} />
        );
    }

    return <>{rows}</>;
}
