import { ViewTransition } from "react";
import { useSnapshot } from "valtio";
import { classNames } from "@/utils";
import { appSettings, type WelcomeTransition } from "@/store/1-ui-settings";
import { welcomeLogoClasses, WelcomeContent } from "./1-welcome-content";
import { AppLogoImage } from "./2-app-logo";
import { TRANSITION_TYPE_TO_MAIN, TRANSITION_TYPE_TO_WELCOME } from "./a-ui-app-page";

/**
 * Inert copies of the Welcome page, each clipped to one piece of it: four quarters or two door halves,
 * depending on the welcomeTransition setting. Every piece is its own <ViewTransition>, so it gets its own
 * snapshot and can move out (Welcome -> Main) or back in (Main -> Welcome); see c-view-transitions*.css.
 * The logo in the copies is an invisible placeholder: the real one morphs separately.
 * The pieces must stay the outermost DOM nodes of the page; see WelcomePage.
 */
export function WelcomePieces({ onJoin }: { onJoin: () => void; }) {
    const { welcomeTransition } = useSnapshot(appSettings);
    const { vtClass, pieces } = PIECE_SETS[welcomeTransition];

    return pieces.map(
        ({ side, anchor, frame, content }) => (
            <ViewTransition
                key={side}
                enter={{ [TRANSITION_TYPE_TO_WELCOME]: `${vtClass} ${vtClass}-in-${side}`, default: "none" }}
                exit={{ [TRANSITION_TYPE_TO_MAIN]: `${vtClass} ${vtClass}-out-${side}`, default: "none" }}
                onEnter={() => onJoin} // the returned cleanup runs when the view transition finishes
            >
                <div className={classNames("absolute overflow-hidden", anchor, frame)} aria-hidden>
                    <div className={classNames("absolute", anchor, content)}>
                        <WelcomeContent className="h-full" logo={<AppLogoImage className={classNames(welcomeLogoClasses, "invisible")} />} inert />
                    </div>
                </div>
            </ViewTransition>
        )
    );
}

type PieceSet = {
    vtClass: string;                        // view-transition-class prefix; `-in-<side>`/`-out-<side>` select the direction
    pieces: readonly {
        side: string;
        anchor: string;                     // corner or edge the piece and its page copy are pinned to
        frame: string;                      // size of the visible piece, as a fraction of the page
        content: string;                    // size of the page copy inside the piece, so it spans the whole page
    }[];
};

const PIECE_SETS: Record<WelcomeTransition, PieceSet> = {
    quadrants: {
        vtClass: "vt-welcome-quad",
        pieces: [
            { side: "tl", anchor: "top-0 left-0", frame: "w-1/2 h-1/2", content: "w-[200%] h-[200%]" },
            { side: "tr", anchor: "top-0 right-0", frame: "w-1/2 h-1/2", content: "w-[200%] h-[200%]" },
            { side: "br", anchor: "right-0 bottom-0", frame: "w-1/2 h-1/2", content: "w-[200%] h-[200%]" },
            { side: "bl", anchor: "bottom-0 left-0", frame: "w-1/2 h-1/2", content: "w-[200%] h-[200%]" },
        ],
    },
    doors: {
        vtClass: "vt-welcome-door",
        pieces: [
            { side: "l", anchor: "top-0 left-0", frame: "w-1/2 h-full", content: "w-[200%] h-full" },
            { side: "r", anchor: "top-0 right-0", frame: "w-1/2 h-full", content: "w-[200%] h-full" },
        ],
    },
};
