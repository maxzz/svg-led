import { type HTMLAttributes, type SVGProps } from "react";

// Distribute the selection with equal vertical gaps
export function IconAlign_3_2_DistributeV({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
            {title && <title>{title}</title>}
            <line x1={3} y1={3} x2={21} y2={3} />
            <line x1={3} y1={21} x2={21} y2={21} />
            <rect x={7} y={9} width={10} height={6} rx={1} />
        </svg>
    );
}
