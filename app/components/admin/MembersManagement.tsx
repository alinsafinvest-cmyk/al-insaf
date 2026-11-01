"use client";
// বাংলা: এই shared UI component-এ MembersManagement অংশের display ও interaction পরিচালিত হয়।

import Image from "next/image";
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Search,
    Plus,
    Eye,
    Pencil,
    X,
    Check,
    Trash2,
    Archive,
    RefreshCw,
    Upload,
    Users,
    UserPlus,
    AlertTriangle,
    FileText,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

type Tab =
    | "members"
    | "requests"
    | "failed"
    | "archive";

type Member = {
    memberId: string;
    name: string;
    whatsapp: string;
    mobile: string;
    email: string;
    address: string;
    nid: string;
    joinDate: string;
    status: string;
    shares: number;
    monthlyDeposit: number;
    nomineeName: string;
    nomineeMobile: string;
    nomineeRelation: string;
    nomineeNid: string;
    note: string;
    loginStatus: string;

    photoFileId: string;
    nidFrontFileId: string;
    nidBackFileId: string;
    nomineePhotoFileId: string;
    nomineeNidFileId: string;

    photoUrl?: string;
    preferredLanguage?: "bn" | "en";
    notificationPreferences?: {
        emailUpdates?: boolean;
        transactionUpdates?: boolean;
        announcements?: boolean;
    };
};

type AccountPreferences = {
    preferredLanguage: "bn" | "en";
    emailUpdates: boolean;
    transactionUpdates: boolean;
    announcements: boolean;
};

type MemberRequest = {
    requestId: string;
    status: string;
    data: Record<string, unknown>;
    createdAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
};

type MemberArchive = {
    archiveId: string;
    member: Member;
    archivedAt: string;
    expiresAt: string;
    daysRemaining: number;
    relatedRecords: {
        transactions: number;
        deposits: number;
        payments: number;
        cashBooks: number;
        memberRequests: number;
    };
};

const emptyForm = {
    name: "",
    whatsapp: "",
    mobile: "",
    email: "",
    address: "",
    nid: "",
    joinDate: "",
    status: "Active",
    shares: 0,
    monthlyDeposit: 0,
    nomineeName: "",
    nomineeMobile: "",
    nomineeRelation: "",
    nomineeNid: "",
    note: "",
    loginStatus: "Active",
    password: "",

    photoFileId: "",
    nidFrontFileId: "",
    nidBackFileId: "",
    nomineePhotoFileId: "",
    nomineeNidFileId: "",
    photoUrl: "",
};

type MemberForm = typeof emptyForm;

const defaultAccountPreferences: AccountPreferences = {
    preferredLanguage: "bn",
    emailUpdates: true,
    transactionUpdates: true,
    announcements: true,
};

type MemberFileField =
    | "photoFileId"
    | "nidFrontFileId"
    | "nidBackFileId"
    | "nomineePhotoFileId"
    | "nomineeNidFileId";

function MemberFileUploadField({
    label,
    field,
    value,
    disabled,
    onUpload,
}: {
    label: string;
    field: MemberFileField;
    value: string;
    disabled: boolean;
    onUpload: (file: File, field: MemberFileField) => void;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                    {label}
                </span>
                {value && (
                    <span className="text-xs font-semibold text-emerald-600">
                        Uploaded ✓
                    </span>
                )}
            </div>
            <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                    <Upload size={16} />
                    Upload
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={disabled}
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) onUpload(file, field);
                        }}
                    />
                </label>
                {value && (
                    <span className="max-w-[180px] truncate text-xs text-gray-500">
                        {value}
                    </span>
                )}
            </div>
        </div>
    );
}

function MemberInput({
    label,
    field,
    type = "text",
    form,
    setForm,
    disabled,
}: {
    label: string;
    field: keyof MemberForm;
    type?: string;
    form: MemberForm;
    setForm: React.Dispatch<React.SetStateAction<MemberForm>>;
    disabled: boolean;
}) {
    return (
        <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
                {label}
            </label>
            <input
                type={type}
                value={form[field]}
                disabled={disabled}
                onChange={(event) =>
                    setForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                    }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
            />
        </div>
    );
}

