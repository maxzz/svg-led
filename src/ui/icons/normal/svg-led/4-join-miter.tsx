import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

export function IconJoinMiter({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M8 17V8h8" strokeWidth={2} strokeLinejoin="miter" />
        </svg>
    );
}
