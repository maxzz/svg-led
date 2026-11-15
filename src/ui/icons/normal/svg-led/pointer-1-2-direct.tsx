import { type HTMLAttributes, type SVGProps } from "react";

// Direct selection tool: the hollow arrow pointer (same shape as the direct selection cursor)
export function IconPointer_1_2_Direct({ title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...rest}>
            {title && <title>{title}</title>}
            <path d="M6 4 V20.4 L7 20.3 L11.4 15.5 L17.3 15.5 L17.1 14.9 L6.5 4.2 Z" />
        </svg>
    );
}
