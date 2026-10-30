"use client";
// বাংলা: এই member পেজে dashboard → transactions সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Banknote,
    CalendarDays,
    RefreshCw,
    Search,
    Wallet,
} from "lucide-react";

type TransactionType =
    | "deposit"
    | "withdrawal"
    | "loan"
    | "loan_payment";

type TransactionStatus = "pending" | "approved" | "rejected";

interface Transaction {
    _id: string;
    transactionId?: string;
    type: TransactionType;
    amount: number;
    date: string;
    note?: string;
    status: TransactionStatus;
}

interface Summary {
    totalDeposit: number;
    totalWithdrawal: number;
    totalLoan: number;
    totalLoanPayment: number;
}

const typeLabels: Record<TransactionType, string> = {
    deposit: "Deposit",
    withdrawal: "Withdrawal",
    loan: "Loan",
    loan_payment: "Loan Payment",
};

const statusLabels: Record<TransactionStatus, string> = {
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
};

const taka = (amount: number, language: "bn" | "en") =>
    new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-GB", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 2,
    }).format(amount);

// বাংলা: এই component member-এর transaction history তালিকা ও সংশ্লিষ্ট status দেখায়।
export default function MemberTransactionsPage() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [summary, setSummary] = useState<Summary>({
        totalDeposit: 0,
        totalWithdrawal: 0,
        totalLoan: 0,
        totalLoanPayment: 0,
    });

    const [filterType, setFilterType] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadTransactions = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/member/transactions", {
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load transaction data");
            }

            setTransactions(data.transactions || []);
            setSummary(data.summary || {
                totalDeposit: 0,
                totalWithdrawal: 0,
                totalLoan: 0,
                totalLoanPayment: 0,
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err instanceof TypeError
                        ? "Unable to connect to the server."
                        : err.message
                    : "An error occurred"
            );
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadTransactions();
        }, 0);

        return () => clearTimeout(timer);
    }, [loadTransactions]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            const matchesType =
                filterType === "all" || transaction.type === filterType;

            const matchesStatus =
                filterStatus === "all" ||
                transaction.status === filterStatus;

            const searchText = search.toLowerCase();

            const matchesSearch =
                (transaction.note || "").toLowerCase().includes(searchText) ||
                (transaction.transactionId || "")
                    .toLowerCase()
                    .includes(searchText) ||
                typeLabels[transaction.type].toLowerCase().includes(searchText);

            return matchesType && matchesStatus && matchesSearch;
        });
    }, [transactions, filterType, filterStatus, search]);

    function getAmountPrefix(type: TransactionType) {
        return type === "deposit" || type === "loan" ? "+" : "−";
    }

    function getAmountColor(type: TransactionType) {
        return type === "deposit" || type === "loan"
            ? "text-emerald-600"
            : "text-rose-600";
    }

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-5 lg:p-8 dark:bg-gray-950">
            <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
                            {t("Transaction History")}
                        </h1>
                        <p className="mt-1 text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                            {t("Your complete deposit, withdrawal, and loan history")}
                        </p>
                    </div>

                    <button
                        onClick={loadTransactions}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 sm:px-4 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {t("Refresh")}
                    </button>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                        {t(error)}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        title={t("Total Deposits")}
                        amount={summary.totalDeposit}
                        language={language}
                        icon={<ArrowDownLeft size={20} />}
                        color="emerald"
                    />

                    <SummaryCard
                        title={t("Total Withdrawals")}
                        amount={summary.totalWithdrawal}
                        language={language}
                        icon={<ArrowUpRight size={20} />}
                        color="rose"
                    />

                    <SummaryCard
                        title={t("Total Loans")}
                        amount={summary.totalLoan}
                        language={language}
                        icon={<Wallet size={20} />}
                        color="blue"
                    />

                    <SummaryCard
                        title={t("Total Loan Payments")}
                        amount={summary.totalLoanPayment}
                        language={language}
                        icon={<Banknote size={20} />}
                        color="violet"
                    />
                </div>

                {/* Filters */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="relative">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t("Search notes or transaction IDs")}
                                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            />
                        </div>

                        <select
                            value={filterType}
                            onChange={(event) => setFilterType(event.target.value)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        >
                            <option value="all">{t("All Transactions")}</option>
                            <option value="deposit">{t("Deposits")}</option>
                            <option value="withdrawal">{t("Withdrawals")}</option>
                            <option value="loan">{t("Loans")}</option>
                            <option value="loan_payment">{t("Loan Payments")}</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(event) => setFilterStatus(event.target.value)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        >
                            <option value="all">{t("All statuses")}</option>
                            <option value="approved">{t("Approved")}</option>
                            <option value="pending">{t("Pending")}</option>
                            <option value="rejected">{t("Rejected")}</option>
                        </select>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            {t("All Transactions")}
                        </h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredTransactions.length} {t("records")}
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-gray-500">
                            {t("Loading transactions...")}
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="p-10 text-center">
                            <Wallet className="mx-auto mb-3 text-gray-400" size={32} />
                            <p className="font-medium text-gray-700 dark:text-gray-200">
                                {t("No transactions found")}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                                {t("Try changing the filters and search again.")}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[720px] text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                                        <tr>
                                            <th className="px-5 py-3 font-medium">{t("Date")}</th>
                                            <th className="px-5 py-3 font-medium">{t("Transaction")}</th>
                                            <th className="px-5 py-3 font-medium">{t("Transaction ID")}</th>
                                            <th className="px-5 py-3 font-medium">{t("Amount")}</th>
                                            <th className="px-5 py-3 font-medium">{t("Status")}</th>
                                            <th className="px-5 py-3 font-medium">{t("Note")}</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {filteredTransactions.map((transaction) => (
                                            <tr
                                                key={transaction._id}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800/40"
                                            >
                                                <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                                                    <span className="inline-flex items-center gap-2">
                                                        <CalendarDays size={15} />
                                                        {new Date(transaction.date).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB")}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-800 dark:text-gray-200">
                                                    {t(typeLabels[transaction.type])}
                                                </td>

                                                <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                                                    {transaction.transactionId || "—"}
                                                </td>

                                                <td
                                                    className={`whitespace-nowrap px-5 py-4 font-semibold ${getAmountColor(transaction.type)}`}
                                                >
                                                    {getAmountPrefix(transaction.type)}
                                                    {taka(transaction.amount, language)}
                                                </td>

                                                <td className="px-5 py-4">
                                                    <StatusBadge status={transaction.status} language={language} />
                                                </td>

                                                <td className="max-w-48 truncate px-5 py-4 text-gray-500 dark:text-gray-400">
                                                    {transaction.note || "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="grid gap-3 p-3 md:hidden">
                                {filteredTransactions.map((transaction) => (
                                    <div
                                        key={transaction._id}
                                        className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/60"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {t(typeLabels[transaction.type])}
                                                </p>
                                                <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <CalendarDays size={12} />
                                                    {new Date(transaction.date).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB")}
                                                </p>
                                            </div>
                                            <StatusBadge status={transaction.status} language={language} />
                                        </div>

                                        <div className="mt-3 space-y-2 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-gray-500 dark:text-gray-400">{t("Transaction ID")}</span>
                                                <span className="truncate text-right font-medium text-gray-700 dark:text-gray-200">
                                                    {transaction.transactionId || "—"}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-gray-500 dark:text-gray-400">{t("Amount")}</span>
                                                <span className={`font-semibold ${getAmountColor(transaction.type)}`}>
                                                    {getAmountPrefix(transaction.type)}
                                                    {taka(transaction.amount, language)}
                                                </span>
                                            </div>

                                            {transaction.note && (
                                                <div className="pt-2 text-gray-600 dark:text-gray-300">
                                                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                        {t("Note")}
                                                    </span>
                                                    <span className="mt-1 block break-words">
                                                        {transaction.note}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function SummaryCard({
    title,
    amount,
    icon,
    color,
    language,
}: {
    title: string;
    amount: number;
    icon: React.ReactNode;
    color: "emerald" | "rose" | "blue" | "violet";
    language: "bn" | "en";
}) {
    const colors = {
        emerald:
            "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
        rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
        blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
        violet:
            "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <div className={`rounded-xl p-2.5 ${colors[color]}`}>{icon}</div>
            </div>
            <p className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                {taka(amount, language)}
            </p>
        </div>
    );
}

function StatusBadge({
    status,
    language,
}: {
    status: TransactionStatus;
    language: "bn" | "en";
}) {
    const styles: Record<TransactionStatus, string> = {
        approved:
            "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
        pending:
            "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
        rejected:
            "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    };

    return (
        <span
            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
        >
            {translate(language, statusLabels[status])}
        </span>
    );
}