import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Command, CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/ui/shadcn/command";
import { foundItemsAtom, isOpenFindOnCanvasAtom, selectFoundItemAtom } from "./9-types-find-on-canvas";

export function FindOnCanvasDialog() {
    const [isOpen, setIsOpen] = useAtom(isOpenFindOnCanvasAtom);
    return (
        <CommandDialog title="Find on canvas" description="Search elements by tag, id, class or color" open={isOpen} onOpenChange={setIsOpen}>
            {isOpen && <FindBody />}
        </CommandDialog>
    );
}

function FindBody() {
    const items = useAtomValue(foundItemsAtom);
    const select = useSetAtom(selectFoundItemAtom);

    return (
        <Command>
            <CommandInput placeholder="Find by tag, #id, .class or color..." />
            <CommandList className="max-h-[60vh]">
                <CommandEmpty>Nothing found.</CommandEmpty>
                {items.map((item) => (
                    <CommandItem value={`${item.title} ${item.details} ${item.id}`} onSelect={() => select(item.id)} key={item.id}>
                        <span style={{ paddingLeft: item.depth * 12 }} className="text-xs font-mono">{item.title}</span>
                        <span className="ml-auto text-xs text-muted-foreground truncate">{item.details}</span>
                    </CommandItem>
                ))}
            </CommandList>
        </Command>
    );
}
