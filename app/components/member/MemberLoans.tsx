"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HandCoins, RefreshCw, ArrowRight, CircleDollarSign } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type LoanRecord = {
    _id: string;
    type: "loan" | "loan_payment";
    amount: number;
    date: string;
    note?: string;
    status: "pending" | "approved" | "rejected";
    transactionId?: string;
};

type LoanData = {
    transactions: LoanRecord[];
    totalLoan: number;
    totalPaid: number;
    remainingLoan: number;
    pendingLoan: number;
};

export default function MemberLoans() {
    const { language, bn } = useLanguage();
    const [data, setData] = useState<LoanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadLoans = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/member/loans", {
                cache: "no-store",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                        (bn ? "ঋণের তথ্য লোড করা যায়নি" : "Unable to load loan details")
                );
            }

            setData({
                transactions: Array.isArray(result.transactions) ? result.transactions : [],
                totalLoan: Number(result.totalLoan) || 0,
                totalPaid: Number(result.totalPaid) || 0,
                remainingLoan: Number(result.remainingLoan) || 0,
                pendingLoan: Number(result.pendingLoan) || 0,
            });
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : bn
                        ? "ঋণের তথ্য লোড করা যায়নি"
                        : "Unable to load loan details"
            );
        } finally {
            setLoading(false);
        }
    }, [bn]);

    useEffect(() => {
        const timer = setTimeout(() => void loadLoans(), 0);
        return () => clearTimeout(timer);
    }, [loadLoans]);

    const loans = useMemo(
        () => data?.transactions.filter((record) => record.type === "loan") ?? [],
        [data]
    );
    const repayments = useMemo(
        () => data?.transactions.filter((record) => record.type === "loan_payment") ?? [],
        [data]
    );
    const money = (amount: number) =>
        new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", {
            style: "currency",
            currency: "BDT",
            maximumFractionDigits: 2,
        }).format(amount);
    const date = (value: string) => {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime())
            ? value
            : parsed.toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB");
    };

    const renderRows = (records: LoanRecord[], empty: string) => {
        if (!records.length) {
            return (
                <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {empty}
                </p>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        <tr>
                            <th className="p-3">{bn ? "তারিখ" : "Date"}</th>
                            <th className="p-3">{bn ? "বিবরণ" : "Details"}</th>
                            <th className="p-3">{bn ? "পরিমাণ" : "Amount"}</th>
                            <th className="p-3">{bn ? "অবস্থা" : "Status"}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((record) => (
                            <tr
                                key={record._id}
                                className="border-t border-slate-100 dark:border-slate-700"
                            >
                                <td className="whitespace-nowrap p-3 text-slate-600 dark:text-slate-300">
                                    {date(record.date)}
                                </td>
                                <td className="p-3 text-slate-700 dark:text-slate-200">
                                    {record.note || record.transactionId || "—"}
                                </td>
                                <td className="whitespace-nowrap p-3 font-semibold text-slate-900 dark:text-white">
                                    {money(record.amount)}
                                </td>
                                <td className="p-3">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        record.status === "approved"
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                            : record.status === "pending"
                                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                    }`}>
                                        {bn
                                            ? record.status === "approved"
                                                ? "অনুমোদিত"
                                                : record.status === "pending"
                                                    ? "অপেক্ষমাণ"
                                                    : "বাতিল"
                                            : record.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <main className="space-y-6 p-3 sm:p-4 xl:p-6">
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <HandCoins size={24} aria-hidden="true" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                            {bn ? "ঋণ ও পরিশোধ" : "Loans & repayments"}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {bn
                                ? "আপনার ঋণের হিসাব ও পরিশোধের অবস্থা দেখুন।"
                                : "Review your loan balance and repayment history."}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void loadLoans()}
                    disabled={loading}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    {bn ? "রিফ্রেশ" : "Refresh"}
                </button>
            </section>

            {error && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                    <p>{error}</p>
                    <button type="button" onClick={() => void loadLoans()} className="mt-3 font-semibold underline">
                        {bn ? "আবার চেষ্টা করুন" : "Try again"}
                    </button>
                </div>
            )}

            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={bn ? "লোড হচ্ছে" : "Loading"}>
                    {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    ))}
                </div>
            ) : data && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                            { label: bn ? "অনুমোদিত ঋণ" : "Approved loans", value: data.totalLoan },
                            { label: bn ? "অনুমোদিত পরিশোধ" : "Approved repayments", value: data.totalPaid },
                            { label: bn ? "বাকি ঋণ" : "Outstanding balance", value: data.remainingLoan },
                            { label: bn ? "অপেক্ষমাণ ঋণ" : "Pending loans", value: data.pendingLoan },
                        ].map((item) => (
                            <section key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                                <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{money(item.value)}</p>
                            </section>
                        ))}
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                        <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                            <CircleDollarSign size={19} className="text-emerald-600" />
                            {bn ? "ঋণের রেকর্ড" : "Loan records"}
                        </h2>
                        {renderRows(
                            loans,
                            bn ? "কোনো ঋণের রেকর্ড নেই।" : "No loan records yet."
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
                        <h2 className="mb-4 font-bold text-slate-900 dark:text-white">
                            {bn ? "পরিশোধের রেকর্ড" : "Repayment records"}
                        </h2>
                        {renderRows(
                            repayments,
                            bn ? "কোনো পরিশোধের রেকর্ড নেই।" : "No repayment records yet."
                        )}
                    </section>
                </>
            )}

            <Link
                href="/member/dashboard"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
                {bn ? "ড্যাশবোর্ডে ফিরুন" : "Back to dashboard"}
                <ArrowRight size={16} aria-hidden="true" />
            </Link>
        </main>
    );
}
