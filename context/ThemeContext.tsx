
"use client";

import {
    createContext,
    useContext,
    useCallback,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    DEFAULT_THEME_SETTINGS,
    normalizeThemeSettings,
    type ThemeSettings,
} from "@/lib/theme-settings";

type ThemeContextType = {
    dark: boolean;
    toggleDark: () => void;
    applyTheme: (settings: ThemeSettings) => void;
    primaryColor: string;
    setPrimaryColor: (color: string) => void;
    themePreset: ThemeSettings["themePreset"];
};

const ThemeContext = createContext<ThemeContextType | undefined>(
    undefined
);

export function ThemeProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [dark, setDark] = useState(
        DEFAULT_THEME_SETTINGS.themeMode === "dark"
    );

    const [primaryColor, setPrimaryColor] = useState(
        DEFAULT_THEME_SETTINGS.primaryColor
    );

    const [themePreset, setThemePreset] =
        useState<ThemeSettings["themePreset"]>(
            DEFAULT_THEME_SETTINGS.themePreset
        );

    const applyTheme = useCallback((settings: ThemeSettings) => {
        const normalized = normalizeThemeSettings(settings);

        setDark(normalized.themeMode === "dark");
        setPrimaryColor(normalized.primaryColor);
        setThemePreset(normalized.themePreset);
    }, []);

    // Load global theme from the public API.
    useEffect(() => {
        let cancelled = false;

        async function loadGlobalTheme() {
            try {
                const response = await fetch("/api/public/theme", {
                    cache: "no-store",
                });

                const rawResponse = await response.text();

                let result: {
                    success?: boolean;
                    message?: string;
                    theme?: ThemeSettings;
                };

                try {
                    result = JSON.parse(rawResponse);
                } catch {
                    throw new Error(
                        `Theme API returned invalid JSON. HTTP ${response.status}`
                    );
                }

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        `Theme API failed with HTTP ${response.status}`
                    );
                }

                if (cancelled) return;

                applyTheme(
                    normalizeThemeSettings(result.theme || {})
                );
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Could not load global theme. Using default theme:",
                        error
                    );
                }
                // Keep the default theme when the API is unavailable.
            }
        }

        loadGlobalTheme();

        return () => {
            cancelled = true;
        };
    }, [applyTheme]);

    // Apply light/dark mode.
    useEffect(() => {
        document.documentElement.dataset.themeMode = dark
            ? "dark"
            : "light";

        document.documentElement.classList.toggle("dark", dark);
    }, [dark]);

    // Apply primary color and preset.
    useEffect(() => {
        document.documentElement.style.setProperty(
            "--alinsaf-primary",
            primaryColor
        );

        document.documentElement.dataset.themePreset = themePreset;
    }, [primaryColor, themePreset]);

    const toggleDark = useCallback(() => {
        setDark((previous) => !previous);
    }, []);

    return (
        <ThemeContext.Provider
            value={{
                dark,
                toggleDark,
                applyTheme,
                primaryColor,
                setPrimaryColor,
                themePreset,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error(
            "useTheme must be used inside ThemeProvider"
        );
    }

    return context;
}
