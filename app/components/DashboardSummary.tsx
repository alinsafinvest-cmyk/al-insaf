"use client";
// বাংলা: এই shared UI component-এ DashboardSummary অংশের display ও interaction পরিচালিত হয়।

import { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface Summary {
    totalMembers: number;
    transactionCount: number;

    totals: {
        deposit: number;
        withdrawal: number;
        loan: number;
        loan_payment: number;
    };

    counts: {
        deposit: number;
        withdrawal: number;
        loan: number;
        loan_payment: number;
    };

    balance: number;
}

interface DashboardResponse {
    success: boolean;
    message?: string;
    dashboard: Summary;
}

const money = (amount: number) =>
    new Intl.NumberFormat("bn-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 2,
    }).format(amount || 0);

// বাংলা: admin dashboard-এর মূল পরিসংখ্যান দেখায়।
export default function DashboardSummary() {
    const { bn } = useLanguage();
    const [data, setData] = useState<Summary | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSummary = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch("/api/dashboard", {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                });

                const result: DashboardResponse = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "ড্যাশবোর্ডের ডেটা লোড করা যায়নি"
                    );
                }

                if (!result.dashboard) {
                    throw new Error("Dashboard data পাওয়া যায়নি");
                }

                setData(result.dashboard);
            } catch (err) {
                console.error("Dashboard summary error:", err);

                setError(
                    err instanceof Error
                        ? err.message
                        : "ড্যাশবোর্ডের ডেটা লোড করা যায়নি"
                );
            } finally {
                setLoading(false);
            }
        };

        void loadSummary();
    }, []);

    // Loading
    if (loading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                        key={item}
                        className="h-28 animate-pulse rounded-xl bg-gray-200"
                    />
                ))}
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
                <p className="font-semibold">
                    ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে
                </p>

                <p className="mt-1 text-sm">
                    {error}
                </p>
            </div>
        );
    }

    // No data
    if (!data) {
        return (
            <div className="rounded-xl bg-white p-6 text-gray-500 shadow-sm">
                কোনো ডেটা পাওয়া যায়নি।
            </div>
        );
    }

    const cards = [
        {
            label: bn ? "মোট সদস্য" : "Total Members",
            value: data.totalMembers.toLocaleString(bn ? "bn-BD" : "en-US"),
        },
        {
            label: bn ? "মোট জমা" : "Total Deposits",
            value: money(data.totals.deposit),
        },
        {
            label: bn ? "মোট উত্তোলন" : "Total Withdrawals",
            value: money(data.totals.withdrawal),
        },
        {
            label: bn ? "মোট ঋণ" : "Total Loans",
            value: money(data.totals.loan),
        },
        {
            label: bn ? "ঋণ পরিশোধ" : "Loan Repayments",
            value: money(data.totals.loan_payment),
        },
        {
            label: bn ? "হিসাব অনুযায়ী ব্যালেন্স" : "Current Balance",
            value: money(data.balance),
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                >
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {card.label}
                    </p>

                    <h2 className="mt-2 break-all text-xl font-bold text-gray-900 dark:text-white">
                        {card.value}
                    </h2>
                </div>
            ))}
        </div>
    );
}