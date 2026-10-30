"use client";
// বাংলা: এই shared UI component-এ MemberDashboardWelcome অংশের display ও interaction পরিচালিত হয়।

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { ArrowDownToLine, ArrowUpFromLine, Sparkles } from "lucide-react";

// বাংলা: সদস্যকে স্বাগত ও account-এর সংক্ষিপ্ত পরিচিতি দেখায়।
export default function MemberDashboardWelcome() {
    const { bn } = useLanguage();

    return (
        <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/70 to-white p-5 shadow-sm dark:border-emerald-900/50 dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-900 sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 -z-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                        <Sparkles size={14} />
                        {bn ? "আবারও স্বাগতম" : "Welcome back"}
                    </p>
                    <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                        {bn ? "সদস্য ড্যাশবোর্ড" : "Member Dashboard"}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {bn ? "আপনার সঞ্চয়, লেনদেন ও অ্যাকাউন্টের তথ্য এক জায়গা থেকে দেখুন।" : "View your savings, transactions and account information in one place."}
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
                    <Link
                        href="/member/dashboard/deposits"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                        <ArrowDownToLine size={18} />
                        {bn ? "জমার তথ্য" : "Deposits"}
                    </Link>
                    <Link
                        href="/member/dashboard/withdrawals"
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-emerald-700/25 bg-white/80 px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700/50 hover:bg-emerald-50 hover:shadow-md dark:border-emerald-400/25 dark:bg-slate-900/70 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                    >
                        <ArrowUpFromLine size={18} />
                        {bn ? "উত্তোলন" : "Withdraw"}
                    </Link>
                </div>
            </div>
        </div>
    );
}
