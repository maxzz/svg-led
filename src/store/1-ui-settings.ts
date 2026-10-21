import { proxy, subscribe } from 'valtio';
import { type ThemeMode, themeApplyMode } from '../utils/theme-apply';
import { STORAGE_KEYS } from './2-persist/8-storage-keys';

/** How the Welcome page opens onto the main page and closes back over it */
export const WelcomeTransition = {
    quadrants: 'quadrants',      // Splits into four quarters that fly out to the corners
    doors: 'doors',              // Parts in the middle like a pair of sliding doors
} as const;

export type WelcomeTransition = typeof WelcomeTransition[keyof typeof WelcomeTransition];

function isWelcomeTransition(value: unknown): value is WelcomeTransition {
    return Object.values<unknown>(WelcomeTransition).includes(value);
}

/** Which elements a selection marquee picks */
export const SelectionMode = {
    inclusive: 'inclusive',      // Only elements lying entirely inside the marquee are selected
    exclusive: 'exclusive',      // Any element the marquee touches is selected
} as const;

export type SelectionMode = typeof SelectionMode[keyof typeof SelectionMode];

function isSelectionMode(value: unknown): value is SelectionMode {
    return Object.values<unknown>(SelectionMode).includes(value);
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
    fitAvoidsProperties: boolean; // Zoom to fit centers content in the area left of the Properties panel
    showHintIsland: boolean;     // Show the tool hint island under the main toolbar
    selectionMode: SelectionMode; // Marquee selection: inclusive (fully enclosed) or exclusive (touched); Ctrl inverts it while dragging
}

export interface PropertySectionsSettings {
    bboxOpen: boolean;           // "Position and size" section is expanded
    capsJoinsOpen: boolean;      // "Line caps and joins" section is expanded
    viewBoxFileOpen: boolean;    // "File" section in the ViewBox settings is expanded
}

export interface MonacoSettings {
    fontFamily: string;          // Editor font family (CSS font-family list)
    fontSize: number;            // Editor font size in px
    minimap: boolean;            // Show the minimap in the code panel
}

export interface AppSettings {
    theme: ThemeMode;            // Theme mode
    showWelcome: boolean;        // Show the Welcome page at startup
    welcomeTransition: WelcomeTransition; // Transition between the Welcome and main pages
    canvasBackground: string;    // Canvas background color; empty string means the theme background
    codePanel: CodePanelSettings;
    propertySections: PropertySectionsSettings; // Expanded state of collapsible property sections
    prefs: EditorPreferences;
    monaco: MonacoSettings;      // Monaco code editor options
}

//---------------------------------------------------------------------------

export const MONACO_DEFAULT_FONT_FAMILY = "Consolas, 'Courier New', monospace";

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
        capsJoinsOpen: false,
        viewBoxFileOpen: false,
    },
    prefs: {
        showViewBox: true,
        showGrid: false,
        snapToGrid: false,
        snapToObjects: false,
        gridSize: 10,
        precision: 3,
        fitAvoidsProperties: false,
        showHintIsland: true,
        selectionMode: SelectionMode.exclusive,
    },
    monaco: {
        fontFamily: MONACO_DEFAULT_FONT_FAMILY,
        fontSize: 10,
        minimap: false,
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
                prefs: {
                    ...DEFAULT_SETTINGS.prefs,
                    ...parsed.prefs,
                    selectionMode: isSelectionMode(parsed.prefs?.selectionMode) ? parsed.prefs.selectionMode : DEFAULT_SETTINGS.prefs.selectionMode,
                },
                monaco: { ...DEFAULT_SETTINGS.monaco, ...parsed.monaco },
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
