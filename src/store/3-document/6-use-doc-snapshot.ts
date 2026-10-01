import { useSnapshot } from "valtio";
import { type SvgDoc } from "@/svg-core";
import { docState } from "./1-doc-store";

/** Read-only document for rendering; re-renders on any document change (use for overlays and panels) */
export function useDocSnapshot(): SvgDoc {
    return useSnapshot(docState).doc as unknown as SvgDoc;
}
