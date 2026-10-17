import { type HTMLAttributes, type SVGProps } from "react";

// Align the selection to its top edge
export function IconAlign_2_1_Top({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
            {title && <title>{title}</title>}
            <line x1={3} y1={3} x2={21} y2={3} />
            <rect x={6} y={7} width={4} height={12} rx={1} />
            <rect x={14} y={7} width={4} height={7} rx={1} />
        </svg>
    );
}
