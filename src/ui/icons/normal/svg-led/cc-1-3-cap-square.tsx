import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-cap3.svg
export function IconCap_3_Square({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames(className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <rect x={4} y={3} width={16} height={18} fill="currentColor" />
            <rect x={10} y={10} width={4} height={4} fill="#000" />
            <line x1={11.99} y1={12} x2={20.01} y2={12} fill="none" stroke="#000" strokeMiterlimit={10} />
        </svg>
    );
}
