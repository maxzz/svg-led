import { type HTMLAttributes, type SVGProps } from "react";

// Distribute the selection with equal horizontal gaps
export function IconAlign_3_1_DistributeH({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
            {title && <title>{title}</title>}
            <line x1={3} y1={3} x2={3} y2={21} />
            <line x1={21} y1={3} x2={21} y2={21} />
            <rect x={9} y={7} width={6} height={10} rx={1} />
        </svg>
    );
}
