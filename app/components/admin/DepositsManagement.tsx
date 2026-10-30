"use client";
// বাংলা: এই shared UI component-এ DepositsManagement অংশের display ও interaction পরিচালিত হয়।

import { useEffect, useMemo, useState } from "react";
import {
    Plus,
    WalletCards,
    RefreshCw,
    Search,
    CalendarDays,
    UserRound,
    FileText,
    CheckCircle2,
    Clock3,
    XCircle,
    Loader2,
    ShieldCheck,
    Receipt,
} from "lucide-react";

type Member = {
    _id: string;
    name: string;
    email?: string;
    memberId?: string;
    phone?: string;
};

type Deposit = {
    _id: string;
    transactionId?: string;
    amount: number;
    date: string;
    note?: string;
    status: "pending" | "approved" | "rejected";
    createdAt?: string;
    member?: {
        _id?: string;
        name?: string;
        email?: string;
        memberId?: string;
        phone?: string;
    };
};

const initialForm = {
    memberId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
};

// বাংলা: এই component admin deposit record খোঁজা, পর্যালোচনা এবং status action পরিচালনা করে।
export default function DepositsManagement() {
    const [members, setMembers] = useState<Member[]>([]);
    const [deposits, setDeposits] = useState<Deposit[]>([]);

    const [form, setForm] = useState(initialForm);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");

    const [statusFilter, setStatusFilter] = useState<
        "all" | "approved" | "pending" | "rejected"
    >("all");

    // =========================================================
    // LOAD DATA
    // =========================================================

    async function loadData(showRefresh = false) {
        try {
            if (showRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const response = await fetch("/api/deposits", {
                method: "GET",
                cache: "no-store",
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Deposit data load failed");
            }

            setMembers(data.members || []);
            setDeposits(data.deposits || []);
        } catch (err: any) {
            setError(err.message || "ডাটা লোড করা যায়নি");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    // =========================================================
    // TOTALS
    // =========================================================

    const approvedTotal = useMemo(() => {
        return deposits
            .filter((item) => item.status === "approved")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }, [deposits]);

    const pendingTotal = useMemo(() => {
        return deposits
            .filter((item) => item.status === "pending")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }, [deposits]);

    const rejectedTotal = useMemo(() => {
        return deposits
            .filter((item) => item.status === "rejected")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }, [deposits]);

    // =========================================================
    // FILTER
    // =========================================================

    const filteredDeposits = useMemo(() => {
        const query = search.trim().toLowerCase();

        return deposits.filter((deposit) => {
            const matchesStatus =
                statusFilter === "all" ||
                deposit.status === statusFilter;

            if (!matchesStatus) return false;

            if (!query) return true;

            const name = deposit.member?.name?.toLowerCase() || "";
            const memberId =
                deposit.member?.memberId?.toLowerCase() || "";
            const phone =
                deposit.member?.phone?.toLowerCase() || "";
            const transactionId =
                deposit.transactionId?.toLowerCase() || "";

            return (
                name.includes(query) ||
                memberId.includes(query) ||
                phone.includes(query) ||
                transactionId.includes(query)
            );
        });
    }, [deposits, search, statusFilter]);

    // =========================================================
    // ADD DEPOSIT
    // =========================================================

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!form.memberId) {
            setError("অনুগ্রহ করে একজন সদস্য নির্বাচন করুন");
            return;
        }

        const amount = Number(form.amount);

        if (!amount || amount <= 0) {
            setError("সঠিক টাকার পরিমাণ দিন");
            return;
        }

        if (!form.date) {
            setError("Deposit-এর তারিখ নির্বাচন করুন");
            return;
        }

        try {
            setSaving(true);

            const response = await fetch("/api/deposits", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    memberId: form.memberId,
                    amount,
                    date: form.date,
                    note: form.note,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Deposit save করা যায়নি"
                );
            }

            setSuccess(
                `Deposit সফলভাবে সংরক্ষণ হয়েছে। Transaction ID: ${
                    data.deposit?.transactionId || ""
                }`
            );

            setForm({
                ...initialForm,
                date: new Date().toISOString().split("T")[0],
            });

            await loadData(true);
        } catch (err: any) {
            setError(err.message || "Deposit save করা যায়নি");
        } finally {
            setSaving(false);
        }
    }

    // =========================================================
    // FORMAT
    // =========================================================

    function formatMoney(amount: number) {
        return new Intl.NumberFormat("en-BD", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }

    function formatDate(date?: string) {
        if (!date) return "-";

        const d = new Date(date);

        if (Number.isNaN(d.getTime())) return date;

        return d.toLocaleDateString("en-GB");
    }

    // =========================================================
    // STATUS
    // =========================================================

    function StatusBadge({
        status,
    }: {
        status: Deposit["status"];
    }) {
        if (status === "approved") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 size={14} />
                    Approved
                </span>
            );
        }

        if (status === "pending") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                    <Clock3 size={14} />
                    Pending
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                <XCircle size={14} />
                Rejected
            </span>
        );
    }

    // =========================================================
    // UI
    // =========================================================

    return (
        <div className="min-h-screen bg-[#020712] text-white">
            <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-6 lg:px-8">

                {/* ================================================= */}
                {/* HEADER */}
                {/* ================================================= */}

                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                                <WalletCards size={24} />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold md:text-3xl">
                                    Deposit Management
                                </h1>

                                <p className="mt-1 text-sm text-slate-400">
                                    সদস্যদের জমার হিসাব পরিচালনা করুন
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#07101e] px-5 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {refreshing ? (
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                        ) : (
                            <RefreshCw size={17} />
                        )}

                        Refresh
                    </button>
                </div>

                {/* ================================================= */}
                {/* ALERT */}
                {/* ================================================= */}

                {error && (
                    <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {success}
                    </div>
                )}

                {/* ================================================= */}
                {/* TOTAL APPROVED */}
                {/* ================================================= */}

                <div className="mb-7 rounded-2xl border border-emerald-500/40 bg-[#001517] p-6 shadow-[0_0_35px_rgba(16,185,129,0.04)]">

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                            <WalletCards size={29} />
                        </div>

                        <div>
                            <p className="text-sm text-slate-300">
                                মোট অনুমোদিত Deposit
                            </p>

                            <h2 className="mt-1 text-3xl font-bold text-emerald-400">
                                BDT {formatMoney(approvedTotal)}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* ================================================= */}
                {/* SMALL SUMMARY CARDS */}
                {/* ================================================= */}

                <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">

                    <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Approved
                            </span>

                            <CheckCircle2
                                size={20}
                                className="text-emerald-400"
                            />
                        </div>

                        <div className="mt-3 text-xl font-bold text-white">
                            BDT {formatMoney(approvedTotal)}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                            {deposits.filter(
                                (x) => x.status === "approved"
                            ).length}{" "}
                            transactions
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Pending
                            </span>

                            <Clock3
                                size={20}
                                className="text-yellow-400"
                            />
                        </div>

                        <div className="mt-3 text-xl font-bold text-white">
                            BDT {formatMoney(pendingTotal)}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                            {deposits.filter(
                                (x) => x.status === "pending"
                            ).length}{" "}
                            transactions
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#101a2b] p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">
                                Rejected
                            </span>

                            <XCircle
                                size={20}
                                className="text-red-400"
                            />
                        </div>

                        <div className="mt-3 text-xl font-bold text-white">
                            BDT {formatMoney(rejectedTotal)}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                            {deposits.filter(
                                (x) => x.status === "rejected"
                            ).length}{" "}
                            transactions
                        </p>
                    </div>
                </div>

                {/* ================================================= */}
                {/* NEW DEPOSIT */}
                {/* ================================================= */}

                <section className="mb-7 rounded-2xl border border-slate-800 bg-[#111b2c] p-5 shadow-xl md:p-6">

                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
                            <Plus size={21} />
                        </div>

                        <h2 className="text-xl font-bold">
                            নতুন Deposit যোগ করুন
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit}>

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                            {/* MEMBER */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">
                                    সদস্য নির্বাচন করুন *
                                </label>

                                <div className="relative">
                                    <UserRound
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <select
                                        value={form.memberId}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                memberId: e.target.value,
                                            })
                                        }
                                        className="w-full appearance-none rounded-xl border border-slate-700 bg-[#1d293b] px-11 py-4 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                                    >
                                        <option value="">
                                            সদস্য নির্বাচন করুন
                                        </option>

                                        {members.map((member) => (
                                            <option
                                                key={member._id}
                                                value={member._id}
                                            >
                                                {member.memberId
                                                    ? `${member.memberId} - `
                                                    : ""}
                                                {member.name}
                                                {member.phone
                                                    ? ` - ${member.phone}`
                                                    : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* AMOUNT */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">
                                    টাকার পরিমাণ (৳) *
                                </label>

                                <input
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={form.amount}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            amount: e.target.value,
                                        })
                                    }
                                    placeholder="যেমন: 1000"
                                    className="w-full rounded-xl border border-slate-700 bg-[#1d293b] px-4 py-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                                />
                            </div>

                            {/* DATE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">
                                    Deposit-এর তারিখ *
                                </label>

                                <div className="relative">
                                    <CalendarDays
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                date: e.target.value,
                                            })
                                        }
                                        className="w-full rounded-xl border border-slate-700 bg-[#1d293b] px-11 py-4 text-sm text-white outline-none transition focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* NOTE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">
                                    বিবরণ
                                </label>

                                <div className="relative">
                                    <FileText
                                        size={18}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="text"
                                        value={form.note}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                note: e.target.value,
                                            })
                                        }
                                        placeholder="যেমন: মাসিক সঞ্চয়"
                                        className="w-full rounded-xl border border-slate-700 bg-[#1d293b] px-11 py-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <Loader2
                                        size={18}
                                        className="animate-spin"
                                    />
                                    Deposit সংরক্ষণ হচ্ছে...
                                </>
                            ) : (
                                <>
                                    <Plus size={19} />
                                    Deposit সংরক্ষণ করুন
                                </>
                            )}
                        </button>
                    </form>
                </section>

                {/* ================================================= */}
                {/* HISTORY */}
                {/* ================================================= */}

                <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111b2c]">

                    {/* HEADER */}

                    <div className="border-b border-slate-800 p-5 md:p-6">

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                            <div>
                                <div className="flex items-center gap-3">
                                    <Receipt
                                        size={22}
                                        className="text-emerald-400"
                                    />

                                    <h2 className="text-xl font-bold">
                                        Deposit History
                                    </h2>
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                    মোট {filteredDeposits.length} টি Deposit
                                </p>
                            </div>

                            {/* SEARCH */}

                            <div className="flex flex-col gap-3 sm:flex-row">

                                <div className="relative">
                                    <Search
                                        size={18}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) =>
                                            setSearch(e.target.value)
                                        }
                                        placeholder="সদস্য খুঁজুন..."
                                        className="w-full rounded-xl border border-slate-700 bg-[#1d293b] py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 sm:w-[280px]"
                                    />
                                </div>

                                <select
                                    value={statusFilter}
                                    onChange={(e) =>
                                        setStatusFilter(
                                            e.target.value as any
                                        )
                                    }
                                    className="rounded-xl border border-slate-700 bg-[#1d293b] px-4 py-3 text-sm text-white outline-none focus:border-emerald-500"
                                >
                                    <option value="all">
                                        সব Status
                                    </option>
                                    <option value="approved">
                                        Approved
                                    </option>
                                    <option value="pending">
                                        Pending
                                    </option>
                                    <option value="rejected">
                                        Rejected
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* TABLE */}

                    {loading ? (
                        <div className="flex min-h-[300px] items-center justify-center">
                            <div className="flex items-center gap-3 text-slate-400">
                                <Loader2
                                    size={22}
                                    className="animate-spin"
                                />
                                Deposit data load হচ্ছে...
                            </div>
                        </div>
                    ) : filteredDeposits.length === 0 ? (
                        <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                                <Receipt size={25} />
                            </div>

                            <h3 className="text-lg font-semibold text-slate-300">
                                কোনো Deposit পাওয়া যায়নি
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                নতুন Deposit যোগ করলে এখানে দেখা যাবে।
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">

                            <table className="w-full min-w-[950px] text-left">

                                <thead className="border-b border-slate-800 bg-[#0c1524]">
                                    <tr>
                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Member
                                        </th>

                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Transaction ID
                                        </th>

                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Amount
                                        </th>

                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Date
                                        </th>

                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Description
                                        </th>

                                        <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Status
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-800">

                                    {filteredDeposits.map((deposit) => (
                                        <tr
                                            key={deposit._id}
                                            className="transition hover:bg-slate-800/30"
                                        >

                                            {/* MEMBER */}

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">

                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                                                        <UserRound
                                                            size={18}
                                                        />
                                                    </div>

                                                    <div>
                                                        <div className="font-semibold text-white">
                                                            {deposit.member
                                                                ?.name ||
                                                                "Unknown Member"}
                                                        </div>

                                                        <div className="mt-0.5 text-xs text-slate-500">
                                                            {deposit.member
                                                                ?.memberId ||
                                                                deposit.member
                                                                    ?.email ||
                                                                "-"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* TRANSACTION */}

                                            <td className="px-5 py-4">
                                                <span className="font-mono text-xs text-slate-300">
                                                    {deposit.transactionId ||
                                                        "-"}
                                                </span>
                                            </td>

                                            {/* AMOUNT */}

                                            <td className="px-5 py-4">
                                                <span className="font-bold text-emerald-400">
                                                    BDT{" "}
                                                    {formatMoney(
                                                        Number(
                                                            deposit.amount
                                                        )
                                                    )}
                                                </span>
                                            </td>

                                            {/* DATE */}

                                            <td className="px-5 py-4 text-sm text-slate-300">
                                                {formatDate(
                                                    deposit.date
                                                )}
                                            </td>

                                            {/* NOTE */}

                                            <td className="max-w-[250px] px-5 py-4 text-sm text-slate-400">
                                                {deposit.note || "-"}
                                            </td>

                                            {/* STATUS */}

                                            <td className="px-5 py-4">
                                                <StatusBadge
                                                    status={
                                                        deposit.status
                                                    }
                                                />
                                            </td>

                                        </tr>
                                    ))}

                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* ================================================= */}
                {/* FOOTER INFO */}
                {/* ================================================= */}

                <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck size={15} />
                    Deposit data শুধুমাত্র Admin authorization-এর মাধ্যমে
                    পরিচালিত হয়।
                </div>
            </div>
        </div>
    );
}