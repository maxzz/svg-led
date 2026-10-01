import { proxy, subscribe } from 'valtio';
import { type ThemeMode, themeApplyMode } from '../utils/theme-apply';
import { type PanelSizes, getValidPanelSizes } from './2-panel-sizes';

const STORE_KEY = "tm-template-shadcn-26";
const STORE_VER = "v1.0";
const STORAGE_ID = `${STORE_KEY}__${STORE_VER}`;

/** How the Welcome page opens onto the main page and closes back over it */
export const WelcomeTransition = {
    quadrants: 'quadrants',      // Splits into four quarters that fly out to the corners
    doors: 'doors',              // Parts in the middle like a pair of sliding doors
} as const;

export type WelcomeTransition = typeof WelcomeTransition[keyof typeof WelcomeTransition];

function isWelcomeTransition(value: unknown): value is WelcomeTransition {
    return Object.values<unknown>(WelcomeTransition).includes(value);
}

export interface AppSettings {
    theme: ThemeMode;            // Theme mode
    showWelcome: boolean;        // Show the Welcome page at startup
    welcomeTransition: WelcomeTransition; // Transition between the Welcome and main pages
    showFooter: boolean;         // Show footer in main layout
    panelSizes: PanelSizes;      // ResizablePanelGroup panel sizes
    expandedSections: string[];  // Expanded accordion sections by name
}

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'light',
    showWelcome: true,
    welcomeTransition: WelcomeTransition.quadrants,
    showFooter: true,
    panelSizes: getValidPanelSizes(),
    expandedSections: ['resizable-panels', 'pierre-trees'],
};

// Load settings from localStorage

function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(STORAGE_ID);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<AppSettings>;
            
            // merge stored settings with defaults to ensure new fields are present
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                welcomeTransition: isWelcomeTransition(parsed.welcomeTransition) ? parsed.welcomeTransition : DEFAULT_SETTINGS.welcomeTransition,
                panelSizes: getValidPanelSizes(parsed.panelSizes),
                expandedSections: parsed.expandedSections ?? DEFAULT_SETTINGS.expandedSections,
            };
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
    return { ...DEFAULT_SETTINGS };
}

export const appSettings = proxy<AppSettings>(loadSettings());

themeApplyMode(appSettings.theme);

subscribe(appSettings, () => {
    try {
        themeApplyMode(appSettings.theme);
        localStorage.setItem(STORAGE_ID, JSON.stringify(appSettings));
    } catch (e) {
        console.error("Failed to save settings", e);
    }
});
