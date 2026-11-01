"use client";
// বাংলা: এই shared UI component-এ Header অংশের display ও interaction পরিচালিত হয়।

import { useEffect, useRef, useState } from "react";
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
    const [logoutPending, setLogoutPending] = useState(false);
    const [logoutError, setLogoutError] = useState("");
    const notificationRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function dismissMenus(event: MouseEvent | KeyboardEvent) {
            if (event instanceof KeyboardEvent && event.key === "Escape") {
                setNotificationsOpen(false);
                setProfileOpen(false);
                return;
            }

            if (
                event instanceof MouseEvent &&
                event.target instanceof Node
            ) {
                if (!notificationRef.current?.contains(event.target)) {
                    setNotificationsOpen(false);
                }
                if (!profileRef.current?.contains(event.target)) {
                    setProfileOpen(false);
                }
            }
        }

        document.addEventListener("mousedown", dismissMenus);
        document.addEventListener("keydown", dismissMenus);

        return () => {
            document.removeEventListener("mousedown", dismissMenus);
            document.removeEventListener("keydown", dismissMenus);
        };
    }, []);

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
        if (logoutPending) return;

        try {
            setLogoutPending(true);
            setLogoutError("");

            const response = await fetch("/api/auth/logout", {
                method: "POST",
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Logout failed."
                );
            }

            router.push(
                role === "admin"
                    ? "/admin/login"
                    : "/member/login"
            );

            router.refresh();
        } catch (error) {
            console.error("Dashboard logout failed:", error);
            setLogoutError(
                bn
                    ? "লগআউট করা যায়নি। আবার চেষ্টা করুন।"
                    : "Logout failed. Please try again."
            );
        } finally {
            setLogoutPending(false);
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

                    <div className="relative hidden sm:block" ref={notificationRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setNotificationsOpen((open) => !open);
                                setProfileOpen(false);
                            }}
                            aria-label={bn ? "দ্রুত লিংক" : "Quick links"}
                            aria-expanded={notificationsOpen}
                            aria-haspopup="menu"
                            title={bn ? "দ্রুত লিংক" : "Quick links"}
                            className="
                                rounded-xl p-2.5
                                text-slate-600 hover:bg-slate-100
                                dark:text-slate-300 dark:hover:bg-slate-800
                            "
                        >
                            <Bell size={19} />
                        </button>
                        {notificationsOpen && (
                            <div
                                role="menu"
                                className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                            >
                                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    {bn ? "দ্রুত লিংক" : "Quick links"}
                                </p>
                                {(role === "admin"
                                    ? [
                                          {
                                              label: bn ? "সদস্য ব্যবস্থাপনা" : "Members",
                                              href: "/admin/dashboard/members",
                                          },
                                          {
                                              label: bn ? "জমা ব্যবস্থাপনা" : "Deposits",
                                              href: "/admin/dashboard/deposits",
                                          },
                                          {
                                              label: bn ? "ওয়েব ট্রাফিক" : "Website traffic",
                                              href: "/admin/dashboard/traffic",
                                          },
                                      ]
                                    : [
                                          {
                                              label: bn ? "আমার প্রোফাইল" : "My profile",
                                              href: "/member/dashboard/profile",
                                          },
                                          {
                                              label: bn ? "লেনদেন" : "Transactions",
                                              href: "/member/dashboard/transactions",
                                          },
                                          {
                                              label: bn ? "নোটিশ" : "Notices",
                                              href: "/member/dashboard/notices",
                                          },
                                      ]
                                ).map((item) => (
                                    <Link
                                        key={item.href}
                                        role="menuitem"
                                        href={item.href}
                                        onClick={() => setNotificationsOpen(false)}
                                        className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-200 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-200"
                                    >
                                        {item.label}
                                    </Link>
                                ))}
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
                        className="hidden sm:flex
                            flex items-center gap-2 rounded-xl px-2.5 py-2
                            text-xs font-semibold text-slate-600 hover:bg-slate-100
                            dark:text-slate-300 dark:hover:bg-slate-800
                        "
                    >
                        <Globe size={17} />
                        <span className="hidden md:inline">{bn ? "হোম" : "Home"}</span>
                    </Link>

                    {/* Profile */}

                    <div className="relative" ref={profileRef}>

                        <button
                            type="button"
                            aria-label={bn ? "অ্যাকাউন্ট মেনু" : "Account menu"}
                            aria-expanded={profileOpen}
                            onClick={() =>
                                {
                                    setProfileOpen((prev) => !prev);
                                    setNotificationsOpen(false);
                                    setLogoutError("");
                                }
                            }
                            aria-haspopup="menu"
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
                                        onError={() => {
                                            setProfile((current) =>
                                                current
                                                    ? { ...current, photoUrl: "" }
                                                    : null
                                            );
                                        }}
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
                                role="menu"
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

                                {logoutError && (
                                    <p
                                        role="alert"
                                        className="mx-3 my-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                    >
                                        {logoutError}
                                    </p>
                                )}

                                <button
                                    type="button"
                                    onClick={logout}
                                    disabled={logoutPending}
                                    aria-busy={logoutPending}
                                    role="menuitem"
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
                                        disabled:cursor-wait disabled:opacity-60
                                    "
                                >
                                    <LogOut size={17} className={logoutPending ? "animate-pulse" : undefined} />
                                    {logoutPending
                                        ? bn
                                            ? "লগআউট হচ্ছে..."
                                            : "Signing out..."
                                        : bn
                                          ? "লগআউট"
                                          : "Logout"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}