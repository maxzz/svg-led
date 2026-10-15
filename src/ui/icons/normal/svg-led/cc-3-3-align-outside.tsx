import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

// Source: src/assets/icons/SVG/cc-align3.svg
export function IconAlign_3_Outside({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames(className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <polygon points="20.99 12 20.99 20 4 20 4 3 11.99 3 11.99 12 20.99 12" className="fill-current" />
            <rect x={8.5} y={12.01} width={3.49} height={3.49} transform="translate(-3.51 24) rotate(-90)" className="fill-black" />
            <line x1={11} y1={13.5} x2={21} y2={13.5} className="fill-none stroke-black [stroke-miterlimit:10]" />
            <line x1={10.5} y1={13.5} x2={10.5} y2={3} className="fill-none stroke-black [stroke-miterlimit:10]" />
        </svg>
    );
}
