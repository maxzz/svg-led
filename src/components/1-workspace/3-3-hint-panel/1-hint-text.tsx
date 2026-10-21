import { Fragment } from "react";
import { displayShortcut } from "@/commands";
import { hintParts } from "@/tools";
import { Kbd } from "@/ui/local-ui/9-kbd";

/** Text with its [Key] parts drawn as keycaps, e.g. "Click to add · [Shift] add" */
export function HintText({ text }: { text: string; }) {
    return (
        <>
            {hintParts(text).map(
                (part, i) => ("key" in part
                    ? <Kbd className="mx-0.5" key={i}>{displayShortcut(part.key)}</Kbd>
                    : <Fragment key={i}>{part.text}</Fragment>)
            )}
        </>
    );
}
