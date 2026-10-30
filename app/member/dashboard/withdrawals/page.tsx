"use client";
// বাংলা: এই member পেজে dashboard → withdrawals সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";
import { BANGLADESH_PAYMENT_METHODS } from "@/lib/payment-methods";
import { openOfficialReceipt } from "@/lib/transaction-receipt";
import { SITE_LOGO } from "@/lib/site-branding";
import {
    ArrowDownToLine,
    History,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    LoaderCircle,
    Plus,
    Printer,
} from "lucide-react";

interface Withdrawal {
    _id: string;
    amount: number;
    date: string;
    note?: string;
    paymentMethod?: string;
    accountNumber?: string;
    transactionId?: string;
    receiptId?: string;
    memberId?: string;
    memberName?: string;
    memberPhone?: string;
    approvedBy?: string;
    approvedAt?: string;
    status: "approved" | "pending" | "rejected";
}

interface WithdrawalData {
    withdrawals: Withdrawal[];
    totalApproved: number;
    totalPending: number;
    totalTransactions: number;
}

const money = (amount: number, language: "bn" | "en") =>
    new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 2,
    }).format(amount);

// বাংলা: এই component member withdrawal request form ও withdrawal history পরিচালনা করে।
export default function MyWithdrawalsPage() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);
    const printReceipt = (withdrawal: Withdrawal) => {
        if (withdrawal.status !== "approved") return;

        const opened = openOfficialReceipt({
            kind: "withdrawal",
            receiptId: withdrawal.receiptId || `WRC-${withdrawal.transactionId || withdrawal._id}`,
            transactionId: withdrawal.transactionId || "-",
            referenceId: withdrawal.transactionId || withdrawal._id,
            memberId: withdrawal.memberId,
            memberName: withdrawal.memberName,
            memberPhone: withdrawal.memberPhone,
            date: withdrawal.date,
            paymentMethod: withdrawal.paymentMethod,
            paymentReference: withdrawal.transactionId,
            amount: withdrawal.amount,
            description: withdrawal.note,
            approvedBy: withdrawal.approvedBy,
            approvedAt: withdrawal.approvedAt,
        }, language, SITE_LOGO);

        if (!opened) {
            window.alert(t("Popup blocked. Please allow popups in your browser."));
        }
    };
    const [data, setData] = useState<WithdrawalData>({
        withdrawals: [],
        totalApproved: 0,
        totalPending: 0,
        totalTransactions: 0,
    });

    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<string>("bKash");
    const [accountNumber, setAccountNumber] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadWithdrawals = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/member/withdrawals", {
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || (language === "bn" ? "তথ্য লোড করা যায়নি" : "Unable to load data"));
            }

            setData(result);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : language === "bn" ? "তথ্য লোড করা যায়নি" : "Unable to load data"
            );
        } finally {
            setLoading(false);
        }
    }, [language]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadWithdrawals();
        }, 0);

        return () => clearTimeout(timer);
    }, [loadWithdrawals]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const response = await fetch("/api/member/withdrawals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: Number(amount),
                    note,
                    paymentMethod,
                    accountNumber,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || (language === "bn" ? "Request জমা দেওয়া যায়নি" : "Unable to submit the request"));
            }

            setSuccess(result.message || (language === "bn" ? "Request জমা হয়েছে" : "Request submitted"));
            setAmount("");
            setNote("");
            setAccountNumber("");

            await loadWithdrawals();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : language === "bn" ? "একটি সমস্যা হয়েছে" : "An error occurred"
            );
        } finally {
            setSaving(false);
        }
    }

    const statusInfo = {
        approved: {
            label: t("Approved"),
            icon: CheckCircle2,
            className:
                "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
        },
        pending: {
            label: t("Pending"),
            icon: Clock,
            className:
                "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
        },
        rejected: {
            label: t("Rejected"),
            icon: XCircle,
            className:
                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
        },
    };

    return (
        <main className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t("My Withdrawals")}
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t("Your withdrawal request and history")}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void loadWithdrawals()}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                    <RefreshCw size={16} />
                    {t("Refresh")}
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <SummaryCard
                    title={t("Approved Withdrawal")}
                    value={money(data.totalApproved, language)}
                    icon={<ArrowDownToLine size={22} />}
                    color="red"
                />

                <SummaryCard
                    title={t("Pending Request")}
                    value={money(data.totalPending, language)}
                    icon={<Clock size={22} />}
                    color="amber"
                />

                <SummaryCard
                    title={t("Total Requests")}
                    value={String(data.totalTransactions)}
                    icon={<History size={22} />}
                    color="blue"
                />
            </div>

            {/* Request form */}
            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                    <Plus size={20} />
                    {t("New Withdrawal Request")}
                </h2>

                <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm font-medium dark:text-gray-200">
                            {t("Amount (৳) *")}
                        </label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="1000"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium dark:text-gray-200">
                            {t("Payout method *")}
                        </label>
                        <select
                            required
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value)}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        >
                            {BANGLADESH_PAYMENT_METHODS.map((method) => (
                                <option key={method} value={method}>{method}</option>
                            ))}
                        </select>
                    </div>

                    {paymentMethod !== "Cash" && (
                        <div>
                            <label className="mb-2 block text-sm font-medium dark:text-gray-200">
                                {t("Recipient phone/bank account *")}
                            </label>
                            <input
                                required
                                value={accountNumber}
                                onChange={(event) => setAccountNumber(event.target.value)}
                                maxLength={80}
                                autoComplete="off"
                                placeholder={paymentMethod === "Bank Transfer" ? t("Bank account number") : "01XXXXXXXXX"}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            />
                        </div>
                    )}

                    <div>
                        <label className="mb-2 block text-sm font-medium dark:text-gray-200">
                            {t("Reason / Description")}
                        </label>
                        <input
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            maxLength={500}
                            placeholder={t("Reason for withdrawal")}
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-red-600 md:col-span-2">
                            {t(error)}
                        </p>
                    )}

                    {success && (
                        <p role="status" className="text-sm text-emerald-600 md:col-span-2">
                            {t(success)}
                        </p>
                    )}

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            disabled={saving || loading}
                            className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                            {saving ? (
                                <LoaderCircle size={18} className="animate-spin" />
                            ) : (
                                <Plus size={18} />
                            )}
                            {saving ? t("Submitting...") : t("Submit Request")}
                        </button>
                    </div>
                </form>

                <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {t("Your withdrawal will not be completed until the admin approves your request.")}
                </p>
            </section>

            {/* History table */}
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b border-gray-200 p-5 dark:border-gray-800">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t("Withdrawal History")}
                    </h2>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <LoaderCircle className="animate-spin text-emerald-600" />
                    </div>
                ) : error && data.withdrawals.length === 0 ? (
                    <p className="p-8 text-center text-red-600">{t(error)}</p>
                ) : data.withdrawals.length === 0 ? (
                    <div className="p-12 text-center">
                        <History size={38} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium text-gray-700 dark:text-gray-200">
                            {t("No withdrawal records yet")}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                            {t("New requests will appear here.")}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                <tr>
                                    <th className="whitespace-nowrap px-5 py-4">{t("Date")}</th>
                                    <th className="px-5 py-4">{t("Description")}</th>
                                    <th className="whitespace-nowrap px-5 py-4">{t("Payment method")}</th>
                                    <th className="whitespace-nowrap px-5 py-4">{t("Recipient account")}</th>
                                    <th className="whitespace-nowrap px-5 py-4">{t("Amount")}</th>
                                    <th className="px-5 py-4">{t("Status")}</th>
                                    <th className="px-5 py-4">{t("Action")}</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {data.withdrawals.map((item) => {
                                    const status = statusInfo[item.status];
                                    const StatusIcon = status.icon;

                                    return (
                                        <tr key={item._id}>
                                            <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                                                {new Date(item.date).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB")}
                                            </td>

                                            <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                                                {item.note || t("Withdrawal Request")}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                                                {item.paymentMethod || "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                                                {item.accountNumber || "—"}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4 font-semibold text-red-600">
                                                −{money(item.amount, language)}
                                            </td>

                                            <td className="whitespace-nowrap px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                                                >
                                                    <StatusIcon size={14} />
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4">
                                                {item.status === "approved" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => printReceipt(item)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                                                        aria-label={t("Print Receipt")}
                                                    >
                                                        <Printer size={14} />
                                                        {t("Receipt")}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}

function SummaryCard({
    title,
    value,
    icon,
    color,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: "red" | "amber" | "blue";
}) {
    const colors = {
        red: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
        amber:
            "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
        blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
    };

    return (
        <div className={`rounded-2xl border border-gray-200 p-5 dark:border-gray-800 ${colors[color]}`}>
            <div className="mb-3">{icon}</div>
            <p className="text-sm opacity-80">{title}</p>
            <h2 className="mt-1 break-words text-xl font-bold">{value}</h2>
        </div>
    );
}