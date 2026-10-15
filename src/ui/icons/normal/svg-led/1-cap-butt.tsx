import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

export function IconCapButt({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <defs>
                <mask id="stroke-cap-butt-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={24} height={24}>
                    <rect width={24} height={24} fill="#fff" />
                    <path d="M8 12H16" fill="none" stroke="#000" strokeWidth={1} />
                    <circle cx={8} cy={12} r={1.5} fill="#000" />
                </mask>
            </defs>
            <path d="M8 12H16" strokeWidth={6} strokeLinecap="butt" mask="url(#stroke-cap-butt-mask)" />
        </svg>
    );
}
