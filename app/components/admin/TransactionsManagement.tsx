"use client";
// বাংলা: এই shared UI component-এ TransactionsManagement অংশের display ও interaction পরিচালিত হয়।

import {
    useEffect,
    useMemo,
    useState,
} from "react";
import { SITE_LOGO } from "@/lib/site-branding";
import { openOfficialReceipt } from "@/lib/transaction-receipt";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

type TransactionType =
    | "deposit"
    | "withdrawal"
    | "loan";

type TransactionStatus =
    | "pending"
    | "approved"
    | "rejected";

interface Transaction {
    id: string;
    transactionId: string;

    type: TransactionType;

    memberId: string;
    memberName: string;
    memberPhone: string;

    amount: number;
    date: string | null;

    status: TransactionStatus;

    paymentMethod: string;
    transactionReference: string;

    description: string;

    moneyIn: number;
    moneyOut: number;

    receiptId: string;

    rejectionReason: string;

    approvedBy: string;
    approvedAt: string | null;

    rejectedBy: string;
    rejectedAt: string | null;

    sourceSheet: string;
}

interface Summary {
    total: {
        count: number;
        amount: number;
    };

    moneyIn: number;
    moneyOut: number;
    balance: number;

    pending: {
        count: number;
        amount: number;
    };

    approved: {
        count: number;
        amount: number;
    };

    rejected: {
        count: number;
        amount: number;
    };

    byType: {
        deposits: {
            count: number;
            amount: number;
        };

        withdrawals: {
            count: number;
            amount: number;
        };

        loans: {
            count: number;
            amount: number;
        };
    };
}

type FilterType =
    | "all"
    | "deposit"
    | "withdrawal"
    | "loan"
    | "pending"
    | "approved"
    | "rejected";

const emptySummary: Summary = {
    total: {
        count: 0,
        amount: 0,
    },

    moneyIn: 0,
    moneyOut: 0,
    balance: 0,

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

    byType: {
        deposits: {
            count: 0,
            amount: 0,
        },

        withdrawals: {
            count: 0,
            amount: 0,
        },

        loans: {
            count: 0,
            amount: 0,
        },
    },
};

const LOGO = SITE_LOGO;

function money(value: number) {
    return new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 0,
    }).format(value || 0);
}

function formatDate(value: string | null) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-BD", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(value: string | null) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-BD", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getTypeLabel(type: TransactionType) {
    if (type === "deposit") {
        return "Deposit";
    }

    if (type === "withdrawal") {
        return "Withdrawal";
    }

    return "Loan";
}

function getTypeClass(type: TransactionType) {
    if (type === "deposit") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (type === "withdrawal") {
        return "bg-red-100 text-red-700";
    }

    return "bg-blue-100 text-blue-700";
}

function getStatusClass(status: TransactionStatus) {
    if (status === "approved") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status === "rejected") {
        return "bg-red-100 text-red-700";
    }

    return "bg-amber-100 text-amber-700";
}

