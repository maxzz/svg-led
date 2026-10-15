import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-corner1.svg
export function IconCorner_1_Miter({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames(className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <polygon points="21 3 21 14 14 14 14 21 3 21 3 3 21 3" fill="currentColor" />
            <rect x={7.5} y={7.5} width={4} height={4} fill="#000" />
            <line x1={9.5} y1={10} x2={9.5} y2={21} fill="none" stroke="#000" strokeMiterlimit={10} />
            <line x1={9.5} y1={9.5} x2={21.01} y2={9.5} fill="none" stroke="#000" strokeMiterlimit={10} />
        </svg>
    );
}
