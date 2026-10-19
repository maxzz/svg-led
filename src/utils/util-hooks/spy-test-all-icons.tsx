import { type HTMLAttributes, useEffect, useState } from "react"; // 10.19.26
import { classNames } from "@/utils";
import * as allIcons from "@/ui/icons/normal";

type AllIcons = Record<string, unknown>;

export function SpyTestAllIcons({ allIcons, className, ...rest }: { allIcons: AllIcons; } & HTMLAttributes<HTMLDivElement>) {
    const [printOnce, setPrintOnce] = useState(false);
    
    useEffect(
        () => {
            setPrintOnce(
                (v) => {
                    if (!v) {
                        print_IconsLocation(allIcons);
                        return !v;
                    }
                    return v;
                }
            );
        },
        [printOnce, allIcons]);

    const icons = Object.entries(allIcons).filter((entry): entry is [string, IconComponent] => isIconComponent(entry[1]));

    return (
        <div className={classNames("flex flex-wrap gap-2", className)} {...rest}>
            {icons.map(
                ([name, Icon]) => (
                    <div className="flex flex-col items-center" key={name}>
                        <div className="border-sky-500 border rounded" title={name}>
                            <Icon className="size-6" />
                        </div>
                    </div>
                ))
            }
        </div>
    );
}

//---------------------------------------------------------------------------

// Keep only exports that can be rendered as components (functions, or objects like forwardRef/memo).
type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

// Keep only exports that can be rendered as components (functions, or objects like forwardRef/memo).
function isIconComponent(value: unknown): value is IconComponent {
    return typeof value === "function" || (typeof value === "object" && value !== null);
}

//---------------------------------------------------------------------------

print_IconsLocation(allIcons);

function print_IconsLocation(allIcons: AllIcons) {
    // G: 'js get function location'
    // https://stackoverflow.com/questions/41146373/access-function-location-programmatically 'Access function location programmatically'
    // https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-getProperties 'Runtime.getProperties'
    // console.log(Runtime.getProperties(allIcons).map(({ name }) => name));

    // * icons sorted in alphabetical order
    // * can we use import.meta.url from bundler? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import.meta
    //   but it should be exposed from each file which is too much for this task
    // * or we can use plugin at build time to access file location, but that will be too much for this task

    const msg = 'Each icon has [[FunctionLocation]] property, but it is accessible from trace only (i.e. devtools-protocol), not from code.';
    const entries = Object.entries(allIcons).filter((entry): entry is [string, IconComponent] => isIconComponent(entry[1]));

    console.groupCollapsed(`%c${msg}`, 'font-size: 0.55rem');

    const nameWidth = Math.max(0, ...entries.map(([name]) => name.length));
    entries.forEach(([name, value]) => {
        console.log(`%c${name.padEnd(nameWidth)}  %O`, 'font-family: monospace; font-size: 10px; color: #004390; ', value);
    });

    console.groupEnd();

    console.log(`%c${msg}`, 'font-size: 0.55rem', { entries });
}