// বাংলা: এই component transaction record filter, details review ও management action পরিচালনা করে।
export default function TransactionsManagement() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);
    const [transactions, setTransactions] = useState<Transaction[]>(
        [],
    );

    const [summary, setSummary] =
        useState<Summary>(emptySummary);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [filter, setFilter] =
        useState<FilterType>("all");

    const [selected, setSelected] =
        useState<Transaction | null>(null);

    const [showDetails, setShowDetails] =
        useState(false);

    const [receiptTransaction, setReceiptTransaction] =
        useState<Transaction | null>(null);

    async function loadTransactions() {
        try {
            setLoading(true);
            setError("");

            const response =
                await fetch("/api/transactions", {
                    cache: "no-store",
                });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data?.message ||
                        "Transactions load failed",
                );
            }

            setTransactions(
                data.transactions || [],
            );

            setSummary(
                data.summary || emptySummary,
            );
        } catch (error: any) {
            console.error(error);

            setError(
                error?.message ||
                    "Transactions load failed",
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTransactions();
    }, []);

    const filteredTransactions = useMemo(() => {
        const query =
            search.trim().toLowerCase();

        return transactions.filter((transaction) => {
            const matchesSearch =
                !query ||
                transaction.transactionId
                    ?.toLowerCase()
                    .includes(query) ||
                transaction.memberId
                    ?.toLowerCase()
                    .includes(query) ||
                transaction.memberName
                    ?.toLowerCase()
                    .includes(query) ||
                transaction.memberPhone
                    ?.toLowerCase()
                    .includes(query) ||
                transaction.transactionReference
                    ?.toLowerCase()
                    .includes(query);

            if (!matchesSearch) {
                return false;
            }

            if (filter === "all") {
                return true;
            }

            if (
                filter === "deposit" ||
                filter === "withdrawal" ||
                filter === "loan"
            ) {
                return transaction.type === filter;
            }

            return transaction.status === filter;
        });
    }, [
        transactions,
        search,
        filter,
    ]);

    function openDetails(transaction: Transaction) {
        setSelected(transaction);
        setShowDetails(true);
    }

    function closeDetails() {
        setSelected(null);
        setShowDetails(false);
    }

    function openManagementPage(
        transaction: Transaction,
    ) {
        if (transaction.type === "deposit") {
            window.location.href =
                "/admin/dashboard/deposits";
            return;
        }

        if (transaction.type === "withdrawal") {
            window.location.href =
                "/admin/dashboard/withdrawals";
            return;
        }

        window.location.href =
            "/admin/dashboard/loans";
    }

    function printReceipt(transaction: Transaction) {
        if (transaction.status !== "approved") return;

        const opened = openOfficialReceipt({
            kind: transaction.type === "loan" ? "transaction" : transaction.type,
            receiptId: transaction.receiptId || transaction.transactionId,
            transactionId: transaction.transactionId,
            referenceId: transaction.id,
            memberId: transaction.memberId,
            memberName: transaction.memberName,
            memberPhone: transaction.memberPhone,
            date: transaction.date || "",
            paymentMethod: transaction.paymentMethod,
            paymentReference: transaction.transactionReference,
            amount: transaction.amount,
            description: transaction.description,
            approvedBy: transaction.approvedBy,
            approvedAt: transaction.approvedAt || "",
        }, language, LOGO);

        if (!opened) {
            window.alert(t("Popup blocked. Please allow popups in your browser."));
        }
    }

    const tabs: {
        key: FilterType;
        label: string;
        count?: number;
    }[] = [
        {
            key: "all",
            label: t("All Transactions"),
            count: summary.total.count,
        },

        {
            key: "deposit",
            label: t("Deposits"),
            count: summary.byType.deposits.count,
        },

        {
            key: "withdrawal",
            label: t("Withdrawals"),
            count: summary.byType.withdrawals.count,
        },

        {
            key: "loan",
            label: t("Loans"),
            count: summary.byType.loans.count,
        },

        {
            key: "pending",
            label: t("Pending"),
            count: summary.pending.count,
        },

        {
            key: "approved",
            label: t("Approved"),
            count: summary.approved.count,
        },

        {
            key: "rejected",
            label: t("Rejected"),
            count: summary.rejected.count,
        },
    ];

    return (
        <>
            <div className="min-h-screen bg-gray-100 p-4 md:p-6">
                <div className="mx-auto max-w-[1600px]">
                    {/* HEADER */}
                    <div className="mb-6 flex flex-col justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm md:flex-row md:items-center">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white shadow-lg">
                                    ⇄
                                </div>

                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                                        {t("Transactions")}
                                    </h1>

                                    <p className="mt-1 text-sm text-gray-500">
                                        {t("Complete history of deposits, withdrawals, and loans")}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={loadTransactions}
                            disabled={loading}
                            className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                        >
                            {loading
                                ? t("Loading...")
                                : `↻ ${t("Refresh")}`}
                        </button>
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                            <div className="font-semibold">
                                {t("Transaction API Error")}
                            </div>

                            <div className="mt-1 text-sm">
                                {error}
                            </div>

                            <button
                                onClick={loadTransactions}
                                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                            >
                                {t("Retry")}
                            </button>
                        </div>
                    )}

                    {/* SUMMARY */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <SummaryCard
                            title={t("Total")}
                            value={summary.total.count}
                            subtitle={money(
                                summary.total.amount,
                            )}
                            icon="▣"
                        />

                        <SummaryCard
                            title={t("Money In")}
                            value={money(
                                summary.moneyIn,
                            )}
                            subtitle={`${summary.byType.deposits.count} ${t("deposits")}`}
                            icon="↓"
                            positive
                        />

                        <SummaryCard
                            title={t("Money Out")}
                            value={money(
                                summary.moneyOut,
                            )}
                            subtitle={`${summary.byType.withdrawals.count + summary.byType.loans.count} ${t("out transactions")}`}
                            icon="↑"
                            negative
                        />

                        <SummaryCard
                            title={t("Pending")}
                            value={summary.pending.count}
                            subtitle={money(
                                summary.pending.amount,
                            )}
                            icon="◷"
                            warning
                        />

                        <SummaryCard
                            title={t("Approved")}
                            value={summary.approved.count}
                            subtitle={money(
                                summary.approved.amount,
                            )}
                            icon="✓"
                            positive
                        />

                        <SummaryCard
                            title={t("Rejected")}
                            value={summary.rejected.count}
                            subtitle={money(
                                summary.rejected.amount,
                            )}
                            icon="!"
                            negative
                        />
                    </div>

                    {/* BALANCE */}
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="text-sm text-gray-500">
                                {t("Deposit")}
                            </div>

                            <div className="mt-2 text-2xl font-bold text-emerald-700">
                                {money(
                                    summary.byType.deposits.amount,
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="text-sm text-gray-500">
                                {t("Withdrawal")}
                            </div>

                            <div className="mt-2 text-2xl font-bold text-red-700">
                                {money(
                                    summary.byType.withdrawals.amount,
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                            <div className="text-sm text-gray-500">
                                {t("Loan Disbursement")}
                            </div>

                            <div className="mt-2 text-2xl font-bold text-blue-700">
                                {money(
                                    summary.byType.loans.amount,
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FILTER AREA */}
                    <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
                        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap gap-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() =>
                                            setFilter(
                                                tab.key,
                                            )
                                        }
                                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                                            filter ===
                                            tab.key
                                                ? "bg-emerald-600 text-white shadow"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        {tab.label}

                                        {typeof tab.count ===
                                            "number" && (
                                            <span
                                                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                                                    filter ===
                                                    tab.key
                                                        ? "bg-white/20"
                                                        : "bg-white"
                                                }`}
                                            >
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full lg:max-w-sm">
                                <input
                                    value={search}
                                    onChange={(e) =>
                                        setSearch(
                                            e.target.value,
                                        )
                                    }
                                    placeholder={t("Search ID, Member, Phone...")}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* TABLE */}
                        {loading ? (
                            <LoadingTable />
                        ) : filteredTransactions.length ===
                          0 ? (
                            <EmptyState />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1100px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wider text-gray-400">
                                            <th className="px-4 py-4">
                                                {t("Transaction")}
                                            </th>

                                            <th className="px-4 py-4">
                                                {t("Member")}
                                            </th>

                                            <th className="px-4 py-4">
                                                {t("Type")}
                                            </th>

                                            <th className="px-4 py-4">
                                                {t("Date")}
                                            </th>

                                            <th className="px-4 py-4 text-right">
                                                {t("Amount")}
                                            </th>

                                            <th className="px-4 py-4">
                                                {t("In / Out")}
                                            </th>

                                            <th className="px-4 py-4">
                                                {t("Status")}
                                            </th>

                                            <th className="px-4 py-4 text-right">
                                                {t("Action")}
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {filteredTransactions.map(
                                            (
                                                transaction,
                                            ) => (
                                                <tr
                                                    key={
                                                        transaction.id
                                                    }
                                                    className="border-b border-gray-50 transition hover:bg-gray-50"
                                                >
                                                    <td className="px-4 py-4">
                                                        <div className="font-semibold text-gray-900">
                                                            {
                                                                transaction.transactionId
                                                            }
                                                        </div>

                                                        {transaction.transactionReference && (
                                                            <div className="mt-1 text-xs text-gray-400">
                                                                Ref:{" "}
                                                                {
                                                                    transaction.transactionReference
                                                                }
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="font-semibold text-gray-800">
                                                            {transaction.memberName ||
                                                                "Unknown Member"}
                                                        </div>

                                                        <div className="mt-1 text-xs text-gray-400">
                                                            {
                                                                transaction.memberId
                                                            }
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`rounded-full px-3 py-1 text-xs font-bold ${getTypeClass(
                                                                transaction.type,
                                                            )}`}
                                                        >
                                                            {t(getTypeLabel(
                                                                transaction.type,
                                                            ))}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-sm text-gray-600">
                                                        {formatDate(
                                                            transaction.date,
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        <div className="font-bold text-gray-900">
                                                            {money(
                                                                transaction.amount,
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        {transaction.moneyIn >
                                                        0 ? (
                                                            <span className="font-semibold text-emerald-600">
                                                                +{" "}
                                                                {money(
                                                                    transaction.moneyIn,
                                                                )}
                                                            </span>
                                                        ) : transaction.moneyOut >
                                                          0 ? (
                                                            <span className="font-semibold text-red-600">
                                                                -{" "}
                                                                {money(
                                                                    transaction.moneyOut,
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">
                                                                -
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusClass(
                                                                transaction.status,
                                                            )}`}
                                                        >
                                                            {
                                                                t(transaction.status)
                                                            }
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    openDetails(
                                                                        transaction,
                                                                    )
                                                                }
                                                                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                                                            >
                                                                {t("View")}
                                                            </button>

                                                            {transaction.status ===
                                                                "approved" && (
                                                                <button
                                                                    onClick={() =>
                                                                        printReceipt(
                                                                            transaction,
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                                                                >
                                                                    {t("Receipt")}
                                                                </button>
                                                            )}

                                                            {transaction.status ===
                                                                "pending" && (
                                                                <button
                                                                    onClick={() =>
                                                                        openManagementPage(
                                                                            transaction,
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                                                                >
                                                                    {t("Manage")}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 text-sm text-gray-500">
                        Showing{" "}
                        <span className="font-semibold text-gray-800">
                            {filteredTransactions.length}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-gray-800">
                            {transactions.length}
                        </span>{" "}
                        transactions
                    </div>
                </div>
            </div>

            {/* DETAILS MODAL */}
            {showDetails && selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    Transaction Details
                                </h2>

                                <p className="mt-1 text-sm text-gray-500">
                                    {
                                        selected.transactionId
                                    }
                                </p>
                            </div>

                            <button
                                onClick={closeDetails}
                                className="rounded-xl bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <div className="text-xs text-gray-400">
                                        Type
                                    </div>

                                    <div
                                        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${getTypeClass(
                                            selected.type,
                                        )}`}
                                    >
                                        {getTypeLabel(
                                            selected.type,
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <div className="text-xs text-gray-400">
                                        Status
                                    </div>

                                    <div
                                        className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusClass(
                                            selected.status,
                                        )}`}
                                    >
                                        {
                                            selected.status
                                        }
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <div className="text-xs text-gray-400">
                                        Amount
                                    </div>

                                    <div className="mt-2 text-xl font-bold text-gray-900">
                                        {money(
                                            selected.amount,
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DetailsGrid
                                transaction={
                                    selected
                                }
                            />

                            {selected.status ===
                                "rejected" && (
                                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
                                    <h3 className="font-bold text-red-700">
                                        Rejection Details
                                    </h3>

                                    <div className="mt-3 grid gap-3 text-sm">
                                        <div>
                                            <span className="text-red-500">
                                                Reason:
                                            </span>{" "}
                                            <span className="font-medium text-red-800">
                                                {selected.rejectionReason ||
                                                    "No reason provided"}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-red-500">
                                                Rejected By:
                                            </span>{" "}
                                            <span className="font-medium text-red-800">
                                                {selected.rejectedBy ||
                                                    "-"}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-red-500">
                                                Rejected At:
                                            </span>{" "}
                                            <span className="font-medium text-red-800">
                                                {formatDateTime(
                                                    selected.rejectedAt,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selected.status ===
                                "approved" && (
                                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                                    <h3 className="font-bold text-emerald-700">
                                        Approval Details
                                    </h3>

                                    <div className="mt-3 grid gap-3 text-sm">
                                        <div>
                                            <span className="text-emerald-600">
                                                Approved By:
                                            </span>{" "}
                                            <span className="font-medium text-emerald-800">
                                                {selected.approvedBy ||
                                                    "-"}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-emerald-600">
                                                Approved At:
                                            </span>{" "}
                                            <span className="font-medium text-emerald-800">
                                                {formatDateTime(
                                                    selected.approvedAt,
                                                )}
                                            </span>
                                        </div>

                                        <div>
                                            <span className="text-emerald-600">
                                                Receipt:
                                            </span>{" "}
                                            <span className="font-medium text-emerald-800">
                                                {selected.receiptId ||
                                                    "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap justify-end gap-3">
                                {selected.status ===
                                    "pending" && (
                                    <button
                                        onClick={() =>
                                            openManagementPage(
                                                selected,
                                            )
                                        }
                                        className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                                    >
                                        Manage Transaction
                                    </button>
                                )}

                                {selected.status ===
                                    "approved" && (
                                    <button
                                        onClick={() =>
                                            printReceipt(
                                                selected,
                                            )
                                        }
                                        className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                                    >
                                        {t("Print Receipt")}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT RECEIPT */}
            {receiptTransaction && (
                <div className="print-receipt">
                    <div className="receipt-paper">
                        <div className="receipt-watermark">
                            <img
                                src={LOGO}
                                alt="Al-Insaf Logo"
                            />
                        </div>

                        <div className="receipt-content">
                            <div className="text-center">
                                <img
                                    src={LOGO}
                                    alt="Al-Insaf"
                                    className="mx-auto mb-3 h-20 w-20 object-contain"
                                />

                                <h1 className="text-2xl font-bold">
                                    AL-INSAF INVESTMENT LTD.
                                </h1>

                                <p className="mt-1 text-sm">
                                    Transaction Receipt
                                </p>

                                <div className="mx-auto mt-4 h-px w-full bg-gray-300" />
                            </div>

                            <div className="mt-6 text-center">
                                <h2 className="text-xl font-bold">
                                    {getTypeLabel(
                                        receiptTransaction.type,
                                    )}{" "}
                                    Receipt
                                </h2>

                                <p className="mt-2 text-sm">
                                    Receipt ID:{" "}
                                    <strong>
                                        {receiptTransaction.receiptId ||
                                            receiptTransaction.transactionId}
                                    </strong>
                                </p>
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                <ReceiptRow
                                    label="Transaction ID"
                                    value={
                                        receiptTransaction.transactionId
                                    }
                                />

                                <ReceiptRow
                                    label="Date"
                                    value={formatDate(
                                        receiptTransaction.date,
                                    )}
                                />

                                <ReceiptRow
                                    label="Member ID"
                                    value={
                                        receiptTransaction.memberId ||
                                        "-"
                                    }
                                />

                                <ReceiptRow
                                    label="Member Name"
                                    value={
                                        receiptTransaction.memberName ||
                                        "-"
                                    }
                                />

                                <ReceiptRow
                                    label="Phone"
                                    value={
                                        receiptTransaction.memberPhone ||
                                        "-"
                                    }
                                />

                                <ReceiptRow
                                    label="Payment Method"
                                    value={
                                        receiptTransaction.paymentMethod ||
                                        "-"
                                    }
                                />

                                <ReceiptRow
                                    label="Reference"
                                    value={
                                        receiptTransaction.transactionReference ||
                                        "-"
                                    }
                                />

                                <ReceiptRow
                                    label="Source"
                                    value={
                                        receiptTransaction.sourceSheet ||
                                        "-"
                                    }
                                />
                            </div>

                            <div className="mt-8 rounded-xl border border-gray-300 p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold">
                                        Transaction Amount
                                    </span>

                                    <span className="text-2xl font-bold">
                                        {money(
                                            receiptTransaction.amount,
                                        )}
                                    </span>
                                </div>

                                <div className="mt-3 flex items-center justify-between border-t pt-3">
                                    <span className="text-sm">
                                        Money In
                                    </span>

                                    <span className="font-semibold text-emerald-700">
                                        {money(
                                            receiptTransaction.moneyIn,
                                        )}
                                    </span>
                                </div>

                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-sm">
                                        Money Out
                                    </span>

                                    <span className="font-semibold text-red-700">
                                        {money(
                                            receiptTransaction.moneyOut,
                                        )}
                                    </span>
                                </div>
                            </div>

                            {receiptTransaction.description && (
                                <div className="mt-6 rounded-xl bg-gray-50 p-4">
                                    <div className="text-xs font-semibold uppercase text-gray-400">
                                        Description
                                    </div>

                                    <div className="mt-2 text-sm">
                                        {
                                            receiptTransaction.description
                                        }
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 grid grid-cols-2 gap-8 text-center">
                                <div>
                                    <div className="mb-2 border-t border-gray-400 pt-2 text-sm">
                                        Authorized By
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        {
                                            receiptTransaction.approvedBy ||
                                            "Admin"
                                        }
                                    </div>
                                </div>

                                <div>
                                    <div className="mb-2 border-t border-gray-400 pt-2 text-sm">
                                        Member Signature
                                    </div>

                                    <div className="text-xs text-gray-500">
                                        __________________
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 text-center text-xs text-gray-500">
                                <p>
                                    This is a computer-generated
                                    receipt.
                                </p>

                                <p className="mt-1">
                                    AL-INSAF INVESTMENT LTD.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .print-receipt {
                    display: none;
                }

                @media print {
                    body * {
                        visibility: hidden !important;
                    }

                    .print-receipt,
                    .print-receipt * {
                        visibility: visible !important;
                    }

                    .print-receipt {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }

                    .receipt-paper {
                        position: relative;
                        width: 100%;
                        min-height: 100vh;
                        padding: 30px;
                        background: white;
                        overflow: hidden;
                    }

                    .receipt-content {
                        position: relative;
                        z-index: 2;
                    }

                    .receipt-watermark {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1;
                        pointer-events: none;
                    }

                    .receipt-watermark img {
                        width: 420px;
                        height: 420px;
                        object-fit: contain;
                        opacity: 0.07;
                    }

                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                }
            `}</style>
        </>
    );
}

function SummaryCard({
    title,
    value,
    subtitle,
    icon,
    positive,
    negative,
    warning,
}: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: string;
    positive?: boolean;
    negative?: boolean;
    warning?: boolean;
}) {
    let iconClass =
        "bg-gray-100 text-gray-700";

    if (positive) {
        iconClass =
            "bg-emerald-100 text-emerald-700";
    }

    if (negative) {
        iconClass =
            "bg-red-100 text-red-700";
    }

    if (warning) {
        iconClass =
            "bg-amber-100 text-amber-700";
    }

    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-sm text-gray-500">
                        {title}
                    </div>

                    <div className="mt-2 text-xl font-bold text-gray-900">
                        {value}
                    </div>

                    <div className="mt-1 text-xs text-gray-400">
                        {subtitle}
                    </div>
                </div>

                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-bold ${iconClass}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}

function DetailsGrid({
    transaction,
}: {
    transaction: Transaction;
}) {
    const rows = [
        [
            "Transaction ID",
            transaction.transactionId,
        ],

        [
            "Member ID",
            transaction.memberId || "-",
        ],

        [
            "Member Name",
            transaction.memberName || "-",
        ],

        [
            "Member Phone",
            transaction.memberPhone || "-",
        ],

        [
            "Date",
            formatDateTime(transaction.date),
        ],

        [
            "Amount",
            money(transaction.amount),
        ],

        [
            "Payment Method",
            transaction.paymentMethod || "-",
        ],

        [
            "Transaction Reference",
            transaction.transactionReference || "-",
        ],

        [
            "Money In",
            money(transaction.moneyIn),
        ],

        [
            "Money Out",
            money(transaction.moneyOut),
        ],

        [
            "Receipt ID",
            transaction.receiptId || "-",
        ],

        [
            "Source",
            transaction.sourceSheet || "-",
        ],
    ];

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {rows.map(([label, value]) => (
                <div
                    key={label}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                >
                    <div className="text-xs text-gray-400">
                        {label}
                    </div>

                    <div className="mt-1 break-words text-sm font-semibold text-gray-800">
                        {value}
                    </div>
                </div>
            ))}

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2">
                <div className="text-xs text-gray-400">
                    Description
                </div>

                <div className="mt-1 text-sm font-semibold text-gray-800">
                    {transaction.description ||
                        "-"}
                </div>
            </div>
        </div>
    );
}

function ReceiptRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <div className="text-xs text-gray-500">
                {label}
            </div>

            <div className="mt-1 border-b border-gray-300 pb-1 font-semibold">
                {value}
            </div>
        </div>
    );
}

function LoadingTable() {
    return (
        <div className="space-y-3">
            {Array.from({
                length: 7,
            }).map((_, index) => (
                <div
                    key={index}
                    className="h-16 animate-pulse rounded-xl bg-gray-100"
                />
            ))}
        </div>
    );
}

function EmptyState() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);

    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200">
            <div className="text-5xl">▣</div>

            <h3 className="mt-4 text-lg font-bold text-gray-700">
                {t("No transactions found")}
            </h3>

            <p className="mt-1 text-sm text-gray-400">
                {t("No transactions match your search or filters.")}
            </p>
        </div>
    );
}