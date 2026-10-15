import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

export function IconJoinBevel({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <defs>
                <mask id="stroke-join-bevel-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={24} height={24}>
                    <rect width={24} height={24} fill="#fff" />
                    <path d="M7 17V7H17" fill="none" stroke="#000" strokeWidth={1} />
                    <circle cx={7} cy={7} r={1.5} fill="#000" />
                </mask>
            </defs>
            <path d="M7 17V7H17" strokeWidth={5} strokeLinejoin="bevel" strokeLinecap="butt" mask="url(#stroke-join-bevel-mask)" />
        </svg>
    );
}
