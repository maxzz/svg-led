import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-corner2.svg
export function IconCorner_2_Round({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M21.02,3v11h-7v7H3.02v-8.52C3.35,7.19,7.7,3,13,3h8.02Z" className="fill-cc-sample-background" />
            <rect x={7.51} y={7.5} width={4} height={4} className="fill-cc-sample-line" />
            <line x1={9.51} y1={10} x2={9.51} y2={21} className="stroke-cc-sample-line [stroke-miterlimit:10]" />
            <line x1={9.5} y1={9.5} x2={21.01} y2={9.5} className="stroke-cc-sample-line [stroke-miterlimit:10]" />
        </svg>
    );
}
