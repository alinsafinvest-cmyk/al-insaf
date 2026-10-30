"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
    UserRound,
    ArrowLeftRight,
    Wallet,
    HandCoins,
    Settings,
    Bell,
    RefreshCw,
    Save,
} from "lucide-react";

type PortalData = {
    profile: Record<string, any>;
    transactions: any[];
    savings: { total: number; records: any[] };
    loans: {
        totalLoan: number;
        totalRepaid: number;
        outstanding: number;
        records: any[];
        repayments: any[];
    };
    notices: any[];
};

const tabs = [
    { id: "profile", label: "Profile", bn: "প্রোফাইল", icon: UserRound },
    { id: "transactions", label: "Transactions", bn: "লেনদেন", icon: ArrowLeftRight },
    { id: "savings", label: "Savings", bn: "সঞ্চয়", icon: Wallet },
    { id: "loans", label: "Loans", bn: "ঋণ", icon: HandCoins },
    { id: "settings", label: "Settings", bn: "সেটিংস", icon: Settings },
    { id: "notices", label: "Notices", bn: "নোটিশ", icon: Bell },
];

function money(value: unknown) {
    const amount = Number(value || 0);
    return `৳ ${amount.toLocaleString("en-BD", {
        maximumFractionDigits: 2,
    })}`;
}

function date(value: unknown) {
    if (!value) return "—";
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime())
        ? String(value)
        : parsed.toLocaleDateString("en-GB");
}

function Panel({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
            <h2 className="mb-5 text-lg font-bold text-slate-900 dark:text-white">
                {title}
            </h2>
            {children}
        </section>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: unknown;
}) {
    return (
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">
                {value ? String(value) : "—"}
            </p>
        </div>
    );
}

