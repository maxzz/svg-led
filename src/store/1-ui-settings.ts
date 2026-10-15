import { proxy, subscribe } from 'valtio';
import { type ThemeMode, themeApplyMode } from '../utils/theme-apply';
import { STORAGE_KEYS } from './2-persist/1-storage-keys';

/** How the Welcome page opens onto the main page and closes back over it */
export const WelcomeTransition = {
    quadrants: 'quadrants',      // Splits into four quarters that fly out to the corners
    doors: 'doors',              // Parts in the middle like a pair of sliding doors
} as const;

export type WelcomeTransition = typeof WelcomeTransition[keyof typeof WelcomeTransition];

function isWelcomeTransition(value: unknown): value is WelcomeTransition {
    return Object.values<unknown>(WelcomeTransition).includes(value);
}

export interface CodePanelSettings {
    open: boolean;               // Code panel is slid out
    width: number;               // Panel width in px
    sync: boolean;               // Two-way sync between the source code and the canvas
}

export interface EditorPreferences {
    showViewBox: boolean;        // Draw the viewBox frame and dim everything outside it
    showGrid: boolean;           // Draw the grid in document units
    snapToGrid: boolean;         // Snap dragged points to the grid
    snapToObjects: boolean;      // Snap dragged elements to the edges and centers of other elements (Ctrl also snaps while dragging)
    gridSize: number;            // Grid step in document units
    precision: number;           // Decimal digits written to the SVG source
}

export interface PropertySectionsSettings {
    bboxOpen: boolean;           // "Position and size" section is expanded
}

export interface AppSettings {
    theme: ThemeMode;            // Theme mode
    showWelcome: boolean;        // Show the Welcome page at startup
    welcomeTransition: WelcomeTransition; // Transition between the Welcome and main pages
    canvasBackground: string;    // Canvas background color; empty string means the theme background
    codePanel: CodePanelSettings;
    propertySections: PropertySectionsSettings; // Expanded state of collapsible property sections
    prefs: EditorPreferences;
}

//---------------------------------------------------------------------------

const DEFAULT_SETTINGS: AppSettings = {
    theme: 'light',
    showWelcome: true,
    welcomeTransition: WelcomeTransition.quadrants,
    canvasBackground: '',
    codePanel: {
        open: false,
        width: 420,
        sync: true,
    },
    propertySections: {
        bboxOpen: false,
    },
    prefs: {
        showViewBox: true,
        showGrid: false,
        snapToGrid: false,
        snapToObjects: false,
        gridSize: 10,
        precision: 3,
    },
};

//---------------------------------------------------------------------------

function loadSettings(): AppSettings {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.app);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<AppSettings>;

            // merge stored settings with defaults to ensure new fields are present
            return {
                ...DEFAULT_SETTINGS,
                ...parsed,
                welcomeTransition: isWelcomeTransition(parsed.welcomeTransition) ? parsed.welcomeTransition : DEFAULT_SETTINGS.welcomeTransition,
                codePanel: { ...DEFAULT_SETTINGS.codePanel, ...parsed.codePanel },
                propertySections: { ...DEFAULT_SETTINGS.propertySections, ...parsed.propertySections },
                prefs: { ...DEFAULT_SETTINGS.prefs, ...parsed.prefs },
            };
        }
    } catch (e) {
        console.error("Failed to load settings", e);
    }
    return structuredClone(DEFAULT_SETTINGS);
}

export const appSettings = proxy<AppSettings>(loadSettings());

//---------------------------------------------------------------------------

themeApplyMode(appSettings.theme);

subscribe(appSettings,
    () => {
        try {
            themeApplyMode(appSettings.theme);
            localStorage.setItem(STORAGE_KEYS.app, JSON.stringify(appSettings));
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    }
);
