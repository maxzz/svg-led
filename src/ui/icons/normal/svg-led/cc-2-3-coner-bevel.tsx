import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-corner3.svg
export function IconCorner_3_Bevel({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <polygon points="21 3 21 14 14 14 14 21 3 21 3 10.19 10.19 3 21 3" className="fill-cc-sample-background" />
            <rect x={7.5} y={7.5} width={4} height={4} className="fill-cc-sample-line" />
            <line x1={9.5} y1={10} x2={9.5} y2={21} className="stroke-cc-sample-line [stroke-miterlimit:10]" />
            <line x1={9.5} y1={9.5} x2={21.01} y2={9.5} className="stroke-cc-sample-line [stroke-miterlimit:10]" />
        </svg>
    );
}
