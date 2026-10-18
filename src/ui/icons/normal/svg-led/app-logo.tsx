import { type HTMLAttributes, type SVGProps } from "react"; // Source: src/assets/app-logo.svg
import { classNames } from "@/utils";

export function IconAppLogo({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("size-4 stroke-[1.5px] stroke-current fill-none", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M12 10.84 L12.34 1 L21.78 10.84 L12.54 14.6 L18.04 10.84 L12 23 L5.96 10.84 L11.46 14.6 L2.22 10.84 L11.66 1 Z" />
        </svg>
    );
}