function MemberSelect({
    label,
    field,
    form,
    setForm,
    disabled,
    options,
}: {
    label: string;
    field: keyof MemberForm;
    form: MemberForm;
    setForm: React.Dispatch<React.SetStateAction<MemberForm>>;
    disabled: boolean;
    options: string[];
}) {
    return (
        <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
                {label}
            </label>
            <select
                value={String(form[field])}
                disabled={disabled}
                onChange={(event) =>
                    setForm((current) => ({
                        ...current,
                        [field]: event.target.value,
                    }))
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </div>
    );
}

// বাংলা: এই component admin member তালিকা, profile editing এবং member status action পরিচালনা করে।
export default function MembersManagement() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);

    const [
        activeTab,
        setActiveTab,
    ] = useState<Tab>("members");

    const [
        members,
        setMembers,
    ] = useState<Member[]>([]);

    const [
        requests,
        setRequests,
    ] = useState<MemberRequest[]>([]);

    const [
        failedRequests,
        setFailedRequests,
    ] = useState<MemberRequest[]>([]);

    const [
        archivedMembers,
        setArchivedMembers,
    ] = useState<MemberArchive[]>([]);

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        success,
        setSuccess,
    ] = useState("");

    const [
        showModal,
        setShowModal,
    ] = useState(false);

    const [
        modalMode,
        setModalMode,
    ] = useState<
        "view" | "edit" | "add"
    >("view");

    const [
        selectedMember,
        setSelectedMember,
    ] = useState<Member | null>(
        null
    );

    const [
        form,
        setForm,
    ] = useState<MemberForm>(
        emptyForm
    );

    const [
        accountPreferences,
        setAccountPreferences,
    ] = useState<AccountPreferences>({
        ...defaultAccountPreferences,
    });

    const [
        selectedRequest,
        setSelectedRequest,
    ] = useState<MemberRequest | null>(
        null
    );

    const [
        requestModal,
        setRequestModal,
    ] = useState(false);

    /* =========================
       LOAD
    ========================= */

    async function loadAll() {
        try {
            const [
                membersResponse,
                pendingResponse,
                failedResponse,
                archiveResponse,
            ] = await Promise.all([
                fetch(
                    "/api/admin/members",
                    {
                        cache: "no-store",
                    }
                ),

                fetch(
                    "/api/admin/member-requests?status=pending",
                    {
                        cache: "no-store",
                    }
                ),

                fetch(
                    "/api/admin/member-requests?status=rejected",
                    {
                        cache: "no-store",
                    }
                ),

                fetch(
                    "/api/admin/member-archive",
                    {
                        cache: "no-store",
                    }
                ),
            ]);

            const membersData =
                await membersResponse.json();

            const pendingData =
                await pendingResponse.json();

            const failedData =
                await failedResponse.json();

            const archiveData =
                await archiveResponse.json();

            if (!membersResponse.ok) {
                throw new Error(
                    membersData.message ||
                    "Members load হয়নি"
                );
            }

            if (!pendingResponse.ok) {
                throw new Error(
                    pendingData.message ||
                    "Requests load হয়নি"
                );
            }

            if (!failedResponse.ok) {
                throw new Error(
                    failedData.message ||
                    "Failed requests load হয়নি"
                );
            }

            if (!archiveResponse.ok) {
                throw new Error(
                    archiveData.message ||
                    "Archive load হয়নি"
                );
            }

            setMembers(
                membersData.members || []
            );

            setRequests(
                pendingData.requests || []
            );

            setFailedRequests(
                failedData.requests || []
            );

            setArchivedMembers(
                archiveData.archives || []
            );

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Data load করা যায়নি"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadAll();
        }, 0);

        return () => clearTimeout(timer);
    }, []);

    /* =========================
       SEARCH
    ========================= */

    const filteredMembers =
        useMemo(() => {

            const value =
                search
                    .trim()
                    .toLowerCase();

            if (!value) {
                return members;
            }

            return members.filter(
                (member) =>
                    String(
                        member.name
                    )
                        .toLowerCase()
                        .includes(value) ||

                    String(
                        member.memberId
                    )
                        .toLowerCase()
                        .includes(value) ||

                    String(
                        member.whatsapp
                    )
                        .toLowerCase()
                        .includes(value) ||

                    String(
                        member.email
                    )
                        .toLowerCase()
                        .includes(value)
            );
        }, [
            members,
            search,
        ]);

    /* =========================
       FORM
    ========================= */

    function openAdd() {
        setModalMode("add");

        setSelectedMember(null);

        setAccountPreferences({
            ...defaultAccountPreferences,
        });

        setForm({
            ...emptyForm,
        });

        setShowModal(true);
    }

    function openView(
        member: Member
    ) {
        setModalMode("view");

        setSelectedMember(
            member
        );

        setAccountPreferences({
            preferredLanguage:
                member.preferredLanguage === "en" ? "en" : "bn",
            emailUpdates:
                member.notificationPreferences?.emailUpdates ?? true,
            transactionUpdates:
                member.notificationPreferences?.transactionUpdates ?? true,
            announcements:
                member.notificationPreferences?.announcements ?? true,
        });

        setForm({
            ...emptyForm,
            ...member,
        });

        setShowModal(true);
    }

    function openEdit(
        member: Member
    ) {
        setModalMode("edit");

        setSelectedMember(
            member
        );

        setAccountPreferences({
            preferredLanguage:
                member.preferredLanguage === "en" ? "en" : "bn",
            emailUpdates:
                member.notificationPreferences?.emailUpdates ?? true,
            transactionUpdates:
                member.notificationPreferences?.transactionUpdates ?? true,
            announcements:
                member.notificationPreferences?.announcements ?? true,
        });

        setForm({
            ...emptyForm,
            ...member,
            password: "",
        });

        setShowModal(true);
    }

    function updateField(
        key: keyof MemberForm,
        value: MemberForm[keyof MemberForm]
    ) {
        setForm(
            (old) => ({
                ...old,
                [key]: value,
            })
        );
    }

    /* =========================
       UPLOAD
    ========================= */

    async function uploadFile(
        file: File,
        field: MemberFileField
    ) {
        if (!file) return;

        if (
            file.size >
            10 * 1024 * 1024
        ) {
            setError(
                "File সর্বোচ্চ 10MB হতে পারবে"
            );
            return;
        }

        try {
            setSaving(true);
            setError("");

            /*
             * New member-এর MemberID
             * এখনো নেই।
             *
             * Add করার সময় temporary
             * timestamp ID ব্যবহার করছি।
             */
            const memberId =
                selectedMember?.memberId ||
                `NEW-${Date.now()}`;

            const formData =
                new FormData();

            formData.append(
                "file",
                file
            );

            formData.append(
                "memberId",
                memberId
            );

            formData.append(
                "fileType",
                field
            );

            const response =
                await fetch(
                    "/api/admin/members/upload",
                    {
                        method: "POST",
                        body: formData,
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Upload failed"
                );
            }

            updateField(
                field,
                result.fileId
            );

            if (
                field === "photoFileId" &&
                typeof result.photoUrl === "string"
            ) {
                updateField(
                    "photoUrl",
                    result.photoUrl
                );
            }

            setSuccess(
                `${field} upload হয়েছে`
            );

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "File upload করা যায়নি"
            );
        } finally {
            setSaving(false);
        }
    }

    /* =========================
       SAVE MEMBER
    ========================= */

    async function saveMember() {
        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const method =
                modalMode === "add"
                    ? "POST"
                    : "PUT";

            const body = {
                ...form,
                preferredLanguage:
                    accountPreferences.preferredLanguage,
                notificationPreferences: {
                    emailUpdates:
                        accountPreferences.emailUpdates,
                    transactionUpdates:
                        accountPreferences.transactionUpdates,
                    announcements:
                        accountPreferences.announcements,
                },

                memberId:
                    selectedMember?.memberId,
            };

            const response =
                await fetch(
                    "/api/admin/members",
                    {
                        method,

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                body
                            ),
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Save failed"
                );
            }

            setSuccess(
                result.message
            );

            setShowModal(false);

            await loadAll();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Member save করা যায়নি"
            );
        } finally {
            setSaving(false);
        }
    }

    async function archiveMember(member: Member) {
        if (
            !window.confirm(
                `${member.name} (${member.memberId})-কে সব তথ্যসহ ৩০ দিনের জন্য archive করবেন? এই সময়ের মধ্যে restore করা যাবে।`
            )
        ) {
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const response = await fetch(
                "/api/admin/members",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        memberId: member.memberId,
                        confirmMemberId: member.memberId,
                    }),
                }
            );
            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "সদস্য archive করা যায়নি"
                );
            }

            setSuccess(result.message);
            setShowModal(false);
            setSelectedMember(null);
            await loadAll();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "সদস্য archive করা যায়নি"
            );
        } finally {
            setSaving(false);
        }
    }

    /* =========================
       REQUEST ACTION
    ========================= */

    async function requestAction(
        requestId: string,
        action:
            | "approve"
            | "reject"
    ) {
        try {

            const confirmText =
                action === "approve"
                    ? "এই member request approve করবেন?"
                    : "এই আবেদনটি প্রত্যাখ্যান করে Failed Requests-এ পাঠাবেন?";

            if (
                !window.confirm(
                    confirmText
                )
            ) {
                return;
            }

            setSaving(true);

            const response =
                await fetch(
                    "/api/admin/member-requests",
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                requestId,
                                action,
                            }),
                    }
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Action failed"
                );
            }

            setSuccess(
                result.message
            );
            setError("");

            setRequestModal(false);

            setSelectedRequest(null);

            await loadAll();

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Request update করা যায়নি"
            );
        } finally {
            setSaving(false);
        }
    }

    async function restoreMember(archive: MemberArchive) {
        if (
            !window.confirm(
                `${archive.member.name} (${archive.member.memberId}) এবং তার সব সংরক্ষিত রেকর্ড restore করবেন?`
            )
        ) {
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const response = await fetch(
                "/api/admin/member-archive",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        archiveId: archive.archiveId,
                    }),
                }
            );
            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "সদস্য restore করা যায়নি"
                );
            }

            setSuccess(result.message);
            await loadAll();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "সদস্য restore করা যায়নি"
            );
        } finally {
            setSaving(false);
        }
    }

    /* =========================
       REQUEST VIEW
    ========================= */

    function openRequest(
        request: MemberRequest
    ) {
        setSelectedRequest(
            request
        );

        setRequestModal(true);
    }

    return (
        <main className="min-h-screen bg-gray-100 p-4 md:p-6">

            <div className="mx-auto max-w-7xl">

                {/* HEADER */}

                <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                        <div>

                            <div className="flex items-center gap-3">

                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                    <Users size={25} />
                                </div>

                                <div>

                                    <h1 className="text-2xl font-bold text-gray-900">
                                        {t("Members Management")}
                                    </h1>

                                    <p className="text-sm text-gray-500">
                                        {language === "bn" ? "আল-ইনসাফ ইনভেস্টমেন্ট সোসাইটি" : "Al-Insaf Investment Society"}
                                    </p>

                                </div>

                            </div>

                        </div>

                        <div className="flex gap-2">

                            <button
                                onClick={
                                    loadAll
                                }
                                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                <RefreshCw
                                    size={17}
                                />
                                {t("Refresh")}
                            </button>

                            <button
                                onClick={
                                    openAdd
                                }
                                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-emerald-700"
                            >
                                <Plus
                                    size={18}
                                />
                                {t("Add Member")}
                            </button>

                        </div>

                    </div>

                </div>

                {/* ALERTS */}

                {error && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

                        <AlertTriangle
                            size={20}
                        />

                        <div className="flex-1">
                            {error}
                        </div>

                        <button
                            onClick={() =>
                                setError("")
                            }
                        >
                            <X size={18} />
                        </button>

                    </div>
                )}

                {success && (
                    <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">

                        <Check size={20} />

                        <div className="flex-1">
                            {success}
                        </div>

                        <button
                            onClick={() =>
                                setSuccess("")
                            }
                        >
                            <X size={18} />
                        </button>

                    </div>
                )}

                {/* TABS */}

                <div className="mb-5 flex flex-wrap gap-2 rounded-2xl bg-white p-2 shadow-sm">

                    <button
                        onClick={() =>
                            setActiveTab(
                                "members"
                            )
                        }
                        className={`rounded-xl px-4 py-3 font-semibold transition ${
                            activeTab ===
                            "members"
                                ? "bg-emerald-600 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        {t("All Members")}
                        <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                            {members.length}
                        </span>
                    </button>

                    <button
                        onClick={() =>
                            setActiveTab(
                                "requests"
                            )
                        }
                        className={`rounded-xl px-4 py-3 font-semibold transition ${
                            activeTab ===
                            "requests"
                                ? "bg-amber-500 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        {t("Member Requests")}

                        <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                            {requests.length}
                        </span>

                    </button>

                    <button
                        onClick={() =>
                            setActiveTab(
                                "failed"
                            )
                        }
                        className={`rounded-xl px-4 py-3 font-semibold transition ${
                            activeTab ===
                            "failed"
                                ? "bg-red-600 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        {t("Failed Requests")}

                        <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
                            {
                                failedRequests.length
                            }
                        </span>

                    </button>

                    <button
                        onClick={() =>
                            setActiveTab("archive")
                        }
                        className={`flex items-center gap-2 rounded-xl px-4 py-3 font-semibold transition ${
                            activeTab === "archive"
                                ? "bg-slate-700 text-white"
                                : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                        <Archive size={17} />
                        {language === "bn" ? "Archive (৩০ দিন)" : "Archive (30 days)"}
                        <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs">
                            {archivedMembers.length}
                        </span>
                    </button>

                </div>

                {/* MEMBERS */}

                {activeTab ===
                    "members" && (
                    <>

                        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">

                            <div className="relative">

                                <Search
                                    size={20}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                />

                                <input
                                    value={
                                        search
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setSearch(
                                            e.target.value
                                        )
                                    }
                                    placeholder={language === "bn" ? "নাম, MemberID, মোবাইল অথবা email দিয়ে খুঁজুন..." : "Search by name, Member ID, phone, or email..."}
                                    className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 outline-none focus:border-emerald-500"
                                />

                            </div>

                        </div>

                        {loading ? (
                            <div className="rounded-2xl bg-white p-10 text-center">
                                {t("Loading members...")}
                            </div>
                        ) : filteredMembers.length ===
                          0 ? (
                            <div className="rounded-2xl bg-white p-10 text-center text-gray-500">
                                {language === "bn" ? "কোনো member পাওয়া যায়নি" : "No members found"}
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

                                {filteredMembers.map(
                                    (
                                        member
                                    ) => (
                                        <div
                                            key={
                                                member.memberId
                                            }
                                            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                                        >

                                            <div className="flex items-center gap-4">

                                                {member.photoUrl ? (
                                                    <Image
                                                        src={
                                                            member.photoUrl
                                                        }
                                                        alt={
                                                            member.name
                                                        }
                                                        width={64}
                                                        height={64}
                                                        unoptimized
                                                        className="h-16 w-16 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-700">
                                                        {member.name
                                                            ?.charAt(
                                                                0
                                                            )
                                                            ?.toUpperCase() ||
                                                            "M"}
                                                    </div>
                                                )}

                                                <div className="min-w-0 flex-1">

                                                    <h3 className="truncate font-bold text-gray-900">
                                                        {
                                                            member.name
                                                        }
                                                    </h3>

                                                    <p className="text-sm font-semibold text-emerald-600">
                                                        {
                                                            member.memberId
                                                        }
                                                    </p>

                                                    <p className="truncate text-sm text-gray-500">
                                                        {
                                                            member.whatsapp
                                                        }
                                                    </p>

                                                </div>

                                            </div>

                                            <div className="mt-4 flex items-center justify-between">

                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                        member.status ===
                                                        "Active"
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                                >
                                                    {
                                                        t(member.status)
                                                    }
                                                </span>

                                                <div className="flex gap-2">

                                                    <button
                                                        onClick={() =>
                                                            openView(
                                                                member
                                                            )
                                                        }
                                                        className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                                                        title={t("View")}
                                                    >
                                                        <Eye
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            openEdit(
                                                                member
                                                            )
                                                        }
                                                        className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700"
                                                        title={t("Edit")}
                                                    >
                                                        <Pencil
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            archiveMember(member)
                                                        }
                                                        disabled={saving}
                                                        aria-label={`Archive ${member.name}`}
                                                        title={language === "bn" ? "Archive-এ পাঠান" : "Move to archive"}
                                                        className="rounded-lg border border-amber-200 p-2 text-amber-700 hover:bg-amber-50 disabled:cursor-wait disabled:opacity-50"
                                                    >
                                                        <Archive size={17} />
                                                    </button>

                                                </div>

                                            </div>

                                        </div>
                                    )
                                )}

                            </div>
                        )}

                    </>
                )}

                {/* REQUESTS */}

                {activeTab ===
                    "requests" && (
                    <RequestList
                        requests={
                            requests
                        }
                        onView={
                            openRequest
                        }
                        onApprove={(
                            id
                        ) =>
                            requestAction(
                                id,
                                "approve"
                            )
                        }
                        onReject={(
                            id
                        ) =>
                            requestAction(
                                id,
                                "reject"
                            )
                        }
                        actionPending={saving}
                    />
                )}

                {/* FAILED */}

                {activeTab ===
                    "failed" && (
                    <RequestList
                        requests={
                            failedRequests
                        }
                        failed
                        onView={
                            openRequest
                        }
                        onApprove={(
                            id
                        ) =>
                            requestAction(
                                id,
                                "approve"
                            )
                        }
                        actionPending={saving}
                    />
                )}

                {activeTab === "archive" && (
                    archivedMembers.length === 0 ? (
                        <div className="rounded-2xl bg-white p-12 text-center text-gray-500 shadow-sm">
                            {language === "bn"
                                ? "Archive-এ কোনো সদস্য নেই"
                                : "No archived members"}
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {archivedMembers.map((archive) => {
                                const daysLeft = archive.daysRemaining;
                                const member = archive.member;

                                return (
                                    <article
                                        key={archive.archiveId}
                                        className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            {member.photoUrl ? (
                                                <Image
                                                    src={member.photoUrl}
                                                    alt={member.name}
                                                    width={56}
                                                    height={56}
                                                    unoptimized
                                                    className="h-14 w-14 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">
                                                    {member.name?.charAt(0) || "M"}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h3 className="truncate font-bold text-gray-900">
                                                    {member.name}
                                                </h3>
                                                <p className="text-sm font-semibold text-emerald-700">
                                                    {member.memberId}
                                                </p>
                                                <p className="truncate text-sm text-gray-500">
                                                    {member.whatsapp || member.mobile || "—"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-amber-50 p-3 text-sm text-gray-700">
                                            <p>{language === "bn" ? "ইমেইল" : "Email"}: {member.email || "—"}</p>
                                            <p>{language === "bn" ? "NID" : "NID"}: {member.nid || "—"}</p>
                                            <p>{language === "bn" ? "অংশ" : "Shares"}: {member.shares}</p>
                                            <p>{language === "bn" ? "মাসিক জমা" : "Monthly deposit"}: {member.monthlyDeposit}</p>
                                            <p className="col-span-2">{language === "bn" ? "ঠিকানা" : "Address"}: {member.address || "—"}</p>
                                            <p className="col-span-2">{language === "bn" ? "Nominee" : "Nominee"}: {member.nomineeName || "—"} · {member.nomineeMobile || "—"}</p>
                                        </div>

                                        <p className="mt-3 text-sm font-semibold text-amber-800">
                                            {language === "bn"
                                                ? `আর ${daysLeft} দিন archive-এ থাকবে`
                                                : `${daysLeft} days remaining`}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            {language === "bn" ? "সংরক্ষিত রেকর্ড" : "Preserved records"}:{" "}
                                            {archive.relatedRecords.transactions}{" "}
                                            {language === "bn" ? "লেনদেন" : "transactions"} ·{" "}
                                            {archive.relatedRecords.deposits}{" "}
                                            {language === "bn" ? "জমা" : "deposits"} ·{" "}
                                            {archive.relatedRecords.payments +
                                                archive.relatedRecords.cashBooks +
                                                archive.relatedRecords.memberRequests}{" "}
                                            {language === "bn" ? "অন্যান্য হিসাব" : "other entries"}
                                        </p>

                                        <button
                                            type="button"
                                            disabled={saving || daysLeft === 0}
                                            onClick={() => restoreMember(archive)}
                                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <RefreshCw size={17} />
                                            {language === "bn" ? "সদস্য ও সব তথ্য Restore" : "Restore member and all data"}
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    )
                )}

            </div>

            {/* MEMBER MODAL */}

            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">

                    <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">

                            <div>

                                <h2 className="text-xl font-bold text-gray-900">

                                    {modalMode ===
                                    "add"
                                        ? t("Add New Member")
                                        : modalMode ===
                                          "edit"
                                        ? t("Edit Member")
                                        : t("Member Details")}

                                </h2>

                                {selectedMember && (
                                    <p className="text-sm text-emerald-600">
                                        {
                                            selectedMember.memberId
                                        }
                                    </p>
                                )}

                            </div>

                            <button
                                onClick={() =>
                                    setShowModal(
                                        false
                                    )
                                }
                                className="rounded-lg p-2 hover:bg-gray-100"
                            >
                                <X />
                            </button>

                        </div>

                        <div className="space-y-6 p-5">

                            {/* BASIC */}

                            <section>

                                {form.photoUrl && (
                                    <div className="mb-5 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
                                        <Image
                                            src={form.photoUrl}
                                            alt={`${form.name} profile`}
                                            width={80}
                                            height={80}
                                            unoptimized
                                            className="h-20 w-20 rounded-full object-cover"
                                        />
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                {language === "bn" ? "প্রোফাইল ছবি" : "Profile photo"}
                                            </p>
                                            <p className="break-all text-sm text-gray-500">
                                                {form.photoUrl}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                                    <UserPlus
                                        size={
                                            20
                                        }
                                    />
                                    {t("Basic Information")}
                                </h3>

                                <div className="grid gap-4 md:grid-cols-2">

                                    <MemberInput
                                        label="নাম"
                                        field="name"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label={t("WhatsApp")}
                                        field="whatsapp"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label="অন্য মোবাইল"
                                        field="mobile"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label={t("Email")}
                                        field="email"
                                        type="email"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label="NID নম্বর"
                                        field="nid"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label="যোগদানের তারিখ"
                                        field="joinDate"
                                        type="date"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label="অংশ সংখ্যা"
                                        field="shares"
                                        type="number"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label="মাসিক জমা"
                                        field="monthlyDeposit"
                                        type="number"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberSelect
                                        label={t("Status")}
                                        field="status"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                        options={[
                                            "Active",
                                            "Inactive",
                                            "Blocked",
                                            "Disabled",
                                        ]}
                                    />

                                    <MemberSelect
                                        label={t("Login Status")}
                                        field="loginStatus"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                        options={[
                                            "Active",
                                            "Inactive",
                                            "Blocked",
                                            "Disabled",
                                        ]}
                                    />

                                    <div className="md:col-span-2">

                                        <MemberInput
                                            label={
                                                modalMode ===
                                                "add"
                                                    ? "Password (blank রাখলে MemberID হবে)"
                                                    : "নতুন Password (blank রাখলে পরিবর্তন হবে না)"
                                            }
                                            field="password"
                                            type="password"
                                            form={form}
                                            setForm={setForm}
                                            disabled={modalMode === "view"}
                                        />

                                    </div>

                                    <div className="md:col-span-2">

                                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                                            ঠিকানা
                                        </label>

                                        <textarea
                                            value={
                                                form.address ||
                                                ""
                                            }
                                            disabled={
                                                modalMode ===
                                                "view"
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                updateField(
                                                    "address",
                                                    e.target.value
                                                )
                                            }
                                            rows={3}
                                            className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:border-emerald-500 disabled:bg-gray-100"
                                        />

                                    </div>

                                </div>

                            </section>

                            {/* NOMINEE */}

                            <section>

                                <h3 className="mb-4 text-lg font-bold">
                                    Nominee Information
                                </h3>

                                <div className="grid gap-4 md:grid-cols-2">

                                    <MemberInput
                                        label="Nominee নাম"
                                        field="nomineeName"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label="Nominee মোবাইল"
                                        field="nomineeMobile"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label="Nominee সম্পর্ক"
                                        field="nomineeRelation"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                    <MemberInput
                                        label="Nominee NID"
                                        field="nomineeNid"
                                        form={form}
                                        setForm={setForm}
                                        disabled={modalMode === "view"}
                                    />

                                </div>

                            </section>

                            <section>
                                <h3 className="mb-4 text-lg font-bold">
                                    {language === "bn" ? "অ্যাকাউন্ট পছন্দ" : "Account preferences"}
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        {language === "bn" ? "ভাষা" : "Language"}
                                        <select
                                            value={accountPreferences.preferredLanguage}
                                            disabled={modalMode === "view"}
                                            onChange={(event) =>
                                                setAccountPreferences((current) => ({
                                                    ...current,
                                                    preferredLanguage:
                                                        event.target.value === "en" ? "en" : "bn",
                                                }))
                                            }
                                            className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 disabled:bg-gray-100"
                                        >
                                            <option value="bn">বাংলা</option>
                                            <option value="en">English</option>
                                        </select>
                                    </label>
                                    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                                        {([
                                            ["emailUpdates", language === "bn" ? "ইমেইল আপডেট" : "Email updates"],
                                            ["transactionUpdates", language === "bn" ? "লেনদেন আপডেট" : "Transaction updates"],
                                            ["announcements", language === "bn" ? "ঘোষণা" : "Announcements"],
                                        ] as const).map(([field, label]) => (
                                            <label key={field} className="flex items-center gap-3 text-sm text-gray-700">
                                                <input
                                                    type="checkbox"
                                                    checked={accountPreferences[field]}
                                                    disabled={modalMode === "view"}
                                                    onChange={(event) =>
                                                        setAccountPreferences((current) => ({
                                                            ...current,
                                                            [field]: event.target.checked,
                                                        }))
                                                    }
                                                    className="h-4 w-4 accent-emerald-600"
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* DOCUMENTS */}

                            <section>

                                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                                    <FileText
                                        size={
                                            20
                                        }
                                    />
                                    Documents
                                </h3>

                                <div className="grid gap-4 md:grid-cols-2">

                                    <MemberFileUploadField
                                        label="Member Photo"
                                        field="photoFileId"
                                        value={form.photoFileId}
                                        disabled={saving || modalMode === "view"}
                                        onUpload={uploadFile}
                                    />

                                    <MemberFileUploadField
                                        label="NID Front"
                                        field="nidFrontFileId"
                                        value={form.nidFrontFileId}
                                        disabled={saving || modalMode === "view"}
                                        onUpload={uploadFile}
                                    />

                                    <MemberFileUploadField
                                        label="NID Back"
                                        field="nidBackFileId"
                                        value={form.nidBackFileId}
                                        disabled={saving || modalMode === "view"}
                                        onUpload={uploadFile}
                                    />

                                    <MemberFileUploadField
                                        label="Nominee Photo"
                                        field="nomineePhotoFileId"
                                        value={form.nomineePhotoFileId}
                                        disabled={saving || modalMode === "view"}
                                        onUpload={uploadFile}
                                    />

                                    <MemberFileUploadField
                                        label="Nominee NID"
                                        field="nomineeNidFileId"
                                        value={form.nomineeNidFileId}
                                        disabled={saving || modalMode === "view"}
                                        onUpload={uploadFile}
                                    />

                                </div>

                            </section>

                            {/* NOTE */}

                            <section>

                                <label className="mb-1 block text-sm font-semibold text-gray-700">
                                    নোট
                                </label>

                                <textarea
                                    value={
                                        form.note ||
                                        ""
                                    }
                                    disabled={
                                        modalMode ===
                                        "view"
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        updateField(
                                            "note",
                                            e.target.value
                                        )
                                    }
                                    rows={4}
                                    className="w-full rounded-xl border border-gray-200 p-4 outline-none focus:border-emerald-500 disabled:bg-gray-100"
                                />

                            </section>

                        </div>

                        {/* FOOTER */}

                        <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-5 py-4">

                            {selectedMember && (
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() =>
                                        archiveMember(selectedMember)
                                    }
                                    className="mr-auto flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                                >
                                    <Archive size={17} />
                                    {language === "bn" ? "৩০ দিনের জন্য Archive" : "Archive for 30 days"}
                                </button>
                            )}

                            <button
                                onClick={() =>
                                    setShowModal(
                                        false
                                    )
                                }
                                className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Close
                            </button>

                            {modalMode !==
                                "view" && (
                                <button
                                    disabled={
                                        saving
                                    }
                                    onClick={
                                        saveMember
                                    }
                                    className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {saving
                                        ? "Saving..."
                                        : t("Save Member")}
                                </button>
                            )}

                        </div>

                    </div>

                </div>
            )}

            {/* REQUEST MODAL */}

            {requestModal &&
                selectedRequest && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">

                        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

                            <div className="flex items-center justify-between border-b p-5">

                                <div>

                                    <h2 className="text-xl font-bold">
                                        Member Request
                                    </h2>

                                    <p className="text-sm text-emerald-600">
                                        {
                                            selectedRequest.requestId
                                        }
                                    </p>

                                </div>

                                <button
                                    onClick={() =>
                                        setRequestModal(
                                            false
                                        )
                                    }
                                    className="rounded-lg p-2 hover:bg-gray-100"
                                >
                                    <X />
                                </button>

                            </div>

                            <div className="grid gap-4 p-5 md:grid-cols-2">

                                {Object.entries(
                                    selectedRequest.data ||
                                    {}
                                ).map(
                                    ([
                                        key,
                                        value,
                                    ]) => {

                                        const hidden =
                                            key
                                                .toLowerCase()
                                                .includes(
                                                    "password"
                                                );

                                        if (
                                            hidden
                                        ) {
                                            return null;
                                        }

                                        return (
                                            <div
                                                key={
                                                    key
                                                }
                                                className="rounded-xl bg-gray-50 p-4"
                                            >

                                                <p className="text-xs font-semibold uppercase text-gray-400">
                                                    {
                                                        key
                                                    }
                                                </p>

                                                <p className="mt-1 break-words font-semibold text-gray-800">
                                                    {String(
                                                        value ??
                                                            ""
                                                    )}
                                                </p>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                            <div className="flex justify-end gap-3 border-t p-5">

                                <button
                                    onClick={() =>
                                        setRequestModal(
                                            false
                                        )
                                    }
                                    className="rounded-xl border px-5 py-3 font-semibold"
                                >
                                    Close
                                </button>

                                {selectedRequest.status !==
                                    "approved" && (
                                    <>
                                        <button
                                            disabled={
                                                saving
                                            }
                                            onClick={() =>
                                                requestAction(
                                                    selectedRequest.requestId,
                                                    "reject"
                                                )
                                            }
                                            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
                                        >
                                            <Trash2
                                                size={
                                                    17
                                                }
                                            />
                                            Reject
                                        </button>

                                        <button
                                            disabled={
                                                saving
                                            }
                                            onClick={() =>
                                                requestAction(
                                                    selectedRequest.requestId,
                                                    "approve"
                                                )
                                            }
                                            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white"
                                        >
                                            <Check
                                                size={
                                                    17
                                                }
                                            />
                                            Approve
                                        </button>
                                    </>
                                )}

                            </div>

                        </div>

                    </div>
                )}

        </main>
    );
}

/* =========================
   REQUEST LIST
========================= */

function RequestList({
    requests,
    failed = false,
    onView,
    onApprove,
    onReject,
    actionPending = false,
}: {
    requests: MemberRequest[];
    failed?: boolean;
    onView: (
        request: MemberRequest
    ) => void;
    onApprove: (
        id: string
    ) => void;
    onReject?: (
        id: string
    ) => void;
    actionPending?: boolean;
}) {

    if (!requests.length) {
        return (
            <div className="rounded-2xl bg-white p-12 text-center text-gray-500 shadow-sm">

                {failed
                    ? "Failed Requests নেই"
                    : "কোনো pending request নেই"}

            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {requests.map(
                (request) => {

                    const data =
                        request.data ||
                        {};

                    return (
                        <div
                            key={
                                request.requestId
                            }
                            className="rounded-2xl bg-white p-5 shadow-sm"
                        >

                            <div className="flex items-start justify-between">

                                <div>

                                    <h3 className="font-bold text-gray-900">
                                        {String(data.name || "Unnamed")}
                                    </h3>

                                    <p className="text-sm font-semibold text-emerald-600">
                                        {
                                            request.requestId
                                        }
                                    </p>

                                </div>

                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                        failed
                                            ? "bg-red-100 text-red-700"
                                            : "bg-amber-100 text-amber-700"
                                    }`}
                                >
                                    {failed
                                        ? "Failed"
                                        : "Pending"}
                                </span>

                            </div>

                            <div className="mt-4 space-y-2 text-sm text-gray-600">

                                <p>
                                    📱{" "}
                                    {String(data.whatsapp || data.mobile || "—")}
                                </p>

                                <p>
                                    ✉️{" "}
                                    {String(data.email || "—")}
                                </p>

                                <p>
                                    📍{" "}
                                    {String(data.address || "—")}
                                </p>

                            </div>

                            <div className="mt-5 flex gap-2">

                                <button
                                    type="button"
                                    onClick={() =>
                                        onView(
                                            request
                                        )
                                    }
                                    disabled={actionPending}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    <Eye
                                        size={
                                            16
                                        }
                                    />
                                    View
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onApprove(
                                            request.requestId
                                        )
                                    }
                                    disabled={actionPending}
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
                                >
                                    <Check
                                        size={
                                            16
                                        }
                                    />
                                    Approve
                                </button>

                                {!failed &&
                                    onReject && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onReject(
                                                    request.requestId
                                                )
                                            }
                                            disabled={actionPending}
                                            aria-label="Reject member request"
                                            className="rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            <Trash2
                                                size={
                                                    16
                                                }
                                            />
                                        </button>
                                    )}

                            </div>

                        </div>
                    );
                }
            )}

        </div>
    );
}