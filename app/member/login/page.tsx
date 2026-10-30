"use client";
// বাংলা: এই member পেজে login সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Users,
    Eye,
    EyeOff,
    Mail,
    LockKeyhole,
    ArrowLeft,
    LoaderCircle,
    ShieldCheck,
    Moon,
    Sun,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import Image from "next/image";
import { SITE_LOGO } from "@/lib/site-branding";

// বাংলা: এই component email/Member ID দিয়ে member sign-in form ও login flow পরিচালনা করে।
export default function MemberLoginPage() {
    const router = useRouter();
    const { language, setLanguage } = useLanguage();
    const { dark, toggleDark } = useTheme();

    const bn = language === "bn";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    password,
                    role: "member",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(
                    data.message ||
                    (bn
                        ? "লগইন করা যায়নি। ইমেইল ও পাসওয়ার্ড যাচাই করুন।"
                        : "Login failed. Please check your credentials.")
                );
                return;
            }

            router.replace("/");
            router.refresh();
        } catch {
            setError(
                bn
                    ? "সার্ভারের সঙ্গে সংযোগ করা যাচ্ছে না।"
                    : "Unable to connect to the server."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main
            id="main-content"
            tabIndex={-1}
            lang={bn ? "bn" : "en"}
            className="auth-page neon-ui relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-12"
        >
            {/* Background decoration */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-emerald-200/50 blur-3xl" />

            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />

            <div className="relative z-10 w-full max-w-md">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur transition hover:border-emerald-200 hover:text-emerald-800"
                    >
                        <ArrowLeft size={16} />
                        {bn ? "মূল ওয়েবসাইট" : "Main website"}
                    </Link>
                    <div className="flex items-center rounded-full border border-slate-200 bg-white/90 p-1 shadow-sm" aria-label={bn ? "ভাষা ও থিম নির্বাচন" : "Language and theme controls"}>
                    <button type="button" onClick={() => setLanguage("bn")} aria-pressed={bn} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${bn ? "bg-emerald-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                        বাংলা
                    </button>
                    <button type="button" onClick={() => setLanguage("en")} aria-pressed={!bn} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${!bn ? "bg-emerald-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
                        EN
                    </button>
                    <span aria-hidden="true" className="mx-1 h-5 w-px bg-slate-200" />
                    <button
                        type="button"
                        onClick={toggleDark}
                        aria-label={dark ? (bn ? "লাইট মোড চালু করুন" : "Switch to light mode") : (bn ? "ডার্ক মোড চালু করুন" : "Switch to dark mode")}
                        className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-emerald-800"
                    >
                        {dark ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    </div>
                </div>

                <section className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_-35px_rgba(6,78,59,0.35)] ring-1 ring-slate-900/5">
                    <div aria-hidden="true" className="h-2 bg-gradient-to-r from-emerald-900 via-emerald-600 to-amber-400" />
                    <div className="p-6 sm:p-9">
                    {/* Header */}
                    <div className="mb-7 flex flex-col items-center text-center">
                        <div className="mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.4rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-1 shadow-lg shadow-emerald-900/10 ring-4 ring-emerald-50">
                            <Image src={SITE_LOGO} alt="Al-Insaf" width={68} height={68} priority className="h-full w-full rounded-xl object-contain" />
                        </div>

                        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-800">
                            {bn ? "আল-ইনসাফ • সদস্য পোর্টাল" : "AL-INSAAF • MEMBER PORTAL"}
                        </p>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                            {bn ? "সদস্য লগইন" : "Member Login"}
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            {bn
                                ? "আল ইনসাফ ইনভেস্টমেন্ট সোসাইটি"
                                : "Al-Insaf Investment Society"}
                        </p>

                        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-xs font-bold text-emerald-900">
                            <ShieldCheck size={14} />
                            {bn ? "নিরাপদ সদস্য প্রবেশ" : "Secure member access"}
                        </span>
                    </div>

                    {/* Login form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-2 block text-sm font-bold text-slate-800"
                            >
                                {bn ? "ইমেইল বা সদস্য আইডি" : "Email or Member ID"}
                            </label>

                            <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 transition focus-within:border-emerald-700 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-700/10">
                                <Mail size={19} className="shrink-0 text-slate-500" />

                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    autoComplete="username"
                                    placeholder={bn ? "ইমেইল বা সদস্য আইডি লিখুন" : "Enter email or member ID"}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="min-w-0 flex-1 bg-transparent py-4 text-base text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-bold text-slate-800"
                            >
                                {bn ? "পাসওয়ার্ড" : "Password"}
                            </label>

                            <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 transition focus-within:border-emerald-700 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-700/10">
                                <LockKeyhole
                                    size={19}
                                    className="shrink-0 text-slate-500"
                                />

                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder={
                                        bn ? "আপনার পাসওয়ার্ড" : "Enter your password"
                                    }
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="min-w-0 flex-1 bg-transparent py-4 text-base text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    aria-label={
                                        showPassword
                                            ? bn
                                                ? "পাসওয়ার্ড লুকান"
                                                : "Hide password"
                                            : bn
                                                ? "পাসওয়ার্ড দেখুন"
                                                : "Show password"
                                    }
                                    className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                                >
                                    {showPassword ? (
                                        <EyeOff size={19} />
                                    ) : (
                                        <Eye size={19} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div
                                role="alert"
                                aria-live="polite"
                                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-800"
                            >
                                {error}
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:-translate-y-0.5 hover:from-emerald-900 hover:to-emerald-800 hover:shadow-xl focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? (
                                <>
                                    <LoaderCircle size={19} className="animate-spin" />
                                    {bn ? "যাচাই করা হচ্ছে..." : "Verifying..."}
                                </>
                            ) : (
                                <>
                                    <Users size={19} />
                                    {bn ? "সদস্য হিসেবে লগইন" : "Login as Member"}
                                </>
                            )}
                        </button>
                    </form>

                    <div className="my-6 flex items-center gap-3 text-xs font-medium text-slate-400">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span>{bn ? "অথবা" : "OR"}</span>
                        <span className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* Admin login */}
                    <p className="text-center text-sm text-slate-600">
                        {bn ? "আপনি কি প্রশাসক?" : "Are you an administrator?"}{" "}

                        <Link
                            href="/admin/login"
                            className="font-bold text-emerald-800 underline-offset-4 hover:underline"
                        >
                            {bn ? "অ্যাডমিন লগইন" : "Admin Login"}
                        </Link>
                    </p>
                    </div>
                </section>

                {/* Footer */}
                <p className="mt-6 text-center text-xs font-medium text-slate-500">
                    © {new Date().getFullYear()} Al-Insaf Investment Society
                </p>
            </div>
        </main>
    );
}