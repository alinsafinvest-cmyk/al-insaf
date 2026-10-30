"use client";
// বাংলা: এই shared UI component-এ Header অংশের display ও interaction পরিচালিত হয়।

import { useEffect, useState } from "react";
import Image from "next/image";
import {
    Bell,
    Globe,
    Menu,
    Moon,
    Sun,
    LogOut,
    User,
    Languages,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

interface HeaderProps {
    title: string;
    role: "admin" | "member";
    onMenuClick?: () => void;
}

interface SessionProfile {
    name: string;
    photoUrl: string;
}

// বাংলা: dashboard-এর শীর্ষবার, account profile ও theme/language controls দেখায়।
export default function Header({
    title,
    role,
    onMenuClick,
}: HeaderProps) {
    const router = useRouter();

    const { dark, toggleDark, primaryColor } = useTheme();
    const { language, setLanguage, bn } = useLanguage();

    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profile, setProfile] = useState<SessionProfile | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            try {
                const response = await fetch("/api/auth/session", { cache: "no-store" });
                if (!response.ok) {
                    throw new Error("Unable to load account profile.");
                }
                const result = await response.json();
                if (!cancelled && result.role === role) {
                    setProfile(result.profile || null);
                }
            } catch (error) {
                console.error("Dashboard profile load failed:", error);
            }
        }

        void loadProfile();
        return () => {
            cancelled = true;
        };
    }, [role]);

    const logout = async () => {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
            });
        } finally {
            router.push(
                role === "admin"
                    ? "/admin/login"
                    : "/member/login"
            );

            router.refresh();
        }
    };

    return (
        <header
            className="sticky top-0 z-40 h-16 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90"
        >
            <div className="relative mx-auto flex h-full max-w-[1800px] items-center justify-between gap-2 px-3 sm:px-4 md:px-6">

                {/* LEFT */}

                <div className="flex items-center gap-3">

                    <button
                        type="button"
                        onClick={onMenuClick}
                        aria-label={bn ? "নেভিগেশন মেনু খুলুন" : "Open navigation menu"}
                        aria-haspopup="true"
                        className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
                    >
                        <Menu size={21} />
                    </button>

                    <div>
                        <h1 className="max-w-[38vw] truncate text-base font-bold text-slate-900 dark:text-white sm:max-w-none sm:text-lg">
                            {bn
                                ? translate(language, title)
                                : title}
                        </h1>

                        <p className="hidden text-xs text-slate-500 sm:block">
                            {bn ? "আল-ইনসাফ ইনভেস্টমেন্ট সোসাইটি" : "AL-INSAF INVESTMENT SOCIETY"}
                        </p>
                    </div>
                </div>

                {/* RIGHT */}

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">

                    {/* Notification */}

                    <div className="relative hidden sm:block">
                        <button
                            type="button"
                            onClick={() => setNotificationsOpen((open) => !open)}
                            aria-label={bn ? "বিজ্ঞপ্তি" : "Notifications"}
                            aria-expanded={notificationsOpen}
                            className="
                                rounded-xl p-2.5
                                text-slate-600 hover:bg-slate-100
                                dark:text-slate-300 dark:hover:bg-slate-800
                            "
                        >
                            <Bell size={19} />
                        </button>
                        {notificationsOpen && (
                            <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                                <p className="font-bold text-slate-900 dark:text-white">
                                    {bn ? "বিজ্ঞপ্তি" : "Notifications"}
                                </p>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                    {bn ? "নতুন বিজ্ঞপ্তি এখানে দেখা যাবে।" : "New notifications will appear here."}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Dark Mode */}

                    <button
                        type="button"
                        onClick={() => setLanguage(bn ? "en" : "bn")}
                        aria-label={bn ? "Switch language to English" : "ভাষা বাংলায় পরিবর্তন করুন"}
                        className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:px-2.5"
                    >
                        <Languages size={16} />
                        {bn ? "EN" : "বাংলা"}
                    </button>

                    <button
                        type="button"
                        onClick={toggleDark}
                        aria-label={dark ? (bn ? "লাইট মোড চালু করুন" : "Switch to light mode") : (bn ? "ডার্ক মোড চালু করুন" : "Switch to dark mode")}
                        className="
                            rounded-xl
                            p-2.5
                            text-slate-600
                            hover:bg-slate-100
                            dark:text-slate-300
                            dark:hover:bg-slate-800
                        "
                    >
                        {dark ? (
                            <Sun size={19} />
                        ) : (
                            <Moon size={19} />
                        )}
                    </button>

                    <Link
                        href="/"
                        aria-label={bn ? "হোম পেজে যান" : "Go to home page"}
                        className="
                            flex items-center gap-2 rounded-xl px-2.5 py-2
                            text-xs font-semibold text-slate-600 hover:bg-slate-100
                            dark:text-slate-300 dark:hover:bg-slate-800
                        "
                    >
                        <Globe size={17} />
                        <span className="hidden md:inline">{bn ? "হোম" : "Home"}</span>
                    </Link>

                    {/* Profile */}

                    <div className="relative">

                        <button
                            type="button"
                            aria-label={bn ? "অ্যাকাউন্ট মেনু" : "Account menu"}
                            aria-expanded={profileOpen}
                            onClick={() =>
                                setProfileOpen((prev) => !prev)
                            }
                            className="
                                flex
                                items-center
                                gap-2
                                rounded-xl
                                px-2
                                py-1.5
                                hover:bg-slate-100
                                dark:hover:bg-slate-800
                            "
                        >
                            <div
                                className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-white ring-2 ring-white shadow-sm dark:ring-slate-800"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {profile?.photoUrl ? (
                                    <Image
                                        src={profile.photoUrl}
                                        alt={profile.name || (bn ? "প্রোফাইল ছবি" : "Profile photo")}
                                        fill
                                        unoptimized
                                        sizes="36px"
                                        className="object-cover"
                                    />
                                ) : profile?.name ? (
                                    <span className="text-sm font-bold">{profile.name.charAt(0).toUpperCase()}</span>
                                ) : (
                                    <User size={18} />
                                )}
                            </div>

                            <div className="hidden text-left sm:block">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {profile?.name || (role === "admin"
                                        ? bn ? "প্রশাসক" : "Administrator"
                                        : bn ? "সদস্য" : "Member")}
                                </p>

                                <p className="text-xs text-slate-500">
                                    {role === "admin"
                                        ? bn ? "অ্যাডমিন" : "Admin"
                                        : bn ? "সদস্য" : "Member"}
                                </p>
                            </div>
                        </button>

                        {profileOpen && (
                            <div
                                className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                            >
                                <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                        {profile?.name || (role === "admin"
                                            ? bn ? "অ্যাডমিন অ্যাকাউন্ট" : "Admin Account"
                                            : bn ? "সদস্য অ্যাকাউন্ট" : "Member Account")}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {role === "admin" ? (bn ? "অ্যাডমিন" : "Administrator") : (bn ? "সদস্য" : "Member")}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={logout}
                                    className="
                                        flex
                                        w-full
                                        items-center
                                        gap-3
                                        px-4
                                        py-3
                                        text-left
                                        text-sm
                                        text-red-600
                                        hover:bg-red-50
                                        dark:hover:bg-red-950/30
                                    "
                                >
                                    <LogOut size={17} />
                                    {bn ? "লগআউট" : "Logout"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}