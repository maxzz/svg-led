import { addTransitionType, startTransition } from 'react';
import { flushSync } from 'react-dom';
import { atom, getDefaultStore } from 'jotai';
import { appSettings } from '@/store/1-ui-settings';

/**
 * Transient page state lives in Jotai (not Valtio) on purpose:
 * Valtio's useSnapshot is built on useSyncExternalStore, whose updates are always
 * synchronous and never join a startTransition, so a Valtio-driven page switch
 * would not animate with <ViewTransition>. Jotai hooks are transition-compatible.
 */

export const MainPage = {
    welcome: 'welcome',
    main: 'main',
} as const;

export type MainPage = typeof MainPage[keyof typeof MainPage];

export const mainPageAtom = atom<MainPage>(appSettings.showWelcome ? MainPage.welcome : MainPage.main);

//---------------------------------------------------------------------------

/**
 * Navigate between pages inside a transition so <ViewTransition> boundaries animate.
 * Call with useSetAtom(navigateToPageAtom).
 *
 * The write `set` does not notify React until this function returns, so it cannot
 * sit inside flushSync or startTransition. store.set flushes each update in the
 * callback that wraps it. There is no Jotai <Provider>, so the default store is
 * the one the hooks read.
 */
export const navigateToPageAtom = atom(null, (_get, _set, page: MainPage) => {
    const store = getDefaultStore();
    const toMain = page === MainPage.main;

    // The old-page snapshot is taken from the DOM as it is when the transition starts,
    // so the pieces must be committed synchronously before it (a sync update never animates).
    if (toMain) {
        flushSync(() => store.set(welcomeSplitAtom, true));
    }

    startTransition(
        () => {
            addTransitionType(toMain ? TRANSITION_TYPE_TO_MAIN : TRANSITION_TYPE_TO_WELCOME);
            if (!toMain) {
                store.set(welcomeSplitAtom, true); // the Welcome page mounts split; it joins itself when the transition finishes
            }
            store.set(mainPageAtom, page);
        }
    );
});

export const TRANSITION_TYPE_TO_MAIN = 'nav-to-main';
export const TRANSITION_TYPE_TO_WELCOME = 'nav-to-welcome';

//---------------------------------------------------------------------------
/**
 * While true, the Welcome page is drawn as piece copies (four quarters or two sliding doors), each with its own
 * <ViewTransition>, so the page can split and move out (or back in); see WelcomePieces.
 */
export const welcomeSplitAtom = atom(false);

//---------------------------------------------------------------------------

export const APP_NAME = "Template App";

export const APP_DESCRIPTION = "A starting point for React apps: Tailwind CSS, shadcn/ui, Jotai, and Valtio. Replace this text, the name, and the logo with your own.";

//---------------------------------------------------------------------------
