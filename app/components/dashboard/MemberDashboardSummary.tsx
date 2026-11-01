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
    ArrowRight,
    Clock3,
} from "lucide-react";
import Link from "next/link";

type RecentTransaction = {
    _id: string;
    transactionId?: string;
    type: "deposit" | "withdrawal" | "loan" | "loan_payment";
    amount: number;
    date: string;
    note?: string;
    status: "pending" | "approved" | "rejected";
};

type DashboardData = {
    totalDeposit: number;
    totalWithdrawal: number;
    totalLoan: number;
    totalLoanPayment: number;
    currentBalance: number;
    pendingTransactions: number;
    totalTransactions: number;
    recentTransactions: RecentTransaction[];
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
            } catch (error) {
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
        <div className="space-y-6">
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

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div>
                        <h2 className="font-bold text-slate-900 dark:text-white">
                            {bn ? "সাম্প্রতিক লেনদেন" : "Recent transactions"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {bn
                                ? `${data.totalTransactions.toLocaleString("bn-BD")}টি লেনদেন · ${data.pendingTransactions.toLocaleString("bn-BD")}টি অপেক্ষমাণ`
                                : `${data.totalTransactions.toLocaleString("en-BD")} transactions · ${data.pendingTransactions.toLocaleString("en-BD")} pending`}
                        </p>
                    </div>
                    <Link
                        href="/member/dashboard/transactions"
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                    >
                        {bn ? "সব লেনদেন" : "All transactions"}
                        <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                </div>

                {data.recentTransactions.length ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.recentTransactions.map((transaction) => {
                            const isCredit =
                                transaction.type === "deposit" ||
                                transaction.type === "loan_payment";
                            const typeLabels = {
                                deposit: bn ? "জমা" : "Deposit",
                                withdrawal: bn ? "উত্তোলন" : "Withdrawal",
                                loan: bn ? "ঋণ" : "Loan",
                                loan_payment: bn ? "ঋণ পরিশোধ" : "Loan repayment",
                            };
                            const statusLabels = {
                                pending: bn ? "অপেক্ষমাণ" : "Pending",
                                approved: bn ? "অনুমোদিত" : "Approved",
                                rejected: bn ? "বাতিল" : "Rejected",
                            };

                            return (
                                <div
                                    key={transaction._id}
                                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-emerald-700 dark:bg-slate-800 dark:text-emerald-300">
                                            {transaction.status === "pending" ? (
                                                <Clock3 size={18} />
                                            ) : isCredit ? (
                                                <ArrowDownToLine size={18} />
                                            ) : (
                                                <ArrowUpFromLine size={18} />
                                            )}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
                                                {typeLabels[transaction.type]}
                                            </span>
                                            <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">
                                                {transaction.note ||
                                                    transaction.transactionId ||
                                                    new Date(transaction.date).toLocaleDateString(
                                                        language === "bn" ? "bn-BD" : "en-GB"
                                                    )}
                                            </span>
                                        </span>
                                    </div>
                                    <span className="shrink-0 text-right">
                                        <span className={`block text-sm font-bold ${isCredit ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>
                                            {isCredit ? "+" : "−"} ৳{" "}
                                            {Number(transaction.amount || 0).toLocaleString(
                                                language === "bn" ? "bn-BD" : "en-BD"
                                            )}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                                            {statusLabels[transaction.status]}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="px-5 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {bn ? "এখনো কোনো লেনদেন নেই।" : "No transactions yet."}
                    </p>
                )}
            </section>
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