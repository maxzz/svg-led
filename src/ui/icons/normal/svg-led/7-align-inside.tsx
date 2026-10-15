import { type HTMLAttributes, type SVGProps } from "react";
import { classNames } from "@/utils";

export function IconAlignInside({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-none stroke-current", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <rect x={8} y={8} width={8} height={8} strokeWidth={1} opacity={0.5} />
            <rect x={9} y={9} width={6} height={6} strokeWidth={2} />
        </svg>
    );
}
