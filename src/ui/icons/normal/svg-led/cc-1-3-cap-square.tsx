import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-cap3.svg
export function IconCap_3_Square({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <rect x={4} y={3} width={16} height={18} className="fill-cc-sample-background" />
            <rect x={10} y={10} width={4} height={4} className="fill-cc-sample-line" />
            <line x1={11.99} y1={12} x2={20.01} y2={12} className="stroke-cc-sample-line [stroke-miterlimit:10]" />
        </svg>
    );
}
