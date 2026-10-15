import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-align1.svg
export function IconAlignCenter({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames(className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <polygon points="20 11 20 19 4 19.01 4 3.01 12 3 12 11 20 11" fill="currentColor" />
            <rect x={6.5} y={12.5} width={4} height={4} transform="translate(-6 23) rotate(-90)" fill="#000" />
            <line x1={9} y1={14.5} x2={20} y2={14.5} fill="none" stroke="#000" strokeMiterlimit={10} />
            <line x1={8.5} y1={14.19} x2={8.5} y2={3} fill="none" stroke="#000" strokeMiterlimit={10} />
        </svg>
    );
}
