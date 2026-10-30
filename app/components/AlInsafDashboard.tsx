"use client";
// বাংলা: এই shared UI component-এ AlInsafDashboard অংশের display ও interaction পরিচালিত হয়।

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";
import {
    CalendarDays,
    Package,
    LayoutDashboard,
    Receipt,
    RefreshCw,
    ShoppingCart,
    TrendingUp,
    UserRound,
    Users,
    Wallet,
    type LucideIcon,
} from "lucide-react";

interface Dashboard {
    members: {
        total: number;
        active: number;
    };

    customers: {
        total: number;
    };

    collections: {
        total: number;
        member: number;
        customer: number;
        currentMonth: number;
        currentMonthMember: number;
        currentMonthCustomer: number;
    };

    investments: {
        total: number;
        cost: number;
        sales: number;
        profit: number;
    };

    expenses: {
        total: number;
        currentMonth: number;
    };

    cash: {
        in: number;
        out: number;
        balance: number;
    };

    payments: {
        total: number;
        member: number;
        customer: number;
        approved: number;
        pending: number;
    };

    recentPayments: Array<{
        id: string;
        memberId: string;
        memberName: string;
        amount: number;
        status: string;
        date: string | null;
    }>;

    recentInvestments: Array<{
        id: string;
        customerId: string;
        product: string;
        cost: number;
        salePrice: number;
        profit: number;
        status: string;
        date: string | null;
    }>;
}

interface ApiResponse {
    success: boolean;
    message?: string;
    dashboard?: Dashboard;
}

const money = (value: number) =>
    new Intl.NumberFormat("bn-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);

const number = (value: number) =>
    Number(value || 0).toLocaleString("bn-BD");

function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("bn-BD");
}

