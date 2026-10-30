// বাংলা: এই module-এ theme setting ও color preset যাচাই এবং স্বাভাবিকীকরণ করা হয়।
export const THEME_PRESETS = {
    emerald: { label: "Emerald", color: "#047857" },
    blue: { label: "Ocean Blue", color: "#2563eb" },
    violet: { label: "Violet", color: "#7c3aed" },
    rose: { label: "Rose", color: "#e11d48" },
    amber: { label: "Amber", color: "#d97706" },
} as const;

export type ThemePreset = keyof typeof THEME_PRESETS | "custom";
export type ThemeMode = "light" | "dark";

export type ThemeSettings = {
    themePreset: ThemePreset;
    themeMode: ThemeMode;
    primaryColor: string;
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
    themePreset: "emerald",
    themeMode: "light",
    primaryColor: THEME_PRESETS.emerald.color,
};

// বাংলা: theme preset অনুমোদিত তালিকায় আছে কি না যাচাই করে।
export function isThemePreset(value: unknown): value is ThemePreset {
    return value === "custom" || (
        typeof value === "string" &&
        Object.hasOwn(THEME_PRESETS, value)
    );
}

// বাংলা: দেওয়া রঙটি বৈধ hex color কি না যাচাই করে।
export function isHexColor(value: unknown): value is string {
    return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

// বাংলা: theme setting যাচাই করে consistent format-এ রূপান্তর করে।
export function normalizeThemeSettings(value: Record<string, unknown>): ThemeSettings {
    const themePreset = isThemePreset(value.themePreset)
        ? value.themePreset
        : DEFAULT_THEME_SETTINGS.themePreset;
    const primaryColor = isHexColor(value.primaryColor)
        ? value.primaryColor
        : themePreset === "custom"
            ? DEFAULT_THEME_SETTINGS.primaryColor
            : THEME_PRESETS[themePreset].color;

    return {
        themePreset,
        themeMode: value.themeMode === "dark" ? "dark" : "light",
        primaryColor,
    };
}
