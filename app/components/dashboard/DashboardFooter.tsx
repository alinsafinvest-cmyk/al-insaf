"use client";
// বাংলা: সব অ্যাডমিন ও সদস্য ড্যাশবোর্ডে একই পরিচিতিমূলক ফুটার দেখায়।

import { useLanguage } from "@/context/LanguageContext";

// সব অ্যাডমিন ও সদস্য ড্যাশবোর্ডে একই পরিচিতিমূলক ফুটার দেখায়।
// বাংলা: dashboard-এর shared copyright footer দেখায়।
export default function DashboardFooter() {
    const { bn } = useLanguage();

    return (
        <footer className="mt-auto border-t border-emerald-200/70 bg-white/70 px-4 py-5 text-center text-sm text-slate-600 backdrop-blur dark:border-emerald-900/50 dark:bg-slate-950/50 dark:text-slate-400 sm:px-6">
            <p>
                © {new Date().getFullYear()} আল-ইনসাফ ইনভেস্টমেন্ট সোসাইটি
                <span className="mx-2 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
                    ·
                </span>
                {bn ? "সকল অধিকার সংরক্ষিত" : "All rights reserved"}
            </p>
        </footer>
    );
}
