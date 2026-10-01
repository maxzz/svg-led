import { type HTMLAttributes, type ReactNode, useId } from "react";
import { useSetAtom } from "jotai";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { appSettings } from "@/store/1-ui-settings";
import { Button } from "@/ui/shadcn/button";
import { Checkbox } from "@/ui/shadcn/checkbox";
import { Label } from "@/ui/shadcn/label";

import { MainPage, APP_DESCRIPTION, APP_NAME, navigateToPageAtom } from "./a-ui-app-page";
import { Section3_Footer } from "@/components/3-footer";

/** The Welcome page layout, rendered by the page itself and by each of its piece copies. */
export function WelcomeContent({ logo, className, ...rest }: { logo: ReactNode; } & HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={classNames("min-h-dvh text-foreground welcome-bkg grid grid-rows-[1fr_auto_auto]", className)} {...rest}>

            <div className="px-6 pt-12 pb-8 text-center flex flex-col items-center justify-center gap-6">
                {logo}

                <div className="flex flex-col items-center gap-3">
                    <h1 className="text-4xl font-heading font-semibold tracking-tight">
                        {APP_NAME}
                    </h1>
                    <p className="max-w-md text-sm text-muted-foreground leading-relaxed">
                        {APP_DESCRIPTION}
                    </p>
                </div>

                <EnterButton />
            </div>

            <DontShowAgainCheckbox />

            <Section3_Footer className="welcome-footer" />
        </div>
    );
}

export const welcomeLogoClasses = "size-36 drop-shadow-xl";

function EnterButton() {
    const navigate = useSetAtom(navigateToPageAtom);

    // Not transition-all: the page toggles `invisible` around the view transition, and a transitioned visibility blinks the button for a frame
    return (
        <Button className="px-6 hover:bg-primary/90 transition-[color,background-color,box-shadow,translate] rounded-full shadow-md" size="lg" onClick={() => navigate(MainPage.main)} type="button">
            Get started
        </Button>
    );
}

function DontShowAgainCheckbox() {
    const { showWelcome } = useSnapshot(appSettings);
    const id = useId();

    return (
        <div className="mx-auto pb-2 flex items-center gap-1">
            <Checkbox
                className="size-6 bg-background/60 scale-[0.65]"
                id={id}
                checked={!showWelcome}
                onCheckedChange={(checked) => { appSettings.showWelcome = checked !== true; }}
            />
            <Label htmlFor={id} className="font-normal text-[0.65rem] text-muted-foreground cursor-pointer">
                Do not show the Welcome page at startup
            </Label>
        </div>
    );
}
