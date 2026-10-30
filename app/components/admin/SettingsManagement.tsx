"use client";
// বাংলা: এই shared UI component-এ SettingsManagement অংশের display ও interaction পরিচালিত হয়।

import {
    FormEvent,
    useEffect,
    useState,
} from "react";
import { useTheme } from "@/context/ThemeContext";
import {
    DEFAULT_THEME_SETTINGS,
    THEME_PRESETS,
    type ThemePreset,
    type ThemeSettings,
} from "@/lib/theme-settings";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

interface Settings {
    organizationName: string;
    organizationShortName: string;
    foundedAt: string;
    themePreset: ThemePreset;
    themeMode: "light" | "dark";
    primaryColor: string;
    tagline: string;

    email: string;
    phone: string;
    whatsapp: string;

    address: string;

    currency: string;
    currencySymbol: string;

    receiptPrefix: string;
    depositReceiptPrefix: string;
    withdrawalReceiptPrefix: string;
    loanReceiptPrefix: string;

    logoFileName: string;
    logoUrl: string;

    receiptFooter: string;
    receiptWatermark: boolean;

    allowMemberRegistration: boolean;
    allowMemberLogin: boolean;

    maintenanceMode: boolean;
    notificationsEnabled: boolean;
    autoCashBookSync: boolean;

    updatedAt: string | null;
    updatedBy: string;
}

const DEFAULT_SETTINGS: Settings = {
    organizationName:
        "AL-INSAF INVESTMENT LTD.",

    organizationShortName:
        "AL-INSAF",

    foundedAt: "",

    ...DEFAULT_THEME_SETTINGS,

    tagline:
        "Investment & Financial Services",

    email:
        "alinsaf@gmail.com",

    phone: "",

    whatsapp: "",

    address: "",

    currency: "BDT",

    currencySymbol: "৳",

    receiptPrefix: "RCT",

    depositReceiptPrefix: "DR",

    withdrawalReceiptPrefix: "WR",

    loanReceiptPrefix: "LR",

    logoFileName:
        "WhatsApp Image 2026-10-01 at 8.09.06 PM.jpeg",

    logoUrl:
        "/WhatsApp Image 2026-10-01 at 8.09.06 PM.jpeg",

    receiptFooter:
        "This is a computer-generated receipt.",

    receiptWatermark: true,

    allowMemberRegistration: true,

    allowMemberLogin: true,

    maintenanceMode: false,

    notificationsEnabled: true,

    autoCashBookSync: true,

    updatedAt: null,

    updatedBy: "",
};

