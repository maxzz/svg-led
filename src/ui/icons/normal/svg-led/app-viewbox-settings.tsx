import { type HTMLAttributes, type SVGProps } from "react"; // https://icon-sets.iconify.design/?query=Grid&search-page=1 et:grid https://icon-sets.iconify.design/et/grid/
import { classNames } from "@/utils/classnames";

// Source: src/assets/icons/grid.svg
export function IconViewBoxSettings({ className, title, ...rest }: HTMLAttributes<SVGSVGElement> & SVGProps<SVGSVGElement>) {
    return (
        <svg className={classNames("fill-current", className)} viewBox="0 0 24 24" {...rest}>
            {title && <title>{title}</title>}
            <path d="M20.938 8.563 A0.344 0.344 0 0 0 20.938 7.875 L15.781 7.875 L15.781 2.719 A0.344 0.344 0 0 0 15.094 2.719 L15.094 7.875 L8.906 7.875 L8.906 2.719 A0.344 0.344 0 0 0 8.219 2.719 L8.219 7.875 L3.063 7.875 A0.344 0.344 0 0 0 3.063 8.563 L8.219 8.563 L8.219 14.75 L3.063 14.75 A0.344 0.344 0 0 0 3.063 15.438 L8.219 15.438 L8.219 21.281 A0.344 0.344 0 0 0 8.906 21.281 L8.906 15.438 L15.094 15.438 L15.094 21.281 A0.344 0.344 0 0 0 15.781 21.281 L15.781 15.438 L20.938 15.438 A0.344 0.344 0 0 0 20.938 14.75 L15.781 14.75 L15.781 8.563 Z M15.094 14.75 L8.906 14.75 L8.906 8.563 L15.094 8.563 Z" />
            <path d="M22.656 21.969 L22.656 2.031 C22.656 1.463 22.194 1 21.625 1 L2.375 1 C1.806 1 1.344 1.463 1.344 2.031 L1.344 21.969 C1.344 22.537 1.806 23 2.375 23 L21.625 23 C22.194 23 22.656 22.537 22.656 21.969 M2.031 21.969 L2.031 2.031 A0.344 0.344 0 0 1 2.375 1.688 L21.625 1.688 A0.344 0.344 0 0 1 21.969 2.031 L21.969 21.969 A0.344 0.344 0 0 1 21.625 22.313 L2.375 22.313 A0.344 0.344 0 0 1 2.031 21.969" />
        </svg>
    );
}
