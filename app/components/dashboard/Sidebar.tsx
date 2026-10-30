"use client";
// বাংলা: এই shared UI component-এ Sidebar অংশের display ও interaction পরিচালিত হয়।

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    ArrowDownToLine,
    ArrowUpFromLine,
    HandCoins,
    ReceiptText,
    UserCircle,
    Settings,
    X,
    Globe,
} from "lucide-react";

import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { SITE_LOGO } from "@/lib/site-branding";
import { translate } from "@/lib/i18n";

interface SidebarProps {
    role: "admin" | "member";
    mobileOpen: boolean;
    onClose: () => void;
}

// বাংলা: role অনুযায়ী icon-only dashboard navigation দেখায়।
export default function Sidebar({
    role,
    mobileOpen,
    onClose,
}: SidebarProps) {
    const pathname = usePathname();
    const { bn } = useLanguage();

    const { primaryColor } = useTheme();

    const adminItems = [
        {
            name: "Dashboard",
            href: "/admin/dashboard",
            icon: LayoutDashboard,
        },
        {
            name: "Members",
            href: "/admin/dashboard/members",
            icon: Users,
        },
        {
            name: "Deposits",
            href: "/admin/dashboard/deposits",
            icon: ArrowDownToLine,
        },
        {
            name: "Withdrawals",
            href: "/admin/dashboard/withdrawals",
            icon: ArrowUpFromLine,
        },
        {
            name: "Loans",
            href: "/admin/dashboard/loans",
            icon: HandCoins,
        },
        {
            name: "Transactions",
            href: "/admin/dashboard/transactions",
            icon: ReceiptText,
        },
        {
            name: "Settings",
            href: "/admin/dashboard/settings",
            icon: Settings,
        },
    ];

    const memberItems = [
        {
            name: "Dashboard",
            href: "/member/dashboard",
            icon: LayoutDashboard,
        },
        {
            name: "My Profile",
            href: "/member/dashboard/profile",
            icon: UserCircle,
        },
        {
            name: "My Deposits",
            href: "/member/dashboard/deposits",
            icon: ArrowDownToLine,
        },
        {
            name: "My Withdrawals",
            href: "/member/dashboard/withdrawals",
            icon: ArrowUpFromLine,
        },
        {
            name: "My Loans",
            href: "/member/dashboard/loans",
            icon: HandCoins,
        },
        {
            name: "Transactions",
            href: "/member/dashboard/transactions",
            icon: ReceiptText,
        },
    ];

    const items =
        role === "admin" ? adminItems : memberItems;

    const isActive = (href: string) => {
        if (href === "/admin/dashboard" || href === "/member/dashboard") {
            return pathname === href;
        }

        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Mobile Overlay */}

            {mobileOpen && (
                <div
                    onClick={onClose}
                    aria-hidden="true"
                    className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm transition-opacity lg:hidden"
                />
            )}

            <aside
                className={`
                    fixed
                    left-0
                    top-0
                    z-50
                    flex
                    h-dvh
                    w-20
                    flex-col
                    border-r
                    border-slate-200
                    bg-white/95
                    shadow-2xl
                    transition-[width,transform,background-color]
                    duration-300
                    dark:border-slate-800
                    dark:bg-slate-950/95
                    lg:shadow-none

                    ${
                        mobileOpen
                            ? "translate-x-0"
                            : "-translate-x-full lg:translate-x-0"
                    }
                `}
            >

                {/* Logo */}

                <div className="flex h-[4.5rem] shrink-0 items-center justify-center border-b border-slate-200 px-2 dark:border-slate-800">

                    <Link
                        href={
                            role === "admin"
                                ? "/admin/dashboard"
                                : "/member/dashboard"
                        }
                        className="flex items-center justify-center"
                        title={bn ? "ড্যাশবোর্ড" : "Dashboard"}
                    >
                        <Image
                            src={SITE_LOGO}
                            alt="Al-Insaf"
                            width={40}
                            height={40}
                            className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm ring-1 ring-emerald-500/15"
                        />
                    </Link>

                </div>

                <div className="flex justify-center border-b border-slate-200 py-1 dark:border-slate-800 lg:hidden">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={bn ? "সাইডবার বন্ধ করুন" : "Close sidebar"}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Role */}

                <div
                    className="mx-auto my-3 flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                        backgroundColor: `${primaryColor}15`,
                    }}
                >
                    <p
                        className="text-xs font-bold"
                        aria-label={role === "admin" ? (bn ? "অ্যাডমিন প্যানেল" : "Admin Panel") : (bn ? "সদস্য প্যানেল" : "Member Panel")}
                        title={role === "admin" ? (bn ? "অ্যাডমিন প্যানেল" : "Admin Panel") : (bn ? "সদস্য প্যানেল" : "Member Panel")}
                        style={{
                            color: primaryColor,
                        }}
                    >
                        {role === "admin" ? "A" : "M"}
                    </p>
                </div>

                {/* Navigation */}

                <nav className="flex-1 space-y-2 overflow-y-auto px-2">

                    {items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`
                                    group relative
                                    flex
                                    items-center
                                    justify-center
                                    rounded-xl
                                    px-2
                                    py-3
                                    min-h-11
                                    text-sm
                                    font-medium
                                    transition-all

                                    ${
                                        active
                                            ? "text-white shadow-sm shadow-emerald-900/10"
                                            : "text-slate-600 hover:translate-x-0.5 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                    }

                                `}
                                style={
                                    active
                                        ? {
                                              backgroundColor:
                                                  primaryColor,
                                          }
                                        : undefined
                                }
                                title={translate(bn ? "bn" : "en", item.name)}
                                aria-label={translate(bn ? "bn" : "en", item.name)}
                                aria-current={active ? "page" : undefined}
                            >
                                <Icon
                                    size={19}
                                    className="shrink-0"
                                />

                                    <span className="sr-only">
                                        {translate(bn ? "bn" : "en", item.name)}
                                    </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-800">
                    <Link
                        href="/"
                        onClick={onClose}
                        className="flex items-center justify-center rounded-xl px-2 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        title={bn ? "হোম পেজ" : "Home page"}
                        aria-label={bn ? "হোম পেজে যান" : "Go to home page"}
                    >
                        <Globe size={19} className="shrink-0" />
                        <span className="sr-only">
                            {bn ? "হোম পেজ" : "Home page"}
                        </span>
                    </Link>
                </div>

            </aside>
        </>
    );
}