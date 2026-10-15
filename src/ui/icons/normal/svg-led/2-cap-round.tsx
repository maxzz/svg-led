import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

export function IconCapRound({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M8 12h8" strokeWidth={2} strokeLinecap="round" />
            <path d="M8 6v12M16 6v12" strokeWidth={1} opacity={0.5} />
        </svg>
    );
}