// বাংলা: admin summary, cashbook এবং সাম্প্রতিক payment/investment দেখায়।
export default function AlInsafDashboard() {
    const { bn, language } = useLanguage();
    const t = (value: string) => translate(language, value);
    const [data, setData] =
        useState<Dashboard | null>(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                "/api/admin/dashboard",
                {
                    method: "GET",
                    credentials: "include",
                    cache: "no-store",
                    headers: {
                        Accept: "application/json",
                    },
                },
            );

            const contentType =
                response.headers.get(
                    "content-type",
                ) || "";

            const responseText =
                await response.text();

            /*
             * -----------------------------------------
             * HTTP ERROR
             * -----------------------------------------
             */

            if (!response.ok) {
                let apiMessage = "";
                if (
                    contentType.includes(
                        "application/json",
                    )
                ) {
                    try {
                        const errorData =
                            JSON.parse(
                                responseText,
                            ) as ApiResponse;

                        apiMessage = errorData.message || "";
                    } catch {
                        console.error(
                            "Dashboard API returned malformed JSON:",
                            responseText.slice(0, 1000),
                        );
                    }
                }
                console.error("Dashboard API request failed:", {
                    status: response.status,
                    message: apiMessage,
                });
                throw new Error("Unable to load dashboard data");
            }

            /*
             * -----------------------------------------
             * CONTENT TYPE CHECK
             * -----------------------------------------
             */

            if (
                !contentType.includes(
                    "application/json",
                )
            ) {
                console.error("Dashboard API returned a non-JSON response:", {
                    contentType,
                    response: responseText.slice(0, 1000),
                });
                throw new Error("Dashboard response was not valid JSON");
            }

            /*
             * -----------------------------------------
             * JSON PARSE
             * -----------------------------------------
             */

            let result: ApiResponse;

            try {
                result =
                    JSON.parse(
                        responseText,
                    );
            } catch {
                console.error(
                    "Dashboard API response could not be parsed as JSON:",
                    responseText.slice(0, 1000),
                );
                throw new Error("Dashboard response was not valid JSON");
            }

            /*
             * -----------------------------------------
             * API SUCCESS CHECK
             * -----------------------------------------
             */

            if (!result.success) {
                throw new Error(
                    result.message || "Unable to load dashboard data",
                );
            }

            if (!result.dashboard) {
                throw new Error("Unable to load dashboard data");
            }

            /*
             * -----------------------------------------
             * SET DATA
             * -----------------------------------------
             */

            setData(
                result.dashboard,
            );
        } catch (error) {
            console.error(
                "Dashboard Error:",
                error,
            );

            setError(
                error instanceof TypeError
                    ? "Unable to connect to the server."
                    : error instanceof Error
                        ? error.message
                        : "Unable to load dashboard data",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    /*
     * ---------------------------------------------
     * LOAD DASHBOARD
     * ---------------------------------------------
     */

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadDashboard();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [loadDashboard]);

    /*
     * ---------------------------------------------
     * LOADING
     * ---------------------------------------------
     */

    if (loading) {
        return <DashboardSkeleton />;
    }

    /*
     * ---------------------------------------------
     * ERROR
     * ---------------------------------------------
     */

    if (error) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">

                <div className="flex items-start gap-4">

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-xl">
                        ⚠️
                    </div>

                    <div className="min-w-0">

                        <h2 className="text-lg font-bold">
                            {t("Dashboard Error")}
                        </h2>

                        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-red-100 p-4 text-xs leading-6 text-red-800">
                            {t(error)}
                        </pre>

                        <button
                            onClick={() =>
                                void loadDashboard()
                            }
                            className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                            {t("Retry")}
                        </button>

                    </div>

                </div>

            </div>
        );
    }

    /*
     * ---------------------------------------------
     * NO DATA
     * ---------------------------------------------
     */

    if (!data) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="text-gray-500">
                    {t("Dashboard data is unavailable.")}
                </p>

                <button
                    onClick={() =>
                        void loadDashboard()
                    }
                    className="mt-4 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                    {t("Retry")}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-3 sm:p-4 xl:p-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-white p-5 shadow-sm dark:border-emerald-900/50 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-900/15">
                        <LayoutDashboard size={22} />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{bn ? "আল-ইনসাফ • অ্যাডমিন প্যানেল" : "AL-INSAAF • ADMIN PANEL"}</p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">{bn ? "ড্যাশবোর্ড সারসংক্ষেপ" : "Dashboard Overview"}</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{bn ? "প্রতিষ্ঠানের কার্যক্রম ও আর্থিক সারসংক্ষেপ" : "Organization activity and financial summary"}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    {bn ? "তথ্য রিফ্রেশ" : "Refresh data"}
                </button>
            </div>

            {/* =====================================================
                TOP STATS
            ====================================================== */}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard
                    title={t("Total Members")}
                    value={number(
                        data.members.total,
                    )}
                    subtitle={`${number(
                        data.members.active,
                    )} ${t("Active members")}`}
                    icon={Users}
                />

                <StatCard
                    title={t("Total Customers")}
                    value={number(
                        data.customers.total,
                    )}
                    subtitle={t("Registered Customers")}
                    icon={UserRound}
                />

                <StatCard
                    title={t("Total Collection")}
                    value={money(
                        data.collections.total,
                    )}
                    subtitle={t("Member + Customer")}
                    icon={Wallet}
                />

                <StatCard
                    title={t("This Month Collection")}
                    value={money(
                        data.collections.currentMonth,
                    )}
                    subtitle={t("Current Month")}
                    icon={CalendarDays}
                />

            </div>

            {/* =====================================================
                FINANCIAL STATS
            ====================================================== */}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard
                    title={t("Investment Cost")}
                    value={money(
                        data.investments.cost,
                    )}
                    subtitle={`${number(
                        data.investments.total,
                    )} ${t("Investments")}`}
                    icon={Package}
                />

                <StatCard
                    title={t("Sales")}
                    value={money(
                        data.investments.sales,
                    )}
                    subtitle={t("Customer Total Price")}
                    icon={ShoppingCart}
                />

                <StatCard
                    title={t("Profit")}
                    value={money(
                        data.investments.profit,
                    )}
                    subtitle={t("Investment Profit")}
                    icon={TrendingUp}
                />

                <StatCard
                    title={t("Expenses")}
                    value={money(
                        data.expenses.total,
                    )}
                    subtitle={`${t("This month")}: ${money(
                        data.expenses.currentMonth,
                    )}`}
                    icon={Receipt}
                />

            </div>

            {/* =====================================================
                COLLECTION BREAKDOWN
            ====================================================== */}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                <InfoCard
                    title={t("Member Collection")}
                    value={money(
                        data.collections.member,
                    )}
                    description={t("Total collected from members")}
                />

                <InfoCard
                    title={t("Customer Collection")}
                    value={money(
                        data.collections.customer,
                    )}
                    description={t("Total collected from customers")}
                />

                <InfoCard
                    title={t("Cash in Hand")}
                    value={money(
                        data.cash.balance,
                    )}
                    description={t("Current Cash Balance")}
                />

            </div>

            {/* =====================================================
                CURRENT MONTH
            ====================================================== */}

            <div className="rounded-2xl border border-emerald-100 bg-linear-to-r from-emerald-50 to-white p-6 shadow-sm dark:border-emerald-900/60 dark:from-slate-900 dark:to-slate-900">

                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

                    <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            {t("This Month Collection")}
                        </p>

                        <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                            {money(
                                data.collections.currentMonth,
                            )}
                        </h2>

                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {t("Member and customer collection this month")}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">

                        <MiniStat
                            title={t("Member")}
                            value={money(
                                data.collections
                                    .currentMonthMember,
                            )}
                        />

                        <MiniStat
                            title={t("Customer")}
                            value={money(
                                data.collections
                                    .currentMonthCustomer,
                            )}
                        />

                    </div>

                </div>

            </div>

            {/* =====================================================
                PAYMENT STATUS
            ====================================================== */}

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">

                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">

                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {t("Payment Overview")}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {t("Member and customer payment summary")}
                        </p>
                    </div>

                    <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
                        {t("Pending")}:{" "}
                        {number(
                            data.payments.pending,
                        )}
                    </div>

                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <MiniStat
                        title={t("Total")}
                        value={number(
                            data.payments.total,
                        )}
                    />

                    <MiniStat
                        title={t("Member")}
                        value={number(
                            data.payments.member,
                        )}
                    />

                    <MiniStat
                        title={t("Customer")}
                        value={number(
                            data.payments.customer,
                        )}
                    />

                    <MiniStat
                        title={t("Approved")}
                        value={number(
                            data.payments.approved,
                        )}
                    />

                </div>

            </div>

            {/* ক্যাশবুকের আয়, ব্যয় ও বর্তমান স্থিতি দেখায়; দুই থিমে আলাদা রঙ নেয়। */}

            <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-white via-emerald-50 to-cyan-50 p-6 text-gray-900 shadow-lg shadow-emerald-900/10 dark:border-emerald-800/70 dark:from-slate-950 dark:via-emerald-950 dark:to-cyan-950 dark:text-white dark:shadow-emerald-950/30">

                <div>
                    <h2 className="text-xl font-bold">
                        {t("CashBook")}
                    </h2>

                    <p className="mt-1 text-sm text-gray-400">
                        {t("Money In / Money Out / Balance")}
                    </p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">

                    <CashCard
                        title={t("Money In")}
                        value={money(
                            data.cash.in,
                        )}
                    />

                    <CashCard
                        title={t("Money Out")}
                        value={money(
                            data.cash.out,
                        )}
                    />

                    <CashCard
                        title={t("Balance")}
                        value={money(
                            data.cash.balance,
                        )}
                    />

                </div>

            </div>

            {/* =====================================================
                RECENT PAYMENTS
            ====================================================== */}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">

                <div className="border-b border-gray-200 p-6">

                    <h2 className="text-xl font-bold text-gray-900">
                        {t("Recent Payments")}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        {t("Latest member payments")}
                    </p>

                </div>

                <div className="overflow-x-auto">

                    <table className="w-full min-w-175 text-left">

                        <thead className="bg-gray-50 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-300">

                            <tr>

                                <th className="px-6 py-4">
                                    {t("Payment ID")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Member")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Amount")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Status")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Date")}
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {data.recentPayments.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-6 py-10 text-center text-sm text-gray-400"
                                    >
                                        {t("No payments found")}
                                    </td>
                                </tr>
                            ) : (
                                data.recentPayments.map(
                                    (payment) => (
                                        <tr
                                            key={
                                                payment.id
                                            }
                                            className="border-t border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                                        >

                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {
                                                    payment.id
                                                }
                                            </td>

                                            <td className="px-6 py-4">

                                                <div className="font-medium text-gray-900">
                                                    {payment.memberName ||
                                                        "-"}
                                                </div>

                                                <div className="text-xs text-gray-500">
                                                    {payment.memberId ||
                                                        "-"}
                                                </div>

                                            </td>

                                            <td className="px-6 py-4 font-semibold text-gray-900">
                                                {money(
                                                    payment.amount,
                                                )}
                                            </td>

                                            <td className="px-6 py-4">

                                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                    {t(payment.status ||
                                                        "approved")}
                                                </span>

                                            </td>

                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(
                                                    payment.date,
                                                )}
                                            </td>

                                        </tr>
                                    ),
                                )
                            )}

                        </tbody>

                    </table>

                </div>

            </div>

            {/* =====================================================
                RECENT INVESTMENTS
            ====================================================== */}

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">

                <div className="border-b border-gray-200 p-6">

                    <h2 className="text-xl font-bold text-gray-900">
                        {t("Recent Investments")}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                        {t("Latest investment records")}
                    </p>

                </div>

                <div className="overflow-x-auto">

                    <table className="w-full min-w-200 text-left">

                        <thead className="bg-gray-50 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-300">

                            <tr>

                                <th className="px-6 py-4">
                                    {t("Investment")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Product")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Cost")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Sale")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Profit")}
                                </th>

                                <th className="px-6 py-4">
                                    {t("Date")}
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {data.recentInvestments.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-6 py-10 text-center text-sm text-gray-400"
                                    >
                                        {t("No investments found")}
                                    </td>
                                </tr>
                            ) : (
                                data.recentInvestments.map(
                                    (
                                        investment,
                                    ) => (
                                        <tr
                                            key={
                                                investment.id
                                            }
                                            className="border-t border-gray-100 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                                        >

                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                {
                                                    investment.id
                                                }
                                            </td>

                                            <td className="px-6 py-4 text-gray-700">
                                                {investment.product ||
                                                    "-"}
                                            </td>

                                            <td className="px-6 py-4 text-gray-700">
                                                {money(
                                                    investment.cost,
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-gray-700">
                                                {money(
                                                    investment.salePrice,
                                                )}
                                            </td>

                                            <td className="px-6 py-4 font-semibold text-emerald-600">
                                                {money(
                                                    investment.profit,
                                                )}
                                            </td>

                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(
                                                    investment.date,
                                                )}
                                            </td>

                                        </tr>
                                    ),
                                )
                            )}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
}

