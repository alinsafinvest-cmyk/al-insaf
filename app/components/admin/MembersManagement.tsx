"use client";
// বাংলা: এই shared UI component-এ MembersManagement অংশের display ও interaction পরিচালিত হয়।

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
    | "failed";

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
};

type MemberRequest = {
    requestId: string;
    status: string;
    data: any;
    createdAt?: string;
    rejectedAt?: string;
    rejectionReason?: string;
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
};

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
    ] = useState<any>(
        emptyForm
    );

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
            setLoading(true);
            setError("");

            const [
                membersResponse,
                pendingResponse,
                failedResponse,
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
            ]);

            const membersData =
                await membersResponse.json();

            const pendingData =
                await pendingResponse.json();

            const failedData =
                await failedResponse.json();

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

            setMembers(
                membersData.members || []
            );

            setRequests(
                pendingData.requests || []
            );

            setFailedRequests(
                failedData.requests || []
            );

        } catch (err: any) {
            setError(
                err?.message ||
                "Data load করা যায়নি"
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
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

        setForm({
            ...emptyForm,
            ...member,
            password: "",
        });

        setShowModal(true);
    }

    function updateField(
        key: string,
        value: any
    ) {
        setForm(
            (old: any) => ({
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
        field: string
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

            setSuccess(
                `${field} upload হয়েছে`
            );

        } catch (err: any) {
            setError(
                err?.message ||
                "File upload করা যায়নি"
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

        } catch (err: any) {
            setError(
                err?.message ||
                "Member save করা যায়নি"
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
                    : "এই request Failed Requests-এ পাঠাবেন?";

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

            setRequestModal(false);

            setSelectedRequest(null);

            await loadAll();

        } catch (err: any) {
            setError(
                err?.message ||
                "Request update করা যায়নি"
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

    /* =========================
       FILE FIELD
    ========================= */

    function FileUploadField({
        label,
        field,
    }: {
        label: string;
        field: string;
    }) {

        return (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">

                <div className="mb-2 flex items-center justify-between">

                    <span className="text-sm font-semibold text-gray-700">
                        {label}
                    </span>

                    {form[field] && (
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
                            disabled={
                                saving ||
                                modalMode === "view"
                            }
                            onChange={(
                                event
                            ) => {
                                const file =
                                    event.target.files?.[0];

                                if (file) {
                                    uploadFile(
                                        file,
                                        field
                                    );
                                }
                            }}
                        />

                    </label>

                    {form[field] && (
                        <span className="max-w-[180px] truncate text-xs text-gray-500">
                            {form[field]}
                        </span>
                    )}

                </div>

            </div>
        );
    }

    /* =========================
       INPUT
    ========================= */

    function Input({
        label,
        field,
        type = "text",
    }: {
        label: string;
        field: string;
        type?: string;
    }) {

        return (
            <div>

                <label className="mb-1 block text-sm font-semibold text-gray-700">
                    {label}
                </label>

                <input
                    type={type}
                    value={
                        form[field] ?? ""
                    }
                    disabled={
                        modalMode ===
                        "view"
                    }
                    onChange={(e) =>
                        updateField(
                            field,
                            e.target.value
                        )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-100"
                />

            </div>
        );
    }

    /* =========================
       SELECT
    ========================= */

    function Select({
        label,
        field,
        options,
    }: {
        label: string;
        field: string;
        options: string[];
    }) {

        return (
            <div>

                <label className="mb-1 block text-sm font-semibold text-gray-700">
                    {label}
                </label>

                <select
                    value={
                        form[field] ??
                        ""
                    }
                    disabled={
                        modalMode ===
                        "view"
                    }
                    onChange={(e) =>
                        updateField(
                            field,
                            e.target.value
                        )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                >

                    {options.map(
                        (option) => (
                            <option
                                key={
                                    option
                                }
                                value={
                                    option
                                }
                            >
                                {option}
                            </option>
                        )
                    )}

                </select>

            </div>
        );
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
                                                    <img
                                                        src={
                                                            member.photoUrl
                                                        }
                                                        alt={
                                                            member.name
                                                        }
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
                    />
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

                                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                                    <UserPlus
                                        size={
                                            20
                                        }
                                    />
                                    {t("Basic Information")}
                                </h3>

                                <div className="grid gap-4 md:grid-cols-2">

                                    <Input
                                        label="নাম"
                                        field="name"
                                    />

                                    <Input
                                        label={t("WhatsApp")}
                                        field="whatsapp"
                                    />

                                    <Input
                                        label="অন্য মোবাইল"
                                        field="mobile"
                                    />

                                    <Input
                                        label={t("Email")}
                                        field="email"
                                        type="email"
                                    />

                                    <Input
                                        label="NID নম্বর"
                                        field="nid"
                                    />

                                    <Input
                                        label="যোগদানের তারিখ"
                                        field="joinDate"
                                        type="date"
                                    />

                                    <Input
                                        label="অংশ সংখ্যা"
                                        field="shares"
                                        type="number"
                                    />

                                    <Input
                                        label="মাসিক জমা"
                                        field="monthlyDeposit"
                                        type="number"
                                    />

                                    <Select
                                        label={t("Status")}
                                        field="status"
                                        options={[
                                            "Active",
                                            "Inactive",
                                            "Blocked",
                                            "Disabled",
                                        ]}
                                    />

                                    <Select
                                        label={t("Login Status")}
                                        field="loginStatus"
                                        options={[
                                            "Active",
                                            "Inactive",
                                            "Blocked",
                                            "Disabled",
                                        ]}
                                    />

                                    <div className="md:col-span-2">

                                        <Input
                                            label={
                                                modalMode ===
                                                "add"
                                                    ? "Password (blank রাখলে MemberID হবে)"
                                                    : "নতুন Password (blank রাখলে পরিবর্তন হবে না)"
                                            }
                                            field="password"
                                            type="password"
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

                                    <Input
                                        label="Nominee নাম"
                                        field="nomineeName"
                                    />

                                    <Input
                                        label="Nominee মোবাইল"
                                        field="nomineeMobile"
                                    />

                                    <Input
                                        label="Nominee সম্পর্ক"
                                        field="nomineeRelation"
                                    />

                                    <Input
                                        label="Nominee NID"
                                        field="nomineeNid"
                                    />

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

                                    <FileUploadField
                                        label="Member Photo"
                                        field="photoFileId"
                                    />

                                    <FileUploadField
                                        label="NID Front"
                                        field="nidFrontFileId"
                                    />

                                    <FileUploadField
                                        label="NID Back"
                                        field="nidBackFileId"
                                    />

                                    <FileUploadField
                                        label="Nominee Photo"
                                        field="nomineePhotoFileId"
                                    />

                                    <FileUploadField
                                        label="Nominee NID"
                                        field="nomineeNidFileId"
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
                                        {
                                            data.name ||
                                            "Unnamed"
                                        }
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
                                    {
                                        data.whatsapp ||
                                        data.mobile ||
                                        "—"
                                    }
                                </p>

                                <p>
                                    ✉️{" "}
                                    {
                                        data.email ||
                                        "—"
                                    }
                                </p>

                                <p>
                                    📍{" "}
                                    {
                                        data.address ||
                                        "—"
                                    }
                                </p>

                            </div>

                            <div className="mt-5 flex gap-2">

                                <button
                                    onClick={() =>
                                        onView(
                                            request
                                        )
                                    }
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
                                    onClick={() =>
                                        onApprove(
                                            request.requestId
                                        )
                                    }
                                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700"
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
                                            onClick={() =>
                                                onReject(
                                                    request.requestId
                                                )
                                            }
                                            className="rounded-xl bg-red-600 px-3 py-2 text-white hover:bg-red-700"
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