import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-align2.svg
export function IconAlign_2_Inside({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames(className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <polygon points="20 11 20 18.99 4 18.99 4.02 2.98 12 2.99 11.99 11.01 20 11" fill="currentColor" />
            <rect x={2.5} y={14.5} width={6} height={6} transform="translate(-12 23) rotate(-90)" fill="currentColor" />
            <rect x={3.5} y={15.5} width={4} height={4} transform="translate(-12 23) rotate(-90)" fill="#000" />
            <rect x={-1.5} y={10} width={14} height={0} transform="translate(-4.5 15.5) rotate(-90)" fill="none" stroke="#000" />
            <line x1={6} y1={17.5} x2={20} y2={17.5} fill="none" stroke="#000" strokeMiterlimit={10} />
            <line x1={5.5} y1={17.24} x2={5.5} y2={3} fill="none" stroke="#000" strokeMiterlimit={10} />
        </svg>
    );
}
