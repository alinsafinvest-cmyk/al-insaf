"use client";

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import {
    UserRound,
    RefreshCw,
    Save,
    KeyRound,
    MailCheck,
    Upload,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

type PortalRecord = {
    id?: unknown;
    transactionId?: unknown;
    date?: unknown;
    paymentDate?: unknown;
    type?: unknown;
    description?: unknown;
    amount?: unknown;
    status?: unknown;
    title?: unknown;
    publishDate?: unknown;
};

type PortalData = {
    profile: Record<string, unknown>;
    transactions: PortalRecord[];
    savings: { total: number; records: PortalRecord[] };
    loans: {
        totalLoan: number;
        totalRepaid: number;
        outstanding: number;
        records: PortalRecord[];
        repayments: PortalRecord[];
    };
    notices: PortalRecord[];
};

type MemberDashboardSection = "profile" | "savings" | "settings" | "notices";
type NotificationPreferences = {
    emailUpdates: boolean;
    transactionUpdates: boolean;
    announcements: boolean;
};

const defaultNotificationPreferences: NotificationPreferences = {
    emailUpdates: true,
    transactionUpdates: true,
    announcements: true,
};

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

function MemberProfilePhoto({
    src,
    name,
}: {
    src: string;
    name: string;
}) {
    const [failed, setFailed] = useState(false);

    return (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xl font-bold text-emerald-800 ring-2 ring-emerald-100 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900">
            {src && !failed ? (
                <Image
                    src={src}
                    alt={name ? `${name} profile photo` : "Member profile photo"}
                    width={64}
                    height={64}
                    unoptimized
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                name.trim().charAt(0).toUpperCase() || <UserRound size={25} aria-hidden="true" />
            )}
        </div>
    );
}

function RecordsTable({
    records,
}: {
    records: PortalRecord[];
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
                                {Boolean(record.description) && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        {String(record.description)}
                                    </p>
                                )}
                            </td>
                            <td className="whitespace-nowrap p-3 font-semibold text-slate-900 dark:text-white">
                                {money(record.amount)}
                            </td>
                            <td className="p-3">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                    {String(record.status || "Unknown")}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function MemberDashboardFeatures({
    section,
}: {
    section: MemberDashboardSection;
}) {
    const { language, setLanguage } = useLanguage();
    const [data, setData] = useState<PortalData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [address, setAddress] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");
    const [email, setEmail] = useState("");
    const [emailCode, setEmailCode] = useState("");
    const [emailCodeRequested, setEmailCodeRequested] = useState(false);
    const [requestingEmailCode, setRequestingEmailCode] = useState(false);
    const [verifyingEmail, setVerifyingEmail] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [notificationPreferences, setNotificationPreferences] =
        useState<NotificationPreferences>(defaultNotificationPreferences);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordCode, setPasswordCode] = useState("");
    const [codeRequested, setCodeRequested] = useState(false);
    const [requestingCode, setRequestingCode] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const loadPortal = useCallback(async () => {
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
            setWhatsapp(result.profile?.whatsapp || "");
            setAddress(result.profile?.address || "");
            setPhotoUrl(result.profile?.photoUrl || "");
            setEmail(result.profile?.email || "");
            setLanguage(result.profile?.preferredLanguage === "en" ? "en" : "bn");
            setNotificationPreferences({
                ...defaultNotificationPreferences,
                ...result.profile?.notificationPreferences,
            });
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "ডেটা লোড করা যায়নি"
            );
        } finally {
            setLoading(false);
        }
    }, [setLanguage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadPortal();
        }, 0);

        return () => clearTimeout(timer);
    }, [loadPortal]);

    async function saveSettings(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/member/portal", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    phone,
                    whatsapp,
                    address,
                    photoUrl,
                    preferredLanguage: language,
                    notificationPreferences,
                }),
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
                        whatsapp: result.account.whatsapp,
                        address: result.account.address,
                        email: result.account.email,
                        photoUrl: result.account.photoUrl,
                        preferredLanguage: result.account.preferredLanguage,
                        notificationPreferences: result.account.notificationPreferences,
                    },
                };
            });
            setPhotoUrl(result.account.photoUrl || "");
            setWhatsapp(result.account.whatsapp || "");
            setAddress(result.account.address || "");

            setMessage(result.message || "Settings আপডেট হয়েছে");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Settings আপডেট হয়নি"
            );
        } finally {
            setSaving(false);
        }
    }

    async function requestEmailCode() {
        setRequestingEmailCode(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/member/email/code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "ইমেইল কোড পাঠানো যায়নি");
            }

            setEmailCodeRequested(true);
            setMessage(result.message || "নতুন ইমেইলে কোড পাঠানো হয়েছে");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "ইমেইল কোড পাঠানো যায়নি"
            );
        } finally {
            setRequestingEmailCode(false);
        }
    }

    async function verifyEmailChange(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setVerifyingEmail(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/member/email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: emailCode }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "ইমেইল পরিবর্তন করা যায়নি");
            }

            setEmail(result.email);
            setEmailCode("");
            setEmailCodeRequested(false);
            setData((previous) => previous
                ? { ...previous, profile: { ...previous.profile, email: result.email } }
                : previous);
            setMessage(result.message || "ইমেইল পরিবর্তন হয়েছে");
        } catch (err) {
            setError(err instanceof Error ? err.message : "ইমেইল পরিবর্তন করা যায়নি");
        } finally {
            setVerifyingEmail(false);
        }
    }

    async function uploadProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setUploadingPhoto(true);
        setMessage("");
        setError("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            const response = await fetch("/api/member/photo", {
                method: "POST",
                body: formData,
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "ছবি আপলোড করা যায়নি");
            }

            setPhotoUrl(result.photoUrl);
            setData((previous) => previous
                ? { ...previous, profile: { ...previous.profile, photoUrl: result.photoUrl } }
                : previous);
            setMessage(result.message || "প্রোফাইল ছবি আপলোড হয়েছে");
        } catch (err) {
            setError(err instanceof Error ? err.message : "ছবি আপলোড করা যায়নি");
        } finally {
            setUploadingPhoto(false);
        }
    }

    async function requestPasswordCode() {
        setRequestingCode(true);
        setMessage("");
        setError("");

        try {
            const response = await fetch("/api/member/password/code", {
                method: "POST",
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "কোড পাঠানো যায়নি");
            }

            setCodeRequested(true);
            setMessage(result.message || "ইমেইলে যাচাইকরণ কোড পাঠানো হয়েছে");
        } catch (err) {
            setError(err instanceof Error ? err.message : "কোড পাঠানো যায়নি");
        } finally {
            setRequestingCode(false);
        }
    }

    async function changePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setError("");

        if (newPassword !== confirmPassword) {
            setError("নতুন পাসওয়ার্ড ও নিশ্চিতকরণ এক নয়");
            return;
        }

        setChangingPassword(true);
        try {
            const response = await fetch("/api/member/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword,
                    code: passwordCode,
                    newPassword,
                }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "পাসওয়ার্ড পরিবর্তন হয়নি");
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordCode("");
            setCodeRequested(false);
            setMessage(result.message || "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "পাসওয়ার্ড পরিবর্তন হয়নি"
            );
        } finally {
            setChangingPassword(false);
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => {
                        setLoading(true);
                        setError("");
                        void loadPortal();
                    }}
                    disabled={loading}
                    aria-label="Refresh member data"
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Refresh
                </button>
            </div>

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

            {!loading && data && section === "profile" && (
                <Panel title="Profile Details / সদস্যের তথ্য">
                    <div className="mb-5 flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                        <MemberProfilePhoto
                            src={typeof data.profile.photoUrl === "string" ? data.profile.photoUrl : ""}
                            name={String(data.profile.name || "")}
                        />
                        <div className="min-w-0">
                            <p className="truncate text-lg font-bold text-slate-900 dark:text-white">
                                {String(data.profile.name || "—")}
                            </p>
                            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                                {String(data.profile.memberId || "")}
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Info label="Name / নাম" value={data.profile.name} />
                        <Info label="Member ID" value={data.profile.memberId} />
                        <Info label="Email / ইমেইল" value={data.profile.email} />
                        <Info label="Phone / ফোন" value={data.profile.phone} />
                        <Info label="WhatsApp" value={data.profile.whatsapp} />
                        <Info label="Other Mobile / অন্য মোবাইল" value={data.profile.otherMobile} />
                        <Info label="Address / ঠিকানা" value={data.profile.address} />
                        <Info label="Join Date" value={data.profile.joinDate} />
                        <Info label="Member Status" value={data.profile.status} />
                        <Info label="Shares" value={data.profile.shares} />
                        <Info label="Monthly Deposit" value={money(data.profile.monthlyDeposit)} />
                        <Info label="Nominee" value={data.profile.nomineeName} />
                        <Info label="Nominee Phone" value={data.profile.nomineeMobile} />
                        <Info label="Nominee Relation" value={data.profile.nomineeRelation} />
                    </div>

                    {!data.profile.sheetLinked && (
                        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                            Google Sheets-এর Members record-এর সঙ্গে এই account-এর মিল পাওয়া যায়নি। Member ID/email mapping যাচাই করুন।
                        </p>
                    )}
                </Panel>
            )}

            {!loading && data && section === "savings" && (
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

            {!loading && data && section === "settings" && (
                <>
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

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                WhatsApp / হোয়াটসঅ্যাপ
                            </label>
                            <input
                                maxLength={25}
                                value={whatsapp}
                                onChange={(event) => setWhatsapp(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Address / ঠিকানা
                            </label>
                            <textarea
                                maxLength={500}
                                rows={3}
                                value={address}
                                onChange={(event) => setAddress(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Profile photo link / প্রোফাইল ছবির লিংক
                            </label>
                            <input
                                type="url"
                                value={photoUrl}
                                onChange={(event) => setPhotoUrl(event.target.value)}
                                maxLength={2048}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                            <label className="mt-3 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                                <Upload size={16} />
                                {uploadingPhoto ? "Uploading..." : "Upload profile photo"}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    disabled={uploadingPhoto}
                                    onChange={(event) => void uploadProfilePhoto(event)}
                                    className="sr-only"
                                />
                            </label>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Language / ভাষা
                            </label>
                            <select
                                value={language}
                                onChange={(event) => setLanguage(event.target.value === "en" ? "en" : "bn")}
                                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                                <option value="bn">বাংলা</option>
                                <option value="en">English</option>
                            </select>
                        </div>

                        <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                            <legend className="px-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                Notification preferences / নোটিফিকেশন পছন্দ
                            </legend>
                            {([
                                ["emailUpdates", "Email updates / ইমেইল আপডেট"],
                                ["transactionUpdates", "Transaction updates / লেনদেন আপডেট"],
                                ["announcements", "Announcements / ঘোষণা"],
                            ] as const).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={notificationPreferences[key]}
                                        onChange={(event) => setNotificationPreferences((previous) => ({
                                            ...previous,
                                            [key]: event.target.checked,
                                        }))}
                                        className="h-4 w-4 accent-emerald-600"
                                    />
                                    {label}
                                </label>
                            ))}
                        </fieldset>

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

                    <Panel title="Change Email / ইমেইল পরিবর্তন">
                        <form onSubmit={verifyEmailChange} className="max-w-xl space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    New email / নতুন ইমেইল
                                </label>
                                <input
                                    type="email"
                                    autoComplete="email"
                                    required
                                    maxLength={254}
                                    value={email}
                                    onChange={(event) => {
                                        setEmail(event.target.value);
                                        setEmailCode("");
                                        setEmailCodeRequested(false);
                                    }}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => void requestEmailCode()}
                                disabled={requestingEmailCode}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-600 px-4 py-2.5 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                            >
                                <MailCheck size={17} />
                                {requestingEmailCode
                                    ? "Sending..."
                                    : emailCodeRequested
                                      ? "Resend verification code"
                                      : "Send code to new email"}
                            </button>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Verification code / যাচাইকরণ কোড
                                </label>
                                <input
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    required
                                    value={emailCode}
                                    onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={verifyingEmail || !emailCodeRequested}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {verifyingEmail ? "Verifying..." : "Verify and change email"}
                            </button>
                        </form>
                    </Panel>

                    <Panel title="Change Password / পাসওয়ার্ড পরিবর্তন">
                        <form onSubmit={changePassword} className="max-w-xl space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Current password / বর্তমান পাসওয়ার্ড
                                </label>
                                <input
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={currentPassword}
                                    onChange={(event) => setCurrentPassword(event.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => void requestPasswordCode()}
                                disabled={requestingCode}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-600 px-4 py-2.5 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                            >
                                <MailCheck size={17} />
                                {requestingCode
                                    ? "Sending..."
                                    : codeRequested
                                      ? "Resend verification code"
                                      : "Send code to registered email"}
                            </button>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Email verification code / ইমেইলের কোড
                                </label>
                                <input
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    required
                                    value={passwordCode}
                                    onChange={(event) => setPasswordCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    New password / নতুন পাসওয়ার্ড
                                </label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={128}
                                    required
                                    value={newPassword}
                                    onChange={(event) => setNewPassword(event.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Confirm new password / নতুন পাসওয়ার্ড নিশ্চিত করুন
                                </label>
                                <input
                                    type="password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={128}
                                    required
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                />
                            </div>

                            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                                কোড ১০ মিনিটের জন্য বৈধ থাকবে; বর্তমান পাসওয়ার্ডও দিতে হবে।
                            </p>

                            <button
                                type="submit"
                                disabled={changingPassword}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                            >
                                <KeyRound size={17} />
                                {changingPassword ? "Updating..." : "Change Password"}
                            </button>
                        </form>
                    </Panel>
                </>
            )}

            {!loading && data && section === "notices" && (
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
                                            {String(notice.title || "")}
                                        </h3>
                                        <span className="text-xs text-slate-500">
                                            {date(notice.publishDate)}
                                        </span>
                                    </div>
                                    {Boolean(notice.description) && (
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            {String(notice.description)}
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