// বাংলা: এই component site configuration, theme এবং integration settings সংরক্ষণের UI দেয়।
export default function SettingsManagement() {
    const { applyTheme } = useTheme();
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);
    const [settings, setSettings] =
        useState<Settings>(
            DEFAULT_SETTINGS,
        );

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    async function loadSettings() {
        try {
            setLoading(true);
            setError("");

            const response =
                await fetch(
                    "/api/admin/settings",
                    {
                        cache: "no-store",
                    },
                );

            const data =
                await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data?.message ||
                        "Settings load failed",
                );
            }

            const loadedSettings = {
                ...DEFAULT_SETTINGS,
                ...(data.settings || {}),
            };
            setSettings(loadedSettings);
            applyTheme(loadedSettings);
        } catch (error: any) {
            setError(
                error?.message ||
                    "Settings load failed",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSettings();
    }, []);

    function update(
        key: keyof Settings,
        value: any,
    ) {
        setSettings((prev) => ({ ...prev, [key]: value }));
    }

    function updateTheme(changes: Partial<ThemeSettings>) {
        const updated = { ...settings, ...changes };
        setSettings(updated);
        applyTheme({
            themePreset: updated.themePreset,
            themeMode: updated.themeMode,
            primaryColor: updated.primaryColor,
        });
    }

    async function saveSettings(
        event: FormEvent,
    ) {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setMessage("");

            const response =
                await fetch(
                    "/api/admin/settings",
                    {
                        method: "PUT",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            settings,
                        ),
                    },
                );

            const data =
                await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data?.message ||
                        "Settings save failed",
                );
            }

            setSettings({
                ...DEFAULT_SETTINGS,
                ...(data.settings || {}),
            });
            applyTheme(data.settings as ThemeSettings);

            setMessage(
                "Settings successfully saved.",
            );
        } catch (error: any) {
            setError(
                error?.message ||
                    "Settings save failed",
            );
        } finally {
            setSaving(false);
        }
    }

    function resetSettings() {
        const confirmed =
            window.confirm(
                "আপনি কি settings reload করতে চান?",
            );

        if (confirmed) {
            loadSettings();
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="rounded-2xl bg-white px-8 py-6 shadow">
                    <div className="text-lg font-semibold">
                        {t("Loading Settings...")}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-6">
            <div className="mx-auto max-w-6xl">
                {/* HEADER */}
                <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-2xl text-white">
                                    ⚙
                                </div>

                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                                        {t("Settings")}
                                    </h1>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {t("Al-Insaf system configuration")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={resetSettings}
                                className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                            >
                                ↻ {t("Reload")}
                            </button>

                            <button
                                form="settings-form"
                                type="submit"
                                disabled={saving}
                                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {saving
                                    ? t("Saving...")
                                    : `💾 ${t("Save Settings")}`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* SUCCESS */}
                {message && (
                    <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                        ✓ {message}
                    </div>
                )}

                {/* ERROR */}
                {error && (
                    <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                        ✕ {error}
                    </div>
                )}

                <form
                    id="settings-form"
                    onSubmit={saveSettings}
                    className="space-y-6"
                >
                    {/* ORGANIZATION */}
                    <SettingsCard
                        title={t("Website Theme")}
                        description={t("Control the website colors and light/dark mode")}
                        icon="🎨"
                    >
                        <div className="space-y-6">
                            <fieldset>
                                <legend className="mb-3 text-sm font-semibold text-gray-700">{t("Color palette")}</legend>
                                <div className="flex flex-wrap gap-3">
                                    {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => updateTheme({
                                                themePreset: key as ThemePreset,
                                                primaryColor: preset.color,
                                            })}
                                            aria-pressed={settings.themePreset === key}
                                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                                                settings.themePreset === key
                                                    ? "border-gray-900 ring-2 ring-gray-300"
                                                    : "border-gray-200"
                                            }`}
                                        >
                                            <span
                                                className="h-5 w-5 rounded-full"
                                                style={{ backgroundColor: preset.color }}
                                            />
                                            {t(preset.label)}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="flex flex-wrap items-end gap-5">
                                <label className="text-sm font-semibold text-gray-700">
                                    {t("Custom primary color")}
                                    <input
                                        type="color"
                                        value={settings.primaryColor}
                                        onChange={(event) => updateTheme({
                                            themePreset: "custom",
                                            primaryColor: event.target.value,
                                        })}
                                        className="mt-2 block h-11 w-20 cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                                    />
                                </label>

                                <fieldset>
                                    <legend className="mb-2 text-sm font-semibold text-gray-700">{t("Display mode")}</legend>
                                    <div className="flex gap-2">
                                        {(["light", "dark"] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => updateTheme({ themeMode: mode })}
                                                aria-pressed={settings.themeMode === mode}
                                                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                                                    settings.themeMode === mode
                                                        ? "border-emerald-700 bg-emerald-700 text-white"
                                                        : "border-gray-200 text-gray-700"
                                                }`}
                                            >
                                                {t(mode === "light" ? "Light" : "Dark")}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>
                            </div>
                        </div>
                    </SettingsCard>

                    <SettingsCard
                        title={t("Organization Information")}
                        description={t("Your organization's basic information")}
                        icon="🏢"
                    >
                        <div className="grid gap-5 md:grid-cols-2">
                            <Input
                                label={t("Organization Name")}
                                value={
                                    settings.organizationName
                                }
                                onChange={(value) =>
                                    update(
                                        "organizationName",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Short Name")}
                                value={
                                    settings.organizationShortName
                                }
                                onChange={(value) =>
                                    update(
                                        "organizationShortName",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Organization Founding Date")}
                                type="date"
                                value={settings.foundedAt}
                                onChange={(value) =>
                                    update("foundedAt", value)
                                }
                            />

                            <Input
                                label={t("Tagline")}
                                value={
                                    settings.tagline
                                }
                                onChange={(value) =>
                                    update(
                                        "tagline",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Email")}
                                type="email"
                                value={
                                    settings.email
                                }
                                onChange={(value) =>
                                    update(
                                        "email",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Phone")}
                                value={
                                    settings.phone
                                }
                                onChange={(value) =>
                                    update(
                                        "phone",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("WhatsApp")}
                                value={
                                    settings.whatsapp
                                }
                                onChange={(value) =>
                                    update(
                                        "whatsapp",
                                        value,
                                    )
                                }
                            />

                            <div className="md:col-span-2">
                                <Textarea
                                    label={t("Address")}
                                    value={
                                        settings.address
                                    }
                                    onChange={(value) =>
                                        update(
                                            "address",
                                            value,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </SettingsCard>

                    {/* LOGO */}
                    <SettingsCard
                        title={t("Organization Logo")}
                        description={t("Logo used on receipts and throughout the system")}
                        icon="🖼️"
                    >
                        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
                            <div className="flex h-44 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                {settings.logoUrl ? (
                                    <img
                                        src={
                                            settings.logoUrl
                                        }
                                        alt={t("Organization Logo")}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400">
                                        {language === "bn" ? "লোগো নেই" : "No Logo"}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-5">
                                <Input
                                    label={t("Logo File Name")}
                                    value={
                                        settings.logoFileName
                                    }
                                    onChange={(value) =>
                                        update(
                                            "logoFileName",
                                            value,
                                        )
                                    }
                                />

                                <Input
                                    label={t("Logo URL")}
                                    value={
                                        settings.logoUrl
                                    }
                                    onChange={(value) =>
                                        update(
                                            "logoUrl",
                                            value,
                                        )
                                    }
                                />

                                <p className="text-xs text-gray-500">
                                    {t("Your logo is currently served from the public folder.")}
                                </p>
                            </div>
                        </div>
                    </SettingsCard>

                    {/* RECEIPT */}
                    <SettingsCard
                        title={t("Receipt Settings")}
                        description={t("Deposit, Withdrawal and Loan receipt configuration")}
                        icon="🧾"
                    >
                        <div className="grid gap-5 md:grid-cols-2">
                            <Input
                                label={t("General Receipt Prefix")}
                                value={
                                    settings.receiptPrefix
                                }
                                onChange={(value) =>
                                    update(
                                        "receiptPrefix",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Deposit Receipt Prefix")}
                                value={
                                    settings.depositReceiptPrefix
                                }
                                onChange={(value) =>
                                    update(
                                        "depositReceiptPrefix",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Withdrawal Receipt Prefix")}
                                value={
                                    settings.withdrawalReceiptPrefix
                                }
                                onChange={(value) =>
                                    update(
                                        "withdrawalReceiptPrefix",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Loan Receipt Prefix")}
                                value={
                                    settings.loanReceiptPrefix
                                }
                                onChange={(value) =>
                                    update(
                                        "loanReceiptPrefix",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Currency")}
                                value={
                                    settings.currency
                                }
                                onChange={(value) =>
                                    update(
                                        "currency",
                                        value,
                                    )
                                }
                            />

                            <Input
                                label={t("Currency Symbol")}
                                value={
                                    settings.currencySymbol
                                }
                                onChange={(value) =>
                                    update(
                                        "currencySymbol",
                                        value,
                                    )
                                }
                            />

                            <div className="md:col-span-2">
                                <Textarea
                                    label={t("Receipt Footer")}
                                    value={
                                        settings.receiptFooter
                                    }
                                    onChange={(value) =>
                                        update(
                                            "receiptFooter",
                                            value,
                                        )
                                    }
                                />
                            </div>

                            <Toggle
                                label={t("Receipt Watermark")}
                                description={t("Show the organization logo in the receipt background")}
                                checked={
                                    settings.receiptWatermark
                                }
                                onChange={(value) =>
                                    update(
                                        "receiptWatermark",
                                        value,
                                    )
                                }
                            />
                        </div>
                    </SettingsCard>

                    {/* MEMBER SETTINGS */}
                    <SettingsCard
                        title={t("Member Settings")}
                        description={t("Member registration and login configuration")}
                        icon="👥"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <Toggle
                                label={t("Member Registration")}
                                description={t("Accept new member registration requests")}
                                checked={
                                    settings.allowMemberRegistration
                                }
                                onChange={(value) =>
                                    update(
                                        "allowMemberRegistration",
                                        value,
                                    )
                                }
                            />

                            <Toggle
                                label={t("Member Login")}
                                description={t("Allow members to log in")}
                                checked={
                                    settings.allowMemberLogin
                                }
                                onChange={(value) =>
                                    update(
                                        "allowMemberLogin",
                                        value,
                                    )
                                }
                            />
                        </div>
                    </SettingsCard>

                    {/* SYSTEM */}
                    <SettingsCard
                        title={t("System Settings")}
                        description={t("Important system configuration")}
                        icon="⚙️"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <Toggle
                                label={t("Notifications")}
                                description={t("Turn system notifications on or off")}
                                checked={
                                    settings.notificationsEnabled
                                }
                                onChange={(value) =>
                                    update(
                                        "notificationsEnabled",
                                        value,
                                    )
                                }
                            />

                            <Toggle
                                label={t("Automatic CashBook Sync")}
                                description={t("Sync approved transactions to the cash book")}
                                checked={
                                    settings.autoCashBookSync
                                }
                                onChange={(value) =>
                                    update(
                                        "autoCashBookSync",
                                        value,
                                    )
                                }
                            />

                            <div className="md:col-span-2">
                                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <div className="font-bold text-red-700">
                                                {t("Maintenance Mode")}
                                            </div>

                                            <div className="mt-1 text-sm text-red-600">
                                                {t("Enabling maintenance mode will limit regular user access.")}
                                            </div>
                                        </div>

                                        <ToggleSwitch
                                            checked={
                                                settings.maintenanceMode
                                            }
                                            onChange={(value) =>
                                                update(
                                                    "maintenanceMode",
                                                    value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SettingsCard>

                    {/* SAVE */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-2xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {saving
                                ? t("Saving...")
                                : `💾 ${t("Save All Settings")}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SettingsCard({
    title,
    description,
    icon,
    children,
}: {
    title: string;
    description: string;
    icon: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
                    {icon}
                </div>

                <div>
                    <h2 className="text-lg font-bold text-gray-900">
                        {title}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        {description}
                    </p>
                </div>
            </div>

            {children}
        </section>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
                {label}
            </label>

            <input
                type={type}
                value={value || ""}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
        </div>
    );
}

function Textarea({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
                {label}
            </label>

            <textarea
                value={value || ""}
                onChange={(e) =>
                    onChange(e.target.value)
                }
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
        </div>
    );
}

function Toggle({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div>
                <div className="font-semibold text-gray-800">
                    {label}
                </div>

                <div className="mt-1 text-xs text-gray-500">
                    {description}
                </div>
            </div>

            <ToggleSwitch
                checked={checked}
                onChange={onChange}
            />
        </div>
    );
}

function ToggleSwitch({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <button
            type="button"
            onClick={() =>
                onChange(!checked)
            }
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                checked
                    ? "bg-emerald-600"
                    : "bg-gray-300"
            }`}
        >
            <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                    checked
                        ? "left-6"
                        : "left-1"
                }`}
            />
        </button>
    );
}