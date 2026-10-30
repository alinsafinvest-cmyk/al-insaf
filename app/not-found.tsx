"use client";
// বাংলা: ভুল বা অনুপস্থিত URL-এর জন্য পরিচ্ছন্ন, bilingual 404 পেজ দেখায়।

import Link from "next/link";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

export default function NotFound() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);

    return (
        <main
            id="main-content"
            className="app-background neon-ui flex min-h-dvh items-center justify-center px-4 py-12"
        >
            <section className="w-full max-w-xl rounded-3xl border border-emerald-100 bg-white/90 p-8 text-center shadow-xl shadow-emerald-950/5 backdrop-blur sm:p-12 dark:border-emerald-900/50 dark:bg-slate-900/90">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                    <SearchX size={30} aria-hidden="true" />
                </div>
                <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                    404
                </p>
                <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl dark:text-white">
                    {t("Page not found")}
                </h1>
                <p className="mx-auto mt-3 max-w-md leading-7 text-slate-600 dark:text-slate-300">
                    {t("The page may have moved, or the address may be incorrect.")}
                </p>
                <Link
                    href="/"
                    className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                >
                    {language === "bn" ? <Home size={18} /> : <ArrowLeft size={18} />}
                    {t("Return to home")}
                </Link>
            </section>
        </main>
    );
}
