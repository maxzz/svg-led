import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-cap1.svg
export function IconCap_1_Butt({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <rect x={7} y={3} width={13} height={18} className="fill-current stroke-none" />
            <rect x={4} y={9} width={6} height={6} className="fill-current stroke-none" />
            <rect x={5} y={10} width={4} height={4} className="fill-current stroke-none" />
            <line x1={7} y1={12} x2={20} y2={12} className="stroke-current [stroke-miterlimit:10]" />
        </svg>
    );
}
