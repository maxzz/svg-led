import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

export function IconAlignCenter({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <defs>
                <mask id="stroke-align-center-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={24} height={24}>
                    <rect width={24} height={24} fill="#fff" />
                    <path d="M8 7V16H17" fill="none" stroke="#000" strokeWidth={1} />
                    <circle cx={8} cy={16} r={1.5} fill="#000" />
                </mask>
            </defs>
            <path d="M8 7V16H17" strokeWidth={4} strokeLinejoin="miter" strokeLinecap="butt" mask="url(#stroke-align-center-mask)" />
        </svg>
    );
}