function RecordsTable({
    records,
}: {
    records: any[];
}) {
    if (!records?.length) {
        return (
            <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                কোনো record পাওয়া যায়নি।
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type / Details</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {records.map((record, index) => (
                        <tr
                            key={`${record.id || record.transactionId || "record"}-${index}`}
                            className="border-t border-slate-100 dark:border-slate-800"
                        >
                            <td className="whitespace-nowrap p-3 text-slate-600 dark:text-slate-300">
                                {date(record.date || record.paymentDate)}
                            </td>
                            <td className="p-3">
                                <p className="font-medium text-slate-900 dark:text-white">
                                    {String(record.type || record.description || "Transaction")
                                        .replaceAll("_", " ")}
                                </p>
                                {record.description && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        {record.description}
                                    </p>
                                )}
                            </td>
                            <td className="whitespace-nowrap p-3 font-semibold text-slate-900 dark:text-white">
                                {money(record.amount)}
                            </td>
                            <td className="p-3">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {record.status || "Unknown"}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function MemberDashboardFeatures() {
    const [active, setActive] = useState("profile");
    const [data, setData] = useState<PortalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    async function loadPortal() {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/member/portal", {
                method: "GET",
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "ডেটা লোড করা যায়নি");
            }

            setData(result);
            setName(result.profile?.name || "");
            setPhone(result.profile?.phone || "");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "ডেটা লোড করা যায়নি"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadPortal();
    }, []);

    async function saveSettings(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/member/portal", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, phone }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Settings আপডেট হয়নি");
            }

            setData((previous) => {
                if (!previous) return previous;

                return {
                    ...previous,
                    profile: {
                        ...previous.profile,
                        name: result.account.name,
                        phone: result.account.phone,
                        email: result.account.email,
                    },
                };
            });

            setMessage(result.message || "Settings আপডেট হয়েছে");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Settings আপডেট হয়নি"
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Member Services
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Profile, financial records and account settings
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void loadPortal()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

            <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const selected = active === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                                setActive(tab.id);
                                setError("");
                                setMessage("");
                            }}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${selected
                                    ? "bg-emerald-600 text-white"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                                }`}
                        >
                            <Icon size={17} />
                            <span>{tab.label}</span>
                            <span className="text-xs opacity-80">({tab.bn})</span>
                        </button>
                    );
                })}
            </nav>

            {error && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                >
                    {error}
                </div>
            )}

            {message && (
                <div
                    role="status"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                    {message}
                </div>
            )}

            {loading && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((item) => (
                        <div
                            key={item}
                            className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
                        />
                    ))}
                </div>
            )}

            {!loading && data && active === "profile" && (
                <Panel title="Member Profile / সদস্যের তথ্য">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Info label="Name / নাম" value={data.profile.name} />
                        <Info label="Member ID" value={data.profile.memberId} />
                        <Info label="Email / ইমেইল" value={data.profile.email} />
                        <Info label="Phone / ফোন" value={data.profile.phone} />
                        <Info label="WhatsApp" value={data.profile.whatsapp} />
                        <Info label="Address / ঠিকানা" value={data.profile.address} />
                        <Info label="Join Date" value={data.profile.joinDate} />
                        <Info label="Member Status" value={data.profile.status} />
                        <Info label="Shares" value={data.profile.shares} />
                        <Info label="Monthly Deposit" value={money(data.profile.monthlyDeposit)} />
                        <Info label="Nominee" value={data.profile.nomineeName} />
                        <Info label="Nominee Phone" value={data.profile.nomineeMobile} />
                    </div>

                    {!data.profile.sheetLinked && (
                        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                            Google Sheets-এর Members record-এর সঙ্গে এই account-এর মিল পাওয়া যায়নি। Member ID/email mapping যাচাই করুন।
                        </p>
                    )}
                </Panel>
            )}

            {!loading && data && active === "transactions" && (
                <Panel title="Transaction History / লেনদেনের তালিকা">
                    <RecordsTable records={data.transactions} />
                </Panel>
            )}

            {!loading && data && active === "savings" && (
                <Panel title="Savings / সঞ্চয়">
                    <div className="mb-5 rounded-xl bg-emerald-50 p-5 dark:bg-emerald-950/30">
                        <p className="text-sm text-emerald-800 dark:text-emerald-300">
                            Approved Savings / অনুমোদিত জমা
                        </p>
                        <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                            {money(data.savings.total)}
                        </p>
                    </div>
                    <RecordsTable records={data.savings.records} />
                </Panel>
            )}

            {!loading && data && active === "loans" && (
                <Panel title="Loans & Repayments / ঋণ ও পরিশোধ">
                    <div className="mb-5 grid gap-3 sm:grid-cols-3">
                        <Info label="Approved Loans" value={money(data.loans.totalLoan)} />
                        <Info label="Approved Repayments" value={money(data.loans.totalRepaid)} />
                        <Info label="Estimated Outstanding" value={money(data.loans.outstanding)} />
                    </div>

                    <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">
                        Loan Records
                    </h3>
                    <RecordsTable records={data.loans.records} />

                    <h3 className="mb-3 mt-6 font-semibold text-slate-900 dark:text-white">
                        Repayment Records
                    </h3>
                    <RecordsTable records={data.loans.repayments} />
                </Panel>
            )}

            {!loading && data && active === "settings" && (
                <Panel title="Account Settings / অ্যাকাউন্ট সেটিংস">
                    <form onSubmit={saveSettings} className="max-w-xl space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Name / নাম
                            </label>
                            <input
                                required
                                minLength={2}
                                maxLength={100}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Phone / ফোন
                            </label>
                            <input
                                maxLength={25}
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                            এখানে পরিবর্তন করলে MongoDB account update হবে। Google Sheets-এর মূল সদস্য-তথ্য এই form থেকে পরিবর্তন করা হবে না।
                        </p>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                            <Save size={17} />
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </form>
                </Panel>
            )}

            {!loading && data && active === "notices" && (
                <Panel title="Notices & Announcements / নোটিশ">
                    {!data.notices.length ? (
                        <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            বর্তমানে কোনো প্রকাশিত নোটিশ পাওয়া যায়নি।
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {data.notices.map((notice, index) => (
                                <article
                                    key={`${notice.id || "notice"}-${index}`}
                                    className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <h3 className="font-bold text-slate-900 dark:text-white">
                                            {notice.title}
                                        </h3>
                                        <span className="text-xs text-slate-500">
                                            {date(notice.publishDate)}
                                        </span>
                                    </div>
                                    {notice.description && (
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            {notice.description}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </Panel>
            )}
        </div>
    );
}