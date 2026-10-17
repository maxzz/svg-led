import { type HTMLAttributes, type SVGProps } from "react";

// Center the selection horizontally
export function IconAlign_1_2_CenterH({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
            {title && <title>{title}</title>}
            <line x1={12} y1={3} x2={12} y2={21} />
            <rect x={5} y={6} width={14} height={4} rx={1} />
            <rect x={8} y={14} width={8} height={4} rx={1} />
        </svg>
    );
}
