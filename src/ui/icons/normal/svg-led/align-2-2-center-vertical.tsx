import { type HTMLAttributes, type SVGProps } from "react";

// Center the selection vertically
export function IconAlign_2_2_CenterV({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
            {title && <title>{title}</title>}
            <line x1={3} y1={12} x2={21} y2={12} />
            <rect x={6} y={5} width={4} height={14} rx={1} />
            <rect x={14} y={8} width={4} height={8} rx={1} />
        </svg>
    );
}