/* =============================================================
   STAT CARD
============================================================= */

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
}: {
    title: string;
    value: string;
    subtitle: string;
    icon: LucideIcon;
}) {
    return (
        <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:hover:border-emerald-900">

            <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">

                    <p className="text-sm font-medium text-gray-500">
                        {title}
                    </p>

                    <h2 className="mt-2 break-all text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {value}
                    </h2>

                    <p className="mt-2 text-xs text-gray-400">
                        {subtitle}
                    </p>

                </div>

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950/40 dark:text-emerald-300">
                    <Icon size={20} strokeWidth={2} />
                </div>

            </div>

        </div>
    );
}

/* =============================================================
   INFO CARD
============================================================= */

function InfoCard({
    title,
    value,
    description,
}: {
    title: string;
    value: string;
    description: string;
}) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900">

            <p className="text-sm text-gray-500">
                {title}
            </p>

            <h3 className="mt-3 break-all text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {value}
            </h3>

            <p className="mt-2 text-xs text-gray-400">
                {description}
            </p>

        </div>
    );
}

/* =============================================================
   MINI STAT
============================================================= */

function MiniStat({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">

            <p className="text-sm text-gray-500">
                {title}
            </p>

            <p className="mt-2 break-all text-2xl font-bold text-gray-900 dark:text-white">
                {value}
            </p>

        </div>
    );
}

/* =============================================================
   CASH CARD
============================================================= */

function CashCard({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div className="rounded-xl border border-emerald-200/80 bg-white/80 p-5 text-gray-900 shadow-sm transition hover:border-emerald-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">

            <p className="text-sm text-gray-600 dark:text-gray-400">
                {title}
            </p>

            <p className="mt-3 break-all text-2xl font-bold">
                {value}
            </p>

        </div>
    );
}

/* =============================================================
   DASHBOARD SKELETON
============================================================= */

function DashboardSkeleton() {
    return (
        <div className="space-y-6">

            {/* Top cards */}

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

                {Array.from({
                    length: 8,
                }).map((_, index) => (
                    <div
                        key={index}
                        className="h-32 animate-pulse rounded-2xl bg-gray-200"
                    />
                ))}

            </div>

            {/* Collection */}

            <div className="h-64 animate-pulse rounded-2xl bg-gray-200" />

            {/* Table */}

            <div className="h-80 animate-pulse rounded-2xl bg-gray-200" />

        </div>
    );
}