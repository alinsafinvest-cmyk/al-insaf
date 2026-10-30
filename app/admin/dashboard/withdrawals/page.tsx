"use client";
// বাংলা: এই admin পেজে dashboard → withdrawals সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { SITE_LOGO } from "@/lib/site-branding";
import { openOfficialReceipt } from "@/lib/transaction-receipt";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

type WithdrawalStatus =
    | "pending"
    | "approved"
    | "rejected";

type PaymentMethod =
    | "Cash"
    | "Bank"
    | "Bank Transfer"
    | "bKash"
    | "Nagad"
    | "Rocket"
    | "Upay"
    | "Other";

interface Withdrawal {
    id: string;
    withdrawalId: string;
    memberId: string;
    memberName: string;
    memberPhone: string;
    amount: number;
    withdrawalDate: string;
    paymentMethod: string;
    accountNumber?: string;
    transactionId: string;
    description: string;
    proofFileId: string;
    proofFileName: string;
    status: WithdrawalStatus;
    submittedBy: string;
    approvedBy: string;
    approvedAt: string;
    rejectedBy: string;
    rejectedAt: string;
    rejectionReason: string;
    receiptId: string;
    sourceSheet: string;
    createdAt: string;
    updatedAt: string;
}

interface SummaryItem {
    count: number;
    amount: number;
}

interface Summary {
    pending: SummaryItem;
    approved: SummaryItem;
    rejected: SummaryItem;
    total: SummaryItem;
}

type TabType =
    | "all"
    | "pending"
    | "approved"
    | "rejected";

/* =========================================================
   Logo
========================================================= */

const LOGO = SITE_LOGO;

/* =========================================================
   Helpers
========================================================= */

function formatMoney(
    amount: number
) {
    return new Intl.NumberFormat(
        "en-BD",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }
    ).format(amount || 0);
}

function formatDate(
    value: string
) {
    if (!value) return "-";

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleDateString(
        "en-BD",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
        }
    );
}

