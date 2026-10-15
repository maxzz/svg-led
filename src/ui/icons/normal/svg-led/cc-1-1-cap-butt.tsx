import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-cap1.svg
export function IconCap_1_Butt({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames(className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <rect x={7} y={3} width={13} height={18} fill="currentColor" />
            <rect x={4} y={9} width={6} height={6} fill="currentColor" />
            <rect x={5} y={10} width={4} height={4} fill="#000" />
            <line x1={7} y1={12} x2={20} y2={12} fill="none" stroke="#000" strokeMiterlimit={10} />
        </svg>
    );
}
