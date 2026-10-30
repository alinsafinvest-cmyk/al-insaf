"use client";
// বাংলা: এই admin পেজে dashboard → deposits সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।

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

type DepositStatus =
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

interface Deposit {
    id: string;
    depositId: string;
    memberId: string;
    memberName: string;
    memberPhone: string;
    amount: number;
    depositDate: string;
    paymentMethod: string;
    transactionId: string;
    description: string;
    proofFileId: string;
    proofFileName: string;
    status: DepositStatus;
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
   Organization Logo
========================================================= */

const LOGO = SITE_LOGO;

/* =========================================================
   Helpers
========================================================= */

function formatMoney(amount: number) {
    return new Intl.NumberFormat("en-BD", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount || 0);
}

function formatDate(value: string) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatDateTime(value: string) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusText(status: DepositStatus) {
    if (status === "approved") {
        return "Approved";
    }

    if (status === "rejected") {
        return "Rejected";
    }

    return "Pending";
}

/* =========================================================
   Main Page
========================================================= */

// বাংলা: এই component-এ admin-এর deposit queue, payment details এবং approve/reject action পরিচালিত হয়।
export default function DepositsPage() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);
    const [deposits, setDeposits] =
        useState<Deposit[]>([]);

    const [summary, setSummary] =
        useState<Summary>({
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

    const [activeTab, setActiveTab] =
        useState<TabType>("all");

    const [search, setSearch] =
        useState("");

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [showNewDeposit, setShowNewDeposit] =
        useState(false);

    const [selectedDeposit, setSelectedDeposit] =
        useState<Deposit | null>(null);

    const [showRejectModal, setShowRejectModal] =
        useState(false);

    const [rejectReason, setRejectReason] =
        useState("");

    const [actionLoading, setActionLoading] =
        useState(false);

    /* =====================================================
       New Deposit Form
    ===================================================== */

    const [form, setForm] = useState({
        memberId: "",
        amount: "",
        depositDate: new Date()
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
       Load Deposits
    ===================================================== */

    const loadDeposits = useCallback(
        async () => {
            try {
                setLoading(true);
                setError("");

                const response =
                    await fetch(
                        "/api/deposits",
                        {
                            method: "GET",
                            cache: "no-store",
                        }
                    );

                const text =
                    await response.text();

                let data: any = null;

                try {
                    data =
                        JSON.parse(text);
                } catch {
                    throw new Error(
                        `Server JSON response দেয়নি. Status: ${response.status}`
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        data?.message ||
                            "Deposit data load failed"
                    );
                }

                if (
                    !data?.success
                ) {
                    throw new Error(
                        data?.message ||
                            "Deposit API failed"
                    );
                }

                setDeposits(
                    Array.isArray(
                        data.deposits
                    )
                        ? data.deposits
                        : []
                );

                setSummary(
                    data.summary || {
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
            } catch (err: any) {
                console.error(
                    "Deposit load error:",
                    err
                );

                setError(
                    err?.message ||
                        "Deposit data load failed"
                );
            } finally {
                setLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        loadDeposits();
    }, [loadDeposits]);

    /* =====================================================
       Filter
    ===================================================== */

    const visibleDeposits =
        useMemo(() => {
            let result =
                [...deposits];

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
                            item.depositId
                                .toLowerCase()
                                .includes(q) ||

                            item.memberId
                                .toLowerCase()
                                .includes(q) ||

                            item.memberName
                                .toLowerCase()
                                .includes(q) ||

                            item.memberPhone
                                .toLowerCase()
                                .includes(q) ||

                            item.transactionId
                                .toLowerCase()
                                .includes(q)
                    );
            }

            return result;
        }, [
            deposits,
            activeTab,
            search,
        ]);

    /* =====================================================
       New Deposit
    ===================================================== */

    async function createDeposit(
        event: React.FormEvent
    ) {
        event.preventDefault();

        try {
            setActionLoading(true);
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
                Number(form.amount) <=
                    0
            ) {
                throw new Error(
                    "সঠিক Amount দিন"
                );
            }

            const response =
                await fetch(
                    "/api/deposits",
                    {
                        method: "POST",
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

                                depositDate:
                                    form.depositDate,

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

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                        "Deposit create failed"
                );
            }

            if (
                !data.success
            ) {
                throw new Error(
                    data?.message ||
                        "Deposit create failed"
                );
            }

            setShowNewDeposit(
                false
            );

            setForm({
                memberId: "",
                amount: "",
                depositDate:
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

            await loadDeposits();
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                    "Deposit create failed"
            );
        } finally {
            setActionLoading(false);
        }
    }

    /* =====================================================
       Approve
    ===================================================== */

    async function approveDeposit(
        deposit: Deposit
    ) {
        const confirmed =
            window.confirm(
                `আপনি কি ${deposit.depositId} Deposit approve করতে চান?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setActionLoading(true);
            setError("");

            const response =
                await fetch(
                    "/api/deposits",
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            {
                                depositId:
                                    deposit.depositId,

                                action:
                                    "approve",
                            }
                        ),
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
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

            await loadDeposits();

            if (
                selectedDeposit?.depositId ===
                deposit.depositId
            ) {
                setSelectedDeposit(
                    data.deposit ||
                        null
                );
            }

            alert(
                `Deposit Approved হয়েছে.\nReceipt: ${
                    data.receiptId || ""
                }`
            );
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                    "Approve failed"
            );
        } finally {
            setActionLoading(false);
        }
    }

    /* =====================================================
       Reject
    ===================================================== */

    function openRejectModal(
        deposit: Deposit
    ) {
        setSelectedDeposit(
            deposit
        );

        setRejectReason("");

        setShowRejectModal(
            true
        );
    }

    async function rejectDeposit() {
        if (
            !selectedDeposit
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
            setActionLoading(true);
            setError("");

            const response =
                await fetch(
                    "/api/deposits",
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                        body: JSON.stringify(
                            {
                                depositId:
                                    selectedDeposit.depositId,

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

            if (!response.ok) {
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

            setSelectedDeposit(
                data.deposit ||
                    null
            );

            await loadDeposits();

            alert(
                "Deposit Reject করা হয়েছে"
            );
        } catch (err: any) {
            console.error(err);

            setError(
                err?.message ||
                    "Reject failed"
            );
        } finally {
            setActionLoading(false);
        }
    }

    /* =====================================================
       Receipt
    ===================================================== */

    function printReceipt(deposit: Deposit) {
        if (deposit.status !== "approved") {
            window.alert(t("Only approved deposits can be printed."));
            return;
        }

        const printed = openOfficialReceipt({
            kind: "deposit",
            receiptId: deposit.receiptId || "RCT-" + deposit.depositId,
            transactionId: deposit.transactionId || "-",
            referenceId: deposit.depositId,
            memberId: deposit.memberId,
            memberName: deposit.memberName,
            memberPhone: deposit.memberPhone,
            date: deposit.depositDate,
            paymentMethod: deposit.paymentMethod,
            paymentReference: deposit.transactionId,
            amount: deposit.amount,
            description: deposit.description,
            approvedBy: deposit.approvedBy,
            approvedAt: deposit.approvedAt,
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

                        <div className="h-8 w-64 rounded bg-slate-800" />

                        <div className="mt-3 h-4 w-96 max-w-full rounded bg-slate-800" />

                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                        {[
                            1,
                            2,
                            3,
                            4,
                        ].map(
                            (item) => (
                                <div
                                    key={item}
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

                {/* =================================================
                   Header
                ================================================= */}

                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                    <div>

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
                                    {t("Deposits")}
                                </h1>

                                <p className="mt-1 text-sm text-slate-400">
                                    Al-Insaf Investment Society
                                </p>

                            </div>

                        </div>

                    </div>

                    <div className="flex gap-2">

                        <button
                            onClick={
                                loadDeposits
                            }
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                        >
                            ↻ {t("Refresh")}
                        </button>

                        <button
                            onClick={() =>
                                setShowNewDeposit(
                                    true
                                )
                            }
                            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
                        >
                            + {t("New Deposit")}
                        </button>

                    </div>

                </div>

                {/* =================================================
                   Error
                ================================================= */}

                {error && (
                    <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">

                        <div className="flex items-start justify-between gap-4">

                            <div>

                                <div className="font-bold">
                                    {t("Deposit API Error")}
                                </div>

                                <div className="mt-1 text-sm">
                                    {error}
                                </div>

                            </div>

                            <button
                                onClick={() =>
                                    setError("")
                                }
                                className="text-xl text-red-300 hover:text-white"
                            >
                                ×
                            </button>

                        </div>

                    </div>
                )}

                {/* =================================================
                   Summary Cards
                ================================================= */}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <SummaryCard
                        title={t("Total Deposits")}
                        count={
                            summary.total.count
                        }
                        amount={
                            summary.total.amount
                        }
                        icon="▣"
                        description={t("All database deposits")}
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
                        description={t("Successful deposits")}
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
                        description={t("Rejected deposits")}
                    />

                </div>

                {/* =================================================
                   Tabs + Search
                ================================================= */}

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
                                onChange={(e) =>
                                    setSearch(
                                        e.target
                                            .value
                                    )
                                }
                                placeholder={language === "bn" ? "সদস্য আইডি, নাম বা জমা আইডি..." : "Member ID, Name, Deposit ID..."}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-10 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-500"
                            />

                        </div>

                    </div>

                </div>

                {/* =================================================
                   Deposit Table
                ================================================= */}

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

                    <div className="overflow-x-auto">

                        <table className="w-full min-w-[1050px]">

                            <thead>

                                <tr className="border-b border-slate-800 bg-slate-950/70">

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                                        {t("Deposit")}
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

                                {visibleDeposits.length ===
                                0 ? (
                                    <tr>

                                        <td
                                            colSpan={
                                                7
                                            }
                                            className="px-5 py-16 text-center"
                                        >

                                            <div className="text-4xl">
                                                ▣
                                            </div>

                                            <div className="mt-3 font-semibold text-slate-300">
                                                {t("No deposits found")}
                                            </div>

                                            <div className="mt-1 text-sm text-slate-500">
                                                {t("This filter/search returned no deposits.")}
                                            </div>

                                        </td>

                                    </tr>
                                ) : (
                                    visibleDeposits.map(
                                        (
                                            deposit
                                        ) => (
                                            <tr
                                                key={
                                                    deposit.id ||
                                                    deposit.depositId
                                                }
                                                className="border-b border-slate-800/70 transition hover:bg-slate-800/40"
                                            >

                                                <td className="px-5 py-4">

                                                    <div className="font-semibold text-white">
                                                        {
                                                            deposit.depositId
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {
                                                            deposit.transactionId ||
                                                            "No Transaction ID"
                                                        }
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="font-semibold text-slate-200">
                                                        {
                                                            deposit.memberName
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {
                                                            deposit.memberId
                                                        }

                                                        {deposit.memberPhone &&
                                                            ` • ${deposit.memberPhone}`}
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="font-bold text-emerald-400">
                                                        ৳{" "}
                                                        {formatMoney(
                                                            deposit.amount
                                                        )}
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <span className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300">
                                                        {
                                                            deposit.paymentMethod
                                                        }
                                                    </span>

                                                </td>

                                                <td className="px-5 py-4 text-sm text-slate-400">
                                                    {formatDate(
                                                        deposit.depositDate
                                                    )}
                                                </td>

                                                <td className="px-5 py-4">

                                                    <StatusBadge
                                                        status={
                                                            deposit.status
                                                        }
                                                    />

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="flex justify-end gap-2">

                                                        <button
                                                            onClick={() =>
                                                                setSelectedDeposit(
                                                                    deposit
                                                                )
                                                            }
                                                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
                                                        >
                                                            View
                                                        </button>

                                                        {deposit.status !==
                                                            "approved" && (
                                                            <button
                                                                disabled={
                                                                    actionLoading
                                                                }
                                                                onClick={() =>
                                                                    approveDeposit(
                                                                        deposit
                                                                    )
                                                                }
                                                                className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                Approve
                                                            </button>
                                                        )}

                                                        {deposit.status ===
                                                            "pending" && (
                                                            <button
                                                                disabled={
                                                                    actionLoading
                                                                }
                                                                onClick={() =>
                                                                    openRejectModal(
                                                                        deposit
                                                                    )
                                                                }
                                                                className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        )}

                                                        {deposit.status ===
                                                            "rejected" && (
                                                            <button
                                                                disabled={
                                                                    actionLoading
                                                                }
                                                                onClick={() =>
                                                                    approveDeposit(
                                                                        deposit
                                                                    )
                                                                }
                                                                className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
                                                            >
                                                                Approve Again
                                                            </button>
                                                        )}

                                                        {deposit.status ===
                                                            "approved" && (
                                                            <button
                                                                onClick={() =>
                                                                    printReceipt(
                                                                        deposit
                                                                    )
                                                                }
                                                                className="rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-400 transition hover:bg-blue-500/20"
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

                {/* =================================================
                   Result Count
                ================================================= */}

                <div className="mt-3 text-right text-xs text-slate-500">

                    Showing{" "}
                    <span className="font-semibold text-slate-300">
                        {
                            visibleDeposits.length
                        }
                    </span>{" "}
                    deposits

                </div>

            </div>

            {/* =====================================================
               New Deposit Modal
            ===================================================== */}

            {showNewDeposit && (
                <Modal
                    title={t("New Deposit")}
                    onClose={() =>
                        setShowNewDeposit(
                            false
                        )
                    }
                >

                    <form
                        onSubmit={
                            createDeposit
                        }
                        className="space-y-5"
                    >

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

                            <div className="font-bold text-emerald-400">
                                New Deposit Information
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                                Deposit তৈরি করলে এটি Pending অবস্থায় MongoDB-তে save হবে।
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
                                label={`${t("Deposit Date")} *`}
                                type="date"
                                value={
                                    form.depositDate
                                }
                                onChange={(
                                    value
                                ) =>
                                    setForm(
                                        (
                                            old
                                        ) => ({
                                            ...old,
                                            depositDate:
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
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
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
                                placeholder="receipt.jpg"
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
                                placeholder={t("Describe the deposit...")}
                                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
                            />

                        </div>

                        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                            <button
                                type="button"
                                onClick={() =>
                                    setShowNewDeposit(
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
                                className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
                            >
                                {actionLoading
                                    ? "Saving..."
                                    : "Create Deposit"}
                            </button>

                        </div>

                    </form>

                </Modal>
            )}

            {/* =====================================================
               Details Modal
            ===================================================== */}

            {selectedDeposit &&
                !showRejectModal && (
                    <Modal
                        title={t("Deposit Details")}
                        onClose={() =>
                            setSelectedDeposit(
                                null
                            )
                        }
                    >

                        <div className="space-y-5">

                            {/* Status */}

                            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:flex-row sm:items-center sm:justify-between">

                                <div>

                                    <div className="text-xs uppercase tracking-wider text-slate-500">
                                        Deposit ID
                                    </div>

                                    <div className="mt-1 text-lg font-bold text-white">
                                        {
                                            selectedDeposit.depositId
                                        }
                                    </div>

                                </div>

                                <StatusBadge
                                    status={
                                        selectedDeposit.status
                                    }
                                />

                            </div>

                            {/* Member */}

                            <SectionTitle>
                                Member Information
                            </SectionTitle>

                            <div className="grid gap-3 sm:grid-cols-2">

                                <DetailItem
                                    label={t("Member ID")}
                                    value={
                                        selectedDeposit.memberId
                                    }
                                />

                                <DetailItem
                                    label={t("Member Name")}
                                    value={
                                        selectedDeposit.memberName
                                    }
                                />

                                <DetailItem
                                    label={t("Phone")}
                                    value={
                                        selectedDeposit.memberPhone
                                    }
                                />

                                <DetailItem
                                    label={t("Deposit Date")}
                                    value={formatDate(
                                        selectedDeposit.depositDate
                                    )}
                                />

                            </div>

                            {/* Payment */}

                            <SectionTitle>
                                Payment Information
                            </SectionTitle>

                            <div className="grid gap-3 sm:grid-cols-2">

                                <DetailItem
                                    label={t("Amount")}
                                    value={`৳ ${formatMoney(
                                        selectedDeposit.amount
                                    )}`}
                                    highlight
                                />

                                <DetailItem
                                    label={t("Payment Method")}
                                    value={
                                        selectedDeposit.paymentMethod
                                    }
                                />

                                <DetailItem
                                    label={t("Transaction ID")}
                                    value={
                                        selectedDeposit.transactionId ||
                                        "-"
                                    }
                                />

                                <DetailItem
                                    label={t("Receipt ID")}
                                    value={
                                        selectedDeposit.receiptId ||
                                        "-"
                                    }
                                />

                            </div>

                            {/* Description */}

                            <SectionTitle>
                                Description
                            </SectionTitle>

                            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-7 text-slate-300">
                                {
                                    selectedDeposit.description ||
                                    "কোনো description নেই।"
                                }
                            </div>

                            {/* Proof */}

                            {(selectedDeposit
                                .proofFileId ||
                                selectedDeposit
                                    .proofFileName) && (
                                <>
                                    <SectionTitle>
                                        Attachment / Proof
                                    </SectionTitle>

                                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

                                        <div className="text-sm text-slate-300">
                                            {
                                                selectedDeposit.proofFileName ||
                                                selectedDeposit.proofFileId
                                            }
                                        </div>

                                        {selectedDeposit.proofFileId && (
                                            <div className="mt-2 break-all text-xs text-slate-500">
                                                File ID:{" "}
                                                {
                                                    selectedDeposit.proofFileId
                                                }
                                            </div>
                                        )}

                                    </div>
                                </>
                            )}

                            {/* Approval */}

                            {selectedDeposit.status ===
                                "approved" && (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

                                    <div className="font-bold text-emerald-400">
                                        ✓ Deposit Approved
                                    </div>

                                    <div className="mt-2 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">

                                        <div>
                                            Approved By:{" "}
                                            <strong>
                                                {
                                                    selectedDeposit.approvedBy
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            Approved At:{" "}
                                            <strong>
                                                {formatDateTime(
                                                    selectedDeposit.approvedAt
                                                )}
                                            </strong>
                                        </div>

                                    </div>

                                </div>
                            )}

                            {/* Rejection */}

                            {selectedDeposit.status ===
                                "rejected" && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">

                                    <div className="font-bold text-red-400">
                                        ✕ Deposit Rejected
                                    </div>

                                    <div className="mt-3 text-sm text-slate-300">

                                        <div>
                                            Rejected By:{" "}
                                            <strong>
                                                {
                                                    selectedDeposit.rejectedBy
                                                }
                                            </strong>
                                        </div>

                                        <div className="mt-1">
                                            Rejected At:{" "}
                                            <strong>
                                                {formatDateTime(
                                                    selectedDeposit.rejectedAt
                                                )}
                                            </strong>
                                        </div>

                                        <div className="mt-3 rounded-lg bg-red-500/5 p-3">

                                            <div className="text-xs text-red-400">
                                                {t("Rejection Reason")}
                                            </div>

                                            <div className="mt-1">
                                                {
                                                    selectedDeposit.rejectionReason ||
                                                    "-"
                                                }
                                            </div>

                                        </div>

                                    </div>

                                </div>
                            )}

                            {/* Actions */}

                            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-5">

                                {selectedDeposit.status !==
                                    "approved" && (
                                    <button
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            approveDeposit(
                                                selectedDeposit
                                            )
                                        }
                                        className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
                                    >
                                        {selectedDeposit.status ===
                                        "rejected"
                                            ? t("Approve Again")
                                            : t("Approve")}
                                    </button>
                                )}

                                {selectedDeposit.status ===
                                    "pending" && (
                                    <button
                                        disabled={
                                            actionLoading
                                        }
                                        onClick={() =>
                                            openRejectModal(
                                                selectedDeposit
                                            )
                                        }
                                        className="rounded-xl bg-red-500 px-5 py-3 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-50"
                                    >
                                        {t("Reject")}
                                    </button>
                                )}

                                {selectedDeposit.status ===
                                    "approved" && (
                                    <button
                                        onClick={() =>
                                            printReceipt(
                                                selectedDeposit
                                            )
                                        }
                                        className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-blue-400"
                                    >
                                        {t("Print Receipt")}
                                    </button>
                                )}

                            </div>

                        </div>

                    </Modal>
                )}

            {/* =====================================================
               Reject Modal
            ===================================================== */}

            {showRejectModal &&
                selectedDeposit && (
                    <Modal
                        title={t("Reject Deposit")}
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
                                    {t("Reject Deposit")}
                                </div>

                                <div className="mt-1 text-sm text-slate-400">
                                    {t("Deposit ID")}:{" "}
                                    <strong className="text-slate-200">
                                        {
                                            selectedDeposit.depositId
                                        }
                                    </strong>
                                </div>

                                <div className="mt-1 text-sm text-slate-400">
                                    {t("Amount")}:{" "}
                                    <strong className="text-slate-200">
                                        ৳{" "}
                                        {formatMoney(
                                            selectedDeposit.amount
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
                                    placeholder={t("Why is this deposit being rejected?")}
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
                                        rejectDeposit
                                    }
                                    className="rounded-xl bg-red-500 px-6 py-3 text-sm font-bold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
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
   Summary Card
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

                    <div className="mt-2 text-2xl font-black text-white">
                        {count}
                    </div>

                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-xl text-emerald-400">
                    {icon}
                </div>

            </div>

            <div className="mt-4">

                <div className="text-lg font-bold text-emerald-400">
                    ৳ {formatMoney(amount)}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                    {description}
                </div>

            </div>

        </div>
    );
}

/* =========================================================
   Tab Button
========================================================= */

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
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
            }`}
        >
            {children}
        </button>
    );
}

/* =========================================================
   Tab Count
========================================================= */

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

/* =========================================================
   Status Badge
========================================================= */

function StatusBadge({
    status,
}: {
    status: DepositStatus;
}) {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);

    if (status === "approved") {
        return (
            <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400">
                ✓ {t("Approved")}
            </span>
        );
    }

    if (status === "rejected") {
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

/* =========================================================
   Form Input
========================================================= */

function FormInput({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-500"
            />

        </div>
    );
}

/* =========================================================
   Detail Item
========================================================= */

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
                        ? "text-emerald-400"
                        : "text-slate-200"
                }`}
            >
                {value || "-"}
            </div>

        </div>
    );
}

/* =========================================================
   Section Title
========================================================= */

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

/* =========================================================
   Modal
========================================================= */

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