function formatDateTime(
    value: string
) {
    if (!value) return "-";

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return date.toLocaleString(
        "en-BD",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

/* =========================================================
   Page
========================================================= */

// বাংলা: এই component withdrawal request ও payout detail দেখায় এবং approve/reject workflow চালায়।
export default function WithdrawalsPage() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);
    const [
        withdrawals,
        setWithdrawals,
    ] = useState<Withdrawal[]>(
        []
    );

    const [
        summary,
        setSummary,
    ] = useState<Summary>({
        pending: {
            count: 0,
            amount: 0,
        },

        approved: {
            count: 0,
            amount: 0,
        },

        rejected: {
            count: 0,
            amount: 0,
        },

        total: {
            count: 0,
            amount: 0,
        },
    });

    const [
        activeTab,
        setActiveTab,
    ] = useState<TabType>(
        "all"
    );

    const [search, setSearch] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [
        showNewWithdrawal,
        setShowNewWithdrawal,
    ] = useState(false);

    const [
        selectedWithdrawal,
        setSelectedWithdrawal,
    ] =
        useState<Withdrawal | null>(
            null
        );

    const [
        showRejectModal,
        setShowRejectModal,
    ] = useState(false);

    const [
        rejectReason,
        setRejectReason,
    ] = useState("");

    const [
        actionLoading,
        setActionLoading,
    ] = useState(false);

    /* =====================================================
       Form
    ===================================================== */

    const [form, setForm] =
        useState({
            memberId: "",

            amount: "",

            withdrawalDate:
                new Date()
                    .toISOString()
                    .slice(0, 10),

            paymentMethod:
                "Cash" as PaymentMethod,

            transactionId: "",

            proofFileId: "",

            proofFileName: "",

            description: "",
        });

    /* =====================================================
       Load
    ===================================================== */

    const loadWithdrawals =
        useCallback(
            async () => {
                try {
                    setLoading(true);

                    setError("");

                    const response =
                        await fetch(
                            "/api/withdrawals",
                            {
                                method:
                                    "GET",

                                cache:
                                    "no-store",
                            }
                        );

                    const text =
                        await response.text();

                    let data: any;

                    try {
                        data =
                            JSON.parse(
                                text
                            );
                    } catch {
                        throw new Error(
                            `Server JSON response দেয়নি. Status: ${response.status}`
                        );
                    }

                    if (
                        !response.ok
                    ) {
                        throw new Error(
                            data?.message ||
                                "Withdrawal load failed"
                        );
                    }

                    if (
                        !data?.success
                    ) {
                        throw new Error(
                            data?.message ||
                                "Withdrawal API failed"
                        );
                    }

                    setWithdrawals(
                        Array.isArray(
                            data.withdrawals
                        )
                            ? data.withdrawals
                            : []
                    );

                    setSummary(
                        data.summary ||
                            {
                                pending: {
                                    count: 0,
                                    amount: 0,
                                },

                                approved: {
                                    count: 0,
                                    amount: 0,
                                },

                                rejected: {
                                    count: 0,
                                    amount: 0,
                                },

                                total: {
                                    count: 0,
                                    amount: 0,
                                },
                            }
                    );
                } catch (
                    err: any
                ) {
                    console.error(
                        err
                    );

                    setError(
                        err?.message ||
                            "Withdrawal data load failed"
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            []
        );

    useEffect(() => {
        loadWithdrawals();
    }, [loadWithdrawals]);

    /* =====================================================
       Filter
    ===================================================== */

    const visibleWithdrawals =
        useMemo(() => {
            let result =
                [
                    ...withdrawals,
                ];

            if (
                activeTab !==
                "all"
            ) {
                result =
                    result.filter(
                        (item) =>
                            item.status ===
                            activeTab
                    );
            }

            const q =
                search
                    .trim()
                    .toLowerCase();

            if (q) {
                result =
                    result.filter(
                        (item) =>
                            item.withdrawalId
                                .toLowerCase()
                                .includes(
                                    q
                                ) ||

                            item.memberId
                                .toLowerCase()
                                .includes(
                                    q
                                ) ||

                            item.memberName
                                .toLowerCase()
                                .includes(
                                    q
                                ) ||

                            item.memberPhone
                                .toLowerCase()
                                .includes(
                                    q
                                ) ||

                            item.transactionId
                                .toLowerCase()
                                .includes(
                                    q
                                )
                    );
            }

            return result;
        }, [
            withdrawals,
            activeTab,
            search,
        ]);

    /* =====================================================
       Create Withdrawal
    ===================================================== */

    async function createWithdrawal(
        event: React.FormEvent
    ) {
        event.preventDefault();

        try {
            setActionLoading(
                true
            );

            setError("");

            if (
                !form.memberId.trim()
            ) {
                throw new Error(
                    "Member ID দিন"
                );
            }

            if (
                !form.amount ||
                Number(
                    form.amount
                ) <= 0
            ) {
                throw new Error(
                    "সঠিক Amount দিন"
                );
            }

            const response =
                await fetch(
                    "/api/withdrawals",
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(
                            {
                                memberId:
                                    form.memberId,

                                amount:
                                    Number(
                                        form.amount
                                    ),

                                withdrawalDate:
                                    form.withdrawalDate,

                                paymentMethod:
                                    form.paymentMethod,

                                transactionId:
                                    form.transactionId,

                                proofFileId:
                                    form.proofFileId,

                                proofFileName:
                                    form.proofFileName,

                                description:
                                    form.description,
                            }
                        ),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                throw new Error(
                    data?.message ||
                        "Withdrawal create failed"
                );
            }

            if (
                !data.success
            ) {
                throw new Error(
                    data?.message ||
                        "Withdrawal create failed"
                );
            }

            setShowNewWithdrawal(
                false
            );

            setForm({
                memberId: "",

                amount: "",

                withdrawalDate:
                    new Date()
                        .toISOString()
                        .slice(0, 10),

                paymentMethod:
                    "Cash",

                transactionId: "",

                proofFileId: "",

                proofFileName: "",

                description: "",
            });

            await loadWithdrawals();
        } catch (
            err: any
        ) {
            console.error(
                err
            );

            setError(
                err?.message ||
                    "Withdrawal create failed"
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }

    /* =====================================================
       Approve
    ===================================================== */

    async function approveWithdrawal(
        withdrawal: Withdrawal
    ) {
        const confirmed =
            window.confirm(
                `আপনি কি ${withdrawal.withdrawalId} Withdrawal approve করতে চান?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(
                true
            );

            setError("");

            const response =
                await fetch(
                    "/api/withdrawals",
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(
                            {
                                withdrawalId:
                                    withdrawal.withdrawalId,

                                action:
                                    "approve",
                            }
                        ),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                throw new Error(
                    data?.message ||
                        "Approve failed"
                );
            }

            if (
                !data.success
            ) {
                throw new Error(
                    data?.message ||
                        "Approve failed"
                );
            }

            await loadWithdrawals();

            setSelectedWithdrawal(
                data.withdrawal ||
                    null
            );

            alert(
                `Withdrawal Approved হয়েছে.\nReceipt: ${
                    data.receiptId ||
                    ""
                }`
            );
        } catch (
            err: any
        ) {
            console.error(
                err
            );

            setError(
                err?.message ||
                    "Approve failed"
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }

    /* =====================================================
       Reject
    ===================================================== */

    function openRejectModal(
        withdrawal: Withdrawal
    ) {
        setSelectedWithdrawal(
            withdrawal
        );

        setRejectReason("");

        setShowRejectModal(
            true
        );
    }

    async function rejectWithdrawal() {
        if (
            !selectedWithdrawal
        ) {
            return;
        }

        if (
            !rejectReason.trim()
        ) {
            alert(
                "Reject করার কারণ দিন"
            );

            return;
        }

        try {
            setActionLoading(
                true
            );

            setError("");

            const response =
                await fetch(
                    "/api/withdrawals",
                    {
                        method:
                            "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(
                            {
                                withdrawalId:
                                    selectedWithdrawal.withdrawalId,

                                action:
                                    "reject",

                                rejectionReason:
                                    rejectReason,
                            }
                        ),
                    }
                );

            const data =
                await response.json();

            if (
                !response.ok
            ) {
                throw new Error(
                    data?.message ||
                        "Reject failed"
                );
            }

            if (
                !data.success
            ) {
                throw new Error(
                    data?.message ||
                        "Reject failed"
                );
            }

            setShowRejectModal(
                false
            );

            setRejectReason("");

            setSelectedWithdrawal(
                data.withdrawal ||
                    null
            );

            await loadWithdrawals();

            alert(
                "Withdrawal Reject করা হয়েছে"
            );
        } catch (
            err: any
        ) {
            console.error(
                err
            );

            setError(
                err?.message ||
                    "Reject failed"
            );
        } finally {
            setActionLoading(
                false
            );
        }
    }

    /* =====================================================
       Receipt
    ===================================================== */

    function printReceipt(withdrawal: Withdrawal) {
        if (withdrawal.status !== "approved") {
            window.alert(t("Only approved withdrawals can be printed."));
            return;
        }

        const printed = openOfficialReceipt({
            kind: "withdrawal",
            receiptId: withdrawal.receiptId || "WRC-" + withdrawal.withdrawalId,
            transactionId: withdrawal.transactionId || "-",
            referenceId: withdrawal.withdrawalId,
            memberId: withdrawal.memberId,
            memberName: withdrawal.memberName,
            memberPhone: withdrawal.memberPhone,
            date: withdrawal.withdrawalDate,
            paymentMethod: withdrawal.paymentMethod,
            paymentReference: withdrawal.transactionId,
            amount: withdrawal.amount,
            description: withdrawal.description,
            approvedBy: withdrawal.approvedBy,
            approvedAt: withdrawal.approvedAt,
        }, language, LOGO);

        if (!printed) {
            window.alert(t("Popup blocked. Please allow popups in your browser."));
        }
    }

    /* =====================================================
       Loading
    ===================================================== */

    if (loading) {
        return (
            <main className="dashboard-finance-page min-h-screen bg-slate-950 p-4 text-white md:p-6">

                <div className="mx-auto max-w-7xl">

                    <div className="mb-6 animate-pulse">

                        <div className="h-8 w-72 rounded bg-slate-800" />

                        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-800" />

                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                        {[1, 2, 3, 4].map(
                            (item) => (
                                <div
                                    key={
                                        item
                                    }
                                    className="h-32 animate-pulse rounded-2xl bg-slate-900"
                                />
                            )
                        )}

                    </div>

                    <div className="mt-6 h-96 animate-pulse rounded-2xl bg-slate-900" />

                </div>

            </main>
        );
    }

    /* =====================================================
       UI
    ===================================================== */

    return (
        <main className="dashboard-finance-page min-h-screen bg-slate-950 p-4 text-white md:p-6">

            <div className="mx-auto max-w-7xl">

                {/* Header */}

                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    <div className="flex items-center gap-3">

                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1">

                            <img
                                src={LOGO}
                                alt="Al-Insaf"
                                className="h-full w-full object-contain"
                            />

                        </div>

                        <div>

                            <h1 className="text-2xl font-bold md:text-3xl">
                                {t("Withdrawals")}
                            </h1>

                            <p className="mt-1 text-sm text-slate-400">
                                Al-Insaf Investment Society
                            </p>

                        </div>

                    </div>

                    <div className="flex gap-2">

                        <button
                            onClick={
                                loadWithdrawals
                            }
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                        >
                            ↻ {t("Refresh")}
                        </button>

                        <button
                            onClick={() =>
                                setShowNewWithdrawal(
                                    true
                                )
                            }
                            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-400"
                        >
                            + {t("New Withdrawal")}
                        </button>

                    </div>

                </div>

                {/* Error */}

                {error && (
                    <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">

                        <div className="flex items-start justify-between">

                            <div>

                                <div className="font-bold">
                                    {t("Withdrawal API Error")}
                                </div>

                                <div className="mt-1 text-sm">
                                    {error}
                                </div>

                            </div>

                            <button
                                onClick={() =>
                                    setError(
                                        ""
                                    )
                                }
                                className="text-xl"
                            >
                                ×
                            </button>

                        </div>

                    </div>
                )}

                {/* Summary */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <SummaryCard
                        title={t("Total Withdrawals")}
                        count={
                            summary.total.count
                        }
                        amount={
                            summary.total.amount
                        }
                        icon="▣"
                        description={t("All withdrawals")}
                    />

                    <SummaryCard
                        title={t("Approved")}
                        count={
                            summary.approved.count
                        }
                        amount={
                            summary.approved.amount
                        }
                        icon="✓"
                        description={t("Successful withdrawals")}
                    />

                    <SummaryCard
                        title={t("Pending")}
                        count={
                            summary.pending.count
                        }
                        amount={
                            summary.pending.amount
                        }
                        icon="◷"
                        description={t("Waiting for approval")}
                    />

                    <SummaryCard
                        title={t("Rejected")}
                        count={
                            summary.rejected.count
                        }
                        amount={
                            summary.rejected.amount
                        }
                        icon="×"
                        description={t("Rejected withdrawals")}
                    />

                </div>

                {/* Tabs */}

                <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex flex-wrap gap-2">

                            <TabButton
                                active={
                                    activeTab ===
                                    "all"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "all"
                                    )
                                }
                            >
                                {t("All")}

                                <TabCount>
                                    {
                                        summary
                                            .total
                                            .count
                                    }
                                </TabCount>
                            </TabButton>

                            <TabButton
                                active={
                                    activeTab ===
                                    "pending"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "pending"
                                    )
                                }
                            >
                                {t("Pending")}

                                {summary
                                    .pending
                                    .count >
                                    0 && (
                                    <TabCount>
                                        {
                                            summary
                                                .pending
                                                .count
                                        }
                                    </TabCount>
                                )}
                            </TabButton>

                            <TabButton
                                active={
                                    activeTab ===
                                    "approved"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "approved"
                                    )
                                }
                            >
                                {t("Approved")}
                            </TabButton>

                            <TabButton
                                active={
                                    activeTab ===
                                    "rejected"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "rejected"
                                    )
                                }
                            >
                                {t("Rejected")}

                                {summary
                                    .rejected
                                    .count >
                                    0 && (
                                    <TabCount>
                                        {
                                            summary
                                                .rejected
                                                .count
                                        }
                                    </TabCount>
                                )}
                            </TabButton>

                        </div>

                        <div className="relative w-full lg:max-w-sm">

                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                                ⌕
                            </span>

                            <input
                                value={
                                    search
                                }
                                onChange={(
                                    e
                                ) =>
                                    setSearch(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder={language === "bn" ? "সদস্য আইডি, নাম বা উত্তোলন আইডি..." : "Member ID, Name, Withdrawal ID..."}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-orange-500"
                            />

                        </div>

                    </div>

                </div>

                {/* Table */}

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[1100px]">

                            <thead>

                                <tr className="border-b border-slate-800 bg-slate-950/70">

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("Withdrawal")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("Member")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("Amount")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("Method")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("Date")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("Status")}
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("Action")}
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {visibleWithdrawals.length ===
                                0 ? (
                                    <tr>

                                        <td
                                            colSpan={
                                                7
                                            }
                                            className="px-5 py-16 text-center"
                                        >

                                            <div className="text-4xl">
                                                ↓
                                            </div>

                                            <div className="mt-3 font-semibold text-slate-300">
                                                {t("No withdrawals found")}
                                            </div>

                                            <div className="mt-1 text-sm text-slate-500">
                                                {t("This filter/search returned no withdrawals.")}
                                            </div>

                                        </td>

                                    </tr>
                                ) : (
                                    visibleWithdrawals.map(
                                        (
                                            withdrawal
                                        ) => (
                                            <tr
                                                key={
                                                    withdrawal.id ||
                                                    withdrawal.withdrawalId
                                                }
                                                className="border-b border-slate-800/70 hover:bg-slate-800/40"
                                            >

                                                <td className="px-5 py-4">

                                                    <div className="font-semibold">
                                                        {
                                                            withdrawal.withdrawalId
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {
                                                            withdrawal.transactionId ||
                                                            "No Transaction ID"
                                                        }
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="font-semibold">
                                                        {
                                                            withdrawal.memberName
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {
                                                            withdrawal.memberId
                                                        }

                                                        {withdrawal.memberPhone &&
                                                            ` • ${withdrawal.memberPhone}`}
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="font-bold text-orange-400">
                                                        ৳{" "}
                                                        {formatMoney(
                                                            withdrawal.amount
                                                        )}
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs">
                                                        {
                                                            withdrawal.paymentMethod
                                                        }
                                                    </span>

                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-400">
                                                    {formatDate(
                                                        withdrawal.withdrawalDate
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">

                                                    <StatusBadge
                                                        status={
                                                            withdrawal.status
                                                        }
                                                    />

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="flex justify-end gap-2">

                                                        <button
                                                            onClick={() =>
                                                                setSelectedWithdrawal(
                                                                    withdrawal
                                                                )
                                                            }
                                                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700"
                                                        >
                                                            View
                                                        </button>

                                                        {withdrawal.status !==
                                                            "approved" && (
                                                            <button
                                                                disabled={
                                                                    actionLoading
                                                                }
                                                                onClick={() =>
                                                                    approveWithdrawal(
                                                                        withdrawal
                                                                    )
                                                                }
                                                                className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold hover:bg-emerald-400 disabled:opacity-50"
                                                            >
                                                                Approve
                                                            </button>
                                                        )}

                                                        {withdrawal.status ===
                                                            "pending" && (
                                                            <button
                                                                disabled={
                                                                    actionLoading
                                                                }
                                                                onClick={() =>
                                                                    openRejectModal(
                                                                        withdrawal
                                                                    )
                                                                }
                                                                className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20"
                                                            >
                                                                Reject
                                                            </button>
                                                        )}

                                                        {withdrawal.status ===
                                                            "rejected" && (
                                                            <button
                                                                disabled={
                                                                    actionLoading
                                                                }
                                                                onClick={() =>
                                                                    approveWithdrawal(
                                                                        withdrawal
                                                                    )
                                                                }
                                                                className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                                                            >
                                                                Approve Again
                                                            </button>
                                                        )}

                                                        {withdrawal.status ===
                                                            "approved" && (
                                                            <button
                                                                onClick={() =>
                                                                    printReceipt(
                                                                        withdrawal
                                                                    )
                                                                }
                                                                className="rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/20"
                                                            >
                                                                Receipt
                                                            </button>
                                                        )}

                                                    </div>

                                                </td>

                                            </tr>
                                        )
                                    )
                                )}

                            </tbody>

                        </table>

                    </div>

                </div>

                <div className="mt-3 text-right text-xs text-slate-500">

                    Showing{" "}
                    <span className="font-semibold text-slate-300">
                        {
                            visibleWithdrawals.length
                        }
                    </span>{" "}
                    withdrawals

                </div>

            </div>

            {/* =================================================
               New Withdrawal
            ================================================= */}

            {showNewWithdrawal && (
                <Modal
                    title={t("New Withdrawal")}
                    onClose={() =>
                        setShowNewWithdrawal(
                            false
                        )
                    }
                >

                    <form
                        onSubmit={
                            createWithdrawal
                        }
                        className="space-y-5"
                    >

                        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">

                            <div className="font-bold text-orange-400">
                                New Withdrawal Information
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                                নতুন Withdrawal প্রথমে Pending থাকবে। Admin approve করলে CashBook-এ Money Out হবে।
                            </div>

                        </div>

                        <div className="grid gap-4 md:grid-cols-2">

                            <FormInput
                                label={`${t("Member ID")} *`}
                                value={
                                    form.memberId
                                }
                                onChange={(
                                    value
                                ) =>
                                    setForm(
                                        (
                                            old
                                        ) => ({
                                            ...old,
                                            memberId:
                                                value,
                                        })
                                    )
                                }
                                placeholder={t("e.g. M001")}
                            />

                            <FormInput
                                label={`${t("Amount")} *`}
                                type="number"
                                value={
                                    form.amount
                                }
                                onChange={(
                                    value
                                ) =>
                                    setForm(
                                        (
                                            old
                                        ) => ({
                                            ...old,
                                            amount:
                                                value,
                                        })
                                    )
                                }
                                placeholder="5000"
                            />

                            <FormInput
                                label={`${t("Withdrawal Date")} *`}
                                type="date"
                                value={
                                    form.withdrawalDate
                                }
                                onChange={(
                                    value
                                ) =>
                                    setForm(
                                        (
                                            old
                                        ) => ({
                                            ...old,
                                            withdrawalDate:
                                                value,
                                        })
                                    )
                                }
                            />

                            <div>

                                <label className="mb-2 block text-sm font-semibold text-slate-300">
                                    Payment Method
                                </label>

                                <select
                                    value={
                                        form.paymentMethod
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setForm(
                                            (
                                                old
                                            ) => ({
                                                ...old,
                                                paymentMethod:
                                                    e
                                                        .target
                                                        .value as PaymentMethod,
                                            })
                                        )
                                    }
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                                >

                                    <option>
                                        Cash
                                    </option>

                                    <option>
                                        Bank
                                    </option>

                                    <option>
                                        Bank Transfer
                                    </option>

                                    <option>
                                        bKash
                                    </option>

                                    <option>
                                        Nagad
                                    </option>

                                    <option>
                                        Rocket
                                    </option>

                                    <option>
                                        Upay
                                    </option>

                                    <option>
                                        Other
                                    </option>

                                </select>

                            </div>

                            <FormInput
                                label={t("Transaction ID")}
                                value={
                                    form.transactionId
                                }
                                onChange={(
                                    value
                                ) =>
                                    setForm(
                                        (
                                            old
                                        ) => ({
                                            ...old,
                                            transactionId:
                                                value,
                                        })
                                    )
                                }
                                placeholder={t("If available")}
                            />

                            <FormInput
                                label={t("Proof File ID")}
                                value={
                                    form.proofFileId
                                }
                                onChange={(
                                    value
                                ) =>
                                    setForm(
                                        (
                                            old
                                        ) => ({
                                            ...old,
                                            proofFileId:
                                                value,
                                        })
                                    )
                                }
                                placeholder={t("Google Drive File ID")}
                            />

                            <FormInput
                                label={t("Proof File Name")}
                                value={
                                    form.proofFileName
                                }
                                onChange={(
                                    value
                                ) =>
                                    setForm(
                                        (
                                            old
                                        ) => ({
                                            ...old,
                                            proofFileName:
                                                value,
                                        })
                                    )
                                }
                                placeholder="withdrawal-proof.jpg"
                            />

                        </div>

                        <div>

                            <label className="mb-2 block text-sm font-semibold text-slate-300">
                                {t("Description")}
                            </label>

                            <textarea
                                value={
                                    form.description
                                }
                                onChange={(
                                    e
                                ) =>
                                    setForm(
                                        (
                                            old
                                        ) => ({
                                            ...old,
                                            description:
                                                e
                                                    .target
                                                    .value,
                                        })
                                    )
                                }
                                rows={4}
                                placeholder={t("Describe the withdrawal...")}
                                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
                            />

                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                            <button
                                type="button"
                                onClick={() =>
                                    setShowNewWithdrawal(
                                        false
                                    )
                                }
                                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    actionLoading
                                }
                                className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white hover:bg-orange-400 disabled:opacity-50"
                            >
                                {actionLoading
                                    ? "Saving..."
                                    : "Create Withdrawal"}
                            </button>

                        </div>

                    </form>

                </Modal>
            )}

            {/* =================================================
               Details
            ================================================= */}

            {selectedWithdrawal &&
                !showRejectModal && (
                    <Modal
                        title={t("Withdrawal Details")}
                        onClose={() =>
                            setSelectedWithdrawal(
                                null
                            )
                        }
                    >

                        <div className="space-y-5">

                            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">

                                <div>

                                    <div className="text-xs uppercase text-slate-500">
                                        Withdrawal ID
                                    </div>

                                    <div className="mt-1 text-lg font-bold">
                                        {
                                            selectedWithdrawal.withdrawalId
                                        }
                                    </div>

                                </div>

                                <StatusBadge
                                    status={
                                        selectedWithdrawal.status
                                    }
                                />

                            </div>

                            <SectionTitle>
                                Member Information
                            </SectionTitle>

                            <div className="grid gap-3 sm:grid-cols-2">

                                <DetailItem
                                    label={t("Member ID")}
                                    value={
                                        selectedWithdrawal.memberId
                                    }
                                />

                                <DetailItem
                                    label={t("Member Name")}
                                    value={
                                        selectedWithdrawal.memberName
                                    }
                                />

                                <DetailItem
                                    label={t("Phone")}
                                    value={
                                        selectedWithdrawal.memberPhone
                                    }
                                />

                                <DetailItem
                                    label={t("Withdrawal Date")}
                                    value={formatDate(
                                        selectedWithdrawal.withdrawalDate
                                    )}
                                />

                            </div>

                            <SectionTitle>
                                Withdrawal Information
                            </SectionTitle>

                            <div className="grid gap-3 sm:grid-cols-2">

                                <DetailItem
                                    label={t("Amount")}
                                    value={`৳ ${formatMoney(
                                        selectedWithdrawal.amount
                                    )}`}
                                    highlight
                                />

                                <DetailItem
                                    label={t("Payment Method")}
                                    value={
                                        selectedWithdrawal.paymentMethod
                                    }
                                />

                                <DetailItem
                                    label={t("Recipient Account")}
                                    value={
                                        selectedWithdrawal.accountNumber || "-"
                                    }
                                />

                                <DetailItem
                                    label={t("Transaction ID")}
                                    value={
                                        selectedWithdrawal.transactionId ||
                                        "-"
                                    }
                                />

                                <DetailItem
                                    label={t("Receipt ID")}
                                    value={
                                        selectedWithdrawal.receiptId ||
                                        "-"
                                    }
                                />

                            </div>

                            <SectionTitle>
                                Description
                            </SectionTitle>

                            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-7 text-slate-300">
                                {
                                    selectedWithdrawal.description ||
                                    "কোনো description নেই।"
                                }
                            </div>

                            {selectedWithdrawal.proofFileId && (
                                <>
                                    <SectionTitle>
                                        Attachment / Proof
                                    </SectionTitle>

                                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                                        <div className="text-sm">
                                            {
                                                selectedWithdrawal.proofFileName ||
                                                selectedWithdrawal.proofFileId
                                            }
                                        </div>

                                        <div className="mt-2 break-all text-xs text-slate-500">
                                            File ID:{" "}
                                            {
                                                selectedWithdrawal.proofFileId
                                            }
                                        </div>

                                    </div>
                                </>
                            )}

                            {selectedWithdrawal.status ===
                                "approved" && (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

                                    <div className="font-bold text-emerald-400">
                                        ✓ Withdrawal Approved
                                    </div>

                                    <div className="mt-2 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">

                                        <div>
                                            Approved By:{" "}
                                            <strong>
                                                {
                                                    selectedWithdrawal.approvedBy
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            Approved At:{" "}
                                            <strong>
                                                {formatDateTime(
                                                    selectedWithdrawal.approvedAt
                                                )}
                                            </strong>
                                        </div>

                                    </div>

                                </div>
                            )}

                            {selectedWithdrawal.status ===
                                "rejected" && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">

                                    <div className="font-bold text-red-400">
                                        ✕ Withdrawal Rejected
                                    </div>

                                    <div className="mt-3 text-sm text-slate-300">

                                        <div>
                                            Rejected By:{" "}
                                            <strong>
                                                {
                                                    selectedWithdrawal.rejectedBy
                                                }
                                            </strong>
                                        </div>

                                        <div className="mt-1">
                                            Rejected At:{" "}
                                            <strong>
                                                {formatDateTime(
                                                    selectedWithdrawal.rejectedAt
                                                )}
                                            </strong>
                                        </div>

                                        <div className="mt-3 rounded-lg bg-red-500/5 p-3">

                                            <div className="text-xs text-red-400">
                                                {t("Rejection Reason")}
                                            </div>

                                            <div className="mt-1">
                                                {
                                                    selectedWithdrawal.rejectionReason ||
                                                    "-"
                                                }
                                            </div>

                                        </div>

                                    </div>

                                </div>
                            )}

                            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-5">

                                {selectedWithdrawal.status !==
                                    "approved" && (
                                    <button
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            approveWithdrawal(
                                                selectedWithdrawal
                                            )
                                        }
                                        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold hover:bg-emerald-400 disabled:opacity-50"
                                    >
                                        {selectedWithdrawal.status ===
                                        "rejected"
                                            ? t("Approve Again")
                                            : t("Approve")}
                                    </button>
                                )}

                                {selectedWithdrawal.status ===
                                    "pending" && (
                                    <button
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            openRejectModal(
                                                selectedWithdrawal
                                            )
                                        }
                                        className="rounded-xl bg-red-500 px-5 py-3 text-sm font-bold hover:bg-red-400 disabled:opacity-50"
                                    >
                                        {t("Reject")}
                                    </button>
                                )}

                                {selectedWithdrawal.status ===
                                    "approved" && (
                                    <button
                                        onClick={() =>
                                            printReceipt(
                                                selectedWithdrawal
                                            )
                                        }
                                        className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold hover:bg-blue-400"
                                    >
                                        {t("Print Receipt")}
                                    </button>
                                )}

                            </div>

                        </div>

                    </Modal>
                )}

            {/* =================================================
               Reject Modal
            ================================================= */}

            {showRejectModal &&
                selectedWithdrawal && (
                    <Modal
                        title={t("Reject Withdrawal")}
                        onClose={() => {
                            setShowRejectModal(
                                false
                            );

                            setRejectReason(
                                ""
                            );
                        }}
                    >

                        <div className="space-y-5">

                            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">

                                <div className="font-bold text-red-400">
                                    {t("Reject Withdrawal")}
                                </div>

                                <div className="mt-1 text-sm text-slate-400">
                                    {t("Withdrawal ID")}:{" "}
                                    <strong className="text-slate-200">
                                        {
                                            selectedWithdrawal.withdrawalId
                                        }
                                    </strong>
                                </div>

                                <div className="mt-1 text-sm text-slate-400">
                                    {t("Amount")}:{" "}
                                    <strong className="text-slate-200">
                                        ৳{" "}
                                        {formatMoney(
                                            selectedWithdrawal.amount
                                        )}
                                    </strong>
                                </div>

                            </div>

                            <div>

                                <label className="mb-2 block text-sm font-semibold text-slate-300">
                                    {t("Rejection Reason")} *
                                </label>

                                <textarea
                                    value={
                                        rejectReason
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setRejectReason(
                                            e
                                                .target
                                                .value
                                        )
                                    }
                                    rows={5}
                                    placeholder={t("Why is this withdrawal being rejected?")}
                                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-500"
                                />

                            </div>

                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                                <button
                                    onClick={() => {
                                        setShowRejectModal(
                                            false
                                        );

                                        setRejectReason(
                                            ""
                                        );
                                    }}
                                    className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                                >
                                    {t("Cancel")}
                                </button>

                                <button
                                    disabled={
                                        actionLoading ||
                                        !rejectReason.trim()
                                    }
                                    onClick={
                                        rejectWithdrawal
                                    }
                                    className="rounded-xl bg-red-500 px-6 py-3 text-sm font-bold hover:bg-red-400 disabled:opacity-50"
                                >
                                    {actionLoading
                                        ? t("Rejecting...")
                                        : t("Confirm Reject")}
                                </button>

                            </div>

                        </div>

                    </Modal>
                )}

        </main>
    );
}

/* =========================================================
   Components
========================================================= */

function SummaryCard({
    title,
    count,
    amount,
    icon,
    description,
}: {
    title: string;
    count: number;
    amount: number;
    icon: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-start justify-between">

                <div>

                    <div className="text-sm font-semibold text-slate-400">
                        {title}
                    </div>

                    <div className="mt-2 text-2xl font-black">
                        {count}
                    </div>

                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-xl text-orange-400">
                    {icon}
                </div>

            </div>

            <div className="mt-4">

                <div className="text-lg font-bold text-orange-400">
                    ৳{" "}
                    {formatMoney(
                        amount
                    )}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                    {description}
                </div>

            </div>

        </div>
    );
}

function TabButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/10"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            }`}
        >
            {children}
        </button>
    );
}

function TabCount({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-xs">
            {children}
        </span>
    );
}

function StatusBadge({
    status,
}: {
    status: WithdrawalStatus;
}) {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);

    if (
        status === "approved"
    ) {
        return (
            <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
                ✓ {t("Approved")}
            </span>
        );
    }

    if (
        status === "rejected"
    ) {
        return (
            <span className="inline-flex rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400">
                × {t("Rejected")}
            </span>
        );
    }

    return (
        <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400">
            ◷ {t("Pending")}
        </span>
    );
}

function FormInput({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (
        value: string
    ) => void;
    placeholder?: string;
    type?: string;
}) {
    return (
        <div>

            <label className="mb-2 block text-sm font-semibold text-slate-300">
                {label}
            </label>

            <input
                type={type}
                value={value}
                onChange={(e) =>
                    onChange(
                        e.target.value
                    )
                }
                placeholder={
                    placeholder
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-orange-500"
            />

        </div>
    );
}

function DetailItem({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

            <div className="text-xs font-medium text-slate-500">
                {label}
            </div>

            <div
                className={`mt-1 break-words text-sm font-bold ${
                    highlight
                        ? "text-orange-400"
                        : "text-slate-200"
                }`}
            >
                {value || "-"}
            </div>

        </div>
    );
}

function SectionTitle({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <h3 className="border-b border-slate-800 pb-2 text-sm font-bold uppercase tracking-wider text-slate-400">
            {children}
        </h3>
    );
}

function Modal({
    title,
    children,
    onClose,
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">

            <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">

                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">

                    <h2 className="text-lg font-bold text-white">
                        {title}
                    </h2>

                    <button
                        onClick={
                            onClose
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                        ×
                    </button>

                </div>

                <div className="p-5 md:p-6">
                    {children}
                </div>

            </div>

        </div>
    );
}