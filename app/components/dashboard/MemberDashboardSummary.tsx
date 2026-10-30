"use client";
// বাংলা: এই shared UI component-এ MemberDashboardSummary অংশের display ও interaction পরিচালিত হয়।

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";
import {
    Wallet,
    ArrowDownToLine,
    ArrowUpFromLine,
    HandCoins,
} from "lucide-react";

type DashboardData = {
    totalDeposit: number;
    totalWithdrawal: number;
    totalLoan: number;
    currentBalance: number;
};

// বাংলা: সদস্যের account summary ও dashboard data দেখায়।
export default function MemberDashboardSummary() {
    const { bn, language } = useLanguage();
    const [data, setData] =
        useState<DashboardData | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        async function loadDashboard() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    "/api/member/dashboard",
                    {
                        cache: "no-store",
                    }
                );

                const result =
                    await response.json();

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.message ||
                            (bn ? "ড্যাশবোর্ডের তথ্য লোড করা যায়নি" : "Unable to load dashboard data")
                    );
                }

                setData(result.dashboard);
            } catch (error: any) {
                console.error(
                    "Member Dashboard error:",
                    error
                );

                setError(
                    translate(
                        language,
                        error instanceof Error
                            ? error.message
                            : "Unable to load dashboard data",
                    ),
                );
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, [bn, language]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                {[1, 2, 3, 4].map((item) => (
                    <div
                        key={item}
                        className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
                    />
                ))}

            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                {error}
            </div>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard
                title={bn ? "মোট জমা" : "Total Deposit"}
                value={data.totalDeposit}
                locale={bn ? "bn-BD" : "en-BD"}
                icon={<ArrowDownToLine size={21} />}
            />

            <SummaryCard
                title={bn ? "মোট উত্তোলন" : "Total Withdrawal"}
                value={data.totalWithdrawal}
                locale={bn ? "bn-BD" : "en-BD"}
                icon={<ArrowUpFromLine size={21} />}
            />

            <SummaryCard
                title={bn ? "মোট ঋণ" : "Total Loan"}
                value={data.totalLoan}
                locale={bn ? "bn-BD" : "en-BD"}
                icon={<HandCoins size={21} />}
            />

            <SummaryCard
                title={bn ? "বর্তমান ব্যালেন্স" : "Current Balance"}
                value={data.currentBalance}
                locale={bn ? "bn-BD" : "en-BD"}
                icon={<Wallet size={21} />}
            />

        </div>
    );
}

function SummaryCard({
    title,
    value,
    icon,
    locale,
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    locale: string;
}) {
    return (
        <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-900">

            <div className="flex items-center justify-between">

                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {title}
                    </p>

                    <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        ৳{" "}
                        {Number(value || 0).toLocaleString(locale)}
                    </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950/30 dark:text-emerald-300">
                    {icon}
                </div>

            </div>

        </div>
    );
}