import { type ImgHTMLAttributes, ViewTransition } from "react";
import { classNames } from "@/utils";
import appLogoUrl from "@/assets/app-logo.svg";
import { APP_NAME } from "./a-ui-app-page";

/**
 * Temporary app logo. The same component is rendered on the Welcome page (large)
 * and in the main page header (small); the shared `name` makes React morph one into the other.
 * Only one mounted page may render it at a time: duplicate view-transition names abort the transition.
 */
export function AppLogo(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <ViewTransition name={APP_LOGO_VT_NAME} share="vt-logo-share">
            <AppLogoImage {...props} />
        </ViewTransition>
    );
}

const APP_LOGO_VT_NAME = "app-logo";

/** The logo artwork without a view transition, for decorative copies. */
export function AppLogoImage({ className, alt = `${APP_NAME} logo`, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img src={appLogoUrl} alt={alt} draggable={false} className={classNames("select-none object-contain", className)} {...rest} />
    );
}
