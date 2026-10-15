import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-align2.svg
export function IconAlign_2_Inside({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <polygon points="20 11 20 18.99 4 18.99 4.02 2.98 12 2.99 11.99 11.01 20 11" className="fill-cc-sample-background" />
            <rect x={2.5} y={14.5} width={6} height={6} transform="translate(-12 23) rotate(-90)" className="fill-cc-sample-outline" />
            <rect x={3.5} y={15.5} width={4} height={4} transform="translate(-12 23) rotate(-90)" className="fill-cc-sample-line" />
            <rect x={-1.5} y={10} width={14} height={0} transform="translate(-4.5 15.5) rotate(-90)" className="fill-none stroke-cc-sample-line" />
            <line x1={6} y1={17.5} x2={20} y2={17.5} className="stroke-cc-sample-line [stroke-miterlimit:10]" />
            <line x1={5.5} y1={17.24} x2={5.5} y2={3} className="stroke-cc-sample-line [stroke-miterlimit:10]" />
        </svg>
    );
}
