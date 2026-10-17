import { type HTMLAttributes, type SVGProps } from "react";

// Align the selection to its right edge
export function IconAlign_1_3_Right({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
            {title && <title>{title}</title>}
            <line x1={21} y1={3} x2={21} y2={21} />
            <rect x={5} y={6} width={12} height={4} rx={1} />
            <rect x={10} y={14} width={7} height={4} rx={1} />
        </svg>
    );
}
