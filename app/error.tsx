"use client";
// বাংলা: কোনো পেজে runtime error হলে ব্যবহারযোগ্য recovery interface দেখায়।

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);

    useEffect(() => {
        console.error("Application route failed:", error);
    }, [error]);

    return (
        <main
            id="main-content"
            className="app-background neon-ui flex min-h-dvh items-center justify-center px-4 py-12"
        >
            <section className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white/90 p-8 text-center shadow-xl shadow-rose-950/5 backdrop-blur sm:p-12 dark:border-rose-900/50 dark:bg-slate-900/90">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">
                    <AlertTriangle size={30} aria-hidden="true" />
                </div>
                <h1 className="mt-6 text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">
                    {t("Something went wrong")}
                </h1>
                <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600 dark:text-slate-300">
                    {t("An unexpected error occurred. Please try again.")}
                </p>
                {error.digest && (
                    <p className="mt-4 text-xs text-slate-500">
                        {t("Reference")}: {error.digest}
                    </p>
                )}
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                        <RefreshCw size={17} aria-hidden="true" />
                        {t("Try again")}
                    </button>
                    <Link
                        href="/"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        {t("Return to home")}
                    </Link>
                </div>
            </section>
        </main>
    );
}
