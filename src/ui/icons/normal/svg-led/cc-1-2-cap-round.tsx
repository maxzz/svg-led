import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-cap2.svg
export function IconCap_2_Round({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M20.03,21h-8.01c-4.43,0-8.01-4.03-8.01-9S7.59,3,12.01,3h8.01v18Z" className="fill-cc-sample-background stroke-cc-sample-stroke" />
            <rect x={10} y={10} width={4} height={4} className="fill-cc-thin-line" />
            <line x1={11.99} y1={12} x2={20.01} y2={12} className="stroke-cc-thin-line [stroke-miterlimit:10]" />
        </svg>
    );
}
