import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { docState, setRootAttr, setViewBox, useDocSnapshot } from "@/store/3-document";
import { runCommandAtom } from "@/commands";
import { Section, optionButtonClasses } from "./2-controls/2-section";
import { NumberField } from "./2-controls/3-number-field";

/** viewBox, width and height of the root <svg> when nothing is selected */
export function DocumentProperties() {
    const doc = useDocSnapshot();
    const { fileName } = useSnapshot(docState);
    const run = useSetAtom(runCommandAtom);
    const vb = doc.viewBox;

    const setVb = (key: 'x' | 'y' | 'width' | 'height', value: number) => {
        const base = vb ?? { x: 0, y: 0, width: 512, height: 512 };
        setViewBox({ ...base, [key]: value });
    };

    return (<>
        <div className="select-none text-xs font-medium truncate" title={fileName}>{fileName}</div>

        <Section title="ViewBox">
            {vb
                ? (
                    <div className="grid grid-cols-2 gap-1">
                        <NumberField label="X" value={vb.x} onChange={(v) => setVb('x', v)} />
                        <NumberField label="Y" value={vb.y} onChange={(v) => setVb('y', v)} />
                        <NumberField label="W" value={vb.width} min={0.01} onChange={(v) => setVb('width', v)} />
                        <NumberField label="H" value={vb.height} min={0.01} onChange={(v) => setVb('height', v)} />
                    </div>
                )
                : <div className="text-muted-foreground">The document has no viewBox.</div>
            }
            <div className="flex flex-wrap gap-1">
                <button className={optionButtonClasses} onClick={() => run('viewbox.toContent')} type="button">Fit to content</button>
                <button className={optionButtonClasses} onClick={() => run('viewbox.settings')} type="button">Settings...</button>
            </div>
        </Section>

        <Section title="Size attributes">
            <div className="grid grid-cols-2 gap-1">
                <SizeField label="W" name="width" value={doc.rootAttrs.width} />
                <SizeField label="H" name="height" value={doc.rootAttrs.height} />
            </div>
        </Section>
    </>);
}

/** width/height may hold units ("24px", "100%"), so this is a text field; empty removes the attribute */
function SizeField({ label, name, value }: { label: string; name: string; value: string | undefined; }) {
    return (
        <label className="px-1.5 h-7 min-w-0 text-xs bg-muted/60 focus-within:ring-1 focus-within:ring-(--editor-accent) rounded-md flex items-center gap-1">
            <span className="shrink-0 select-none text-[10px] text-muted-foreground">{label}</span>
            <input
                className="w-full min-w-0 tabular-nums bg-transparent outline-none"
                defaultValue={value ?? ''}
                placeholder="auto"
                onBlur={(e) => { const v = e.currentTarget.value.trim(); v !== (value ?? '') && setRootAttr(name, v || undefined); }}
                onKeyDown={(e) => { e.key === 'Enter' && e.currentTarget.blur(); }}
                key={value ?? ''}
            />
        </label>
    );
}
