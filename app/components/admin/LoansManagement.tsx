"use client";
// বাংলা: এই shared UI component-এ LoansManagement অংশের display ও interaction পরিচালিত হয়।

import {
    useEffect,
    useMemo,
    useState,
} from "react";
import { SITE_LOGO } from "@/lib/site-branding";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

type LoanStatus =
    | "pending"
    | "approved"
    | "rejected";

type Loan = {
    id: string;
    loanId: string;

    memberId: string;
    memberName: string;
    memberPhone: string;

    amount: number;

    loanDate: string;

    loanType: string;
    purpose: string;

    durationMonths: number;

    monthlyInstallment: number;

    totalPayable: number;

    paidAmount: number;

    dueAmount: number;

    guarantorMemberId: string;
    guarantorName: string;

    paymentMethod: string;

    transactionId: string;

    proofFileId: string;
    proofFileName: string;

    description: string;

    status: LoanStatus;

    submittedBy: string;

    approvedBy: string;
    approvedAt: string;

    rejectedBy: string;
    rejectedAt: string;

    rejectionReason: string;

    receiptId: string;

    createdAt: string;
    updatedAt: string;
};

type Summary = {
    total: number;

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

    totalApprovedAmount: number;

    totalPaid: number;

    totalDue: number;

    cashBalance: number;
};

const LOGO = SITE_LOGO;

const emptyForm = {
    memberId: "",
    amount: "",
    loanDate: new Date()
        .toISOString()
        .slice(0, 10),

    loanType: "General Loan",

    purpose: "",

    durationMonths: "",

    monthlyInstallment: "",

    totalPayable: "",

    guarantorMemberId: "",

    guarantorName: "",

    paymentMethod: "Cash",

    transactionId: "",

    proofFileId: "",

    proofFileName: "",

    description: "",
};

function money(value: number) {
    return new Intl.NumberFormat(
        "en-BD",
        {
            style: "currency",
            currency: "BDT",
            maximumFractionDigits: 0,
        },
    ).format(value || 0);
}

function dateText(value: any) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        },
    );
}

function statusText(
    status: LoanStatus,
) {
    if (status === "approved")
        return "Approved";

    if (status === "rejected")
        return "Rejected";

    return "Pending";
}

function statusClass(
    status: LoanStatus,
) {
    if (status === "approved") {
        return "bg-emerald-100 text-emerald-700";
    }

    if (status === "rejected") {
        return "bg-red-100 text-red-700";
    }

    return "bg-amber-100 text-amber-700";
}

function escapeHtml(
    value: any,
) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll(
            "'",
            "&#039;",
        );
}

// বাংলা: এই component admin loan application, repayment তথ্য ও approval action পরিচালনা করে।
export default function LoansManagement() {
    const { language } = useLanguage();
    const t = (value: string) => translate(language, value);
    const [loans, setLoans] = useState<
        Loan[]
    >([]);

    const [summary, setSummary] =
        useState<Summary>({
            total: 0,

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

            totalApprovedAmount: 0,

            totalPaid: 0,

            totalDue: 0,

            cashBalance: 0,
        });

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [search, setSearch] =
        useState("");

    const [activeTab, setActiveTab] =
        useState<
            | "all"
            | "pending"
            | "approved"
            | "rejected"
        >("all");

    const [showNew, setShowNew] =
        useState(false);

    const [selectedLoan, setSelectedLoan] =
        useState<Loan | null>(null);

    const [rejectLoan, setRejectLoan] =
        useState<Loan | null>(null);

    const [rejectionReason, setRejectionReason] =
        useState("");

    const [form, setForm] =
        useState(emptyForm);

    const loadLoans = async () => {
        try {
            setLoading(true);

            const response =
                await fetch(
                    "/api/loans",
                    {
                        cache: "no-store",
                    },
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result?.message ||
                        "Loan load failed",
                );
            }

            setLoans(
                result.loans || [],
            );

            setSummary(
                result.summary || summary,
            );
        } catch (error: any) {
            alert(
                error?.message ||
                    "Loan data load failed",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLoans();
    }, []);

    const filteredLoans =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            return loans.filter(
                (loan) => {
                    const matchesTab =
                        activeTab ===
                            "all" ||
                        loan.status ===
                            activeTab;

                    if (!matchesTab) {
                        return false;
                    }

                    if (!query) {
                        return true;
                    }

                    return [
                        loan.loanId,
                        loan.memberId,
                        loan.memberName,
                        loan.memberPhone,
                        loan.loanType,
                        loan.purpose,
                        loan.guarantorMemberId,
                        loan.guarantorName,
                        loan.transactionId,
                        loan.status,
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(query);
                },
            );
        }, [
            loans,
            activeTab,
            search,
        ]);

    const updateForm = (
        key: keyof typeof emptyForm,
        value: string,
    ) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const createLoan = async (
        event: React.FormEvent,
    ) => {
        event.preventDefault();

        if (!form.memberId.trim()) {
            alert("Member ID দিন");
            return;
        }

        if (
            !form.amount ||
            Number(form.amount) <= 0
        ) {
            alert(
                "সঠিক Loan Amount দিন",
            );
            return;
        }

        try {
            setSaving(true);

            const response =
                await fetch(
                    "/api/loans",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(
                            form,
                        ),
                    },
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result?.message ||
                        "Loan create failed",
                );
            }

            alert(
                `Loan তৈরি হয়েছে: ${result.loanId}`,
            );

            setForm(emptyForm);

            setShowNew(false);

            await loadLoans();
        } catch (error: any) {
            alert(
                error?.message ||
                    "Loan create failed",
            );
        } finally {
            setSaving(false);
        }
    };

    const approveLoan = async (
        loan: Loan,
    ) => {
        const ok = window.confirm(
            `আপনি কি ${loan.loanId} Approve করতে চান?\n\nAmount: ${money(
                loan.amount,
            )}`,
        );

        if (!ok) return;

        try {
            setSaving(true);

            const response =
                await fetch(
                    "/api/loans",
                    {
                        method: "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(
                            {
                                loanId:
                                    loan.loanId,

                                action:
                                    "approve",
                            },
                        ),
                    },
                );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result?.message ||
                        "Approval failed",
                );
            }

            alert(
                `Loan Approved.\nReceipt: ${result.receiptId}`,
            );

            await loadLoans();
        } catch (error: any) {
            alert(
                error?.message ||
                    "Approval failed",
            );
        } finally {
            setSaving(false);
        }
    };

    const submitReject =
        async () => {
            if (!rejectLoan) return;

            if (
                !rejectionReason.trim()
            ) {
                alert(
                    "Reject করার কারণ দিন",
                );

                return;
            }

            try {
                setSaving(true);

                const response =
                    await fetch(
                        "/api/loans",
                        {
                            method: "PATCH",

                            headers: {
                                "Content-Type":
                                    "application/json",
                            },

                            body: JSON.stringify(
                                {
                                    loanId:
                                        rejectLoan.loanId,

                                    action:
                                        "reject",

                                    rejectionReason:
                                        rejectionReason.trim(),
                                },
                            ),
                        },
                    );

                const result =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        result?.message ||
                            "Reject failed",
                    );
                }

                alert(
                    "Loan Reject করা হয়েছে",
                );

                setRejectLoan(null);

                setRejectionReason("");

                await loadLoans();
            } catch (error: any) {
                alert(
                    error?.message ||
                        "Reject failed",
                );
            } finally {
                setSaving(false);
            }
        };

    const printReceipt = (
        loan: Loan,
    ) => {
        if (
            loan.status !==
            "approved"
        ) {
            alert(
                "শুধু Approved Loan-এর Receipt তৈরি করা যাবে",
            );

            return;
        }

        const popup =
            window.open(
                "",
                "_blank",
                "width=900,height=900",
            );

        if (!popup) {
            alert(
                "Popup blocked হয়েছে। Browser popup allow করুন।",
            );

            return;
        }

        const logo =
            encodeURI(LOGO);

        const html = `
<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8" />

<title>
Loan Receipt - ${escapeHtml(
            loan.loanId,
        )}
</title>

<style>

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 30px;
    background: #f1f5f9;
    font-family:
        Arial,
        "Noto Sans Bengali",
        sans-serif;
}

.receipt {
    position: relative;
    overflow: hidden;

    max-width: 850px;

    margin: 0 auto;

    padding: 45px;

    background: white;

    border: 1px solid #d1d5db;

    border-radius: 20px;

    box-shadow:
        0 20px 50px
        rgba(0,0,0,.10);
}

.watermark {
    position: absolute;

    left: 50%;
    top: 50%;

    transform:
        translate(-50%, -50%);

    width: 430px;
    height: 430px;

    object-fit: contain;

    opacity: .055;

    z-index: 0;
}

.content {
    position: relative;
    z-index: 1;
}

.header {
    display: flex;

    justify-content:
        space-between;

    align-items: center;

    gap: 25px;

    border-bottom:
        2px solid #047857;

    padding-bottom: 20px;
}

.logo {
    width: 80px;
    height: 80px;

    object-fit: contain;
}

.title {
    flex: 1;

    text-align: center;
}

.title h1 {
    margin: 0;

    color: #047857;

    font-size: 28px;
}

.title p {
    margin: 6px 0 0;

    color: #6b7280;
}

.receipt-no {
    text-align: right;

    font-size: 13px;

    color: #374151;
}

.badge {
    display: inline-block;

    margin-top: 7px;

    padding: 6px 12px;

    border-radius: 999px;

    background: #dcfce7;

    color: #166534;

    font-weight: bold;
}

h2 {
    text-align: center;

    margin: 28px 0 20px;

    color: #111827;
}

.grid {
    display: grid;

    grid-template-columns:
        1fr 1fr;

    gap: 12px;
}

.item {
    border: 1px solid #e5e7eb;

    border-radius: 10px;

    padding: 12px 14px;

    background: #f9fafb;
}

.label {
    color: #6b7280;

    font-size: 12px;

    margin-bottom: 5px;
}

.value {
    color: #111827;

    font-weight: 700;
}

.amount {
    margin: 25px 0;

    padding: 22px;

    text-align: center;

    border-radius: 15px;

    background: #ecfdf5;

    border: 1px solid #a7f3d0;
}

.amount .big {
    color: #047857;

    font-size: 32px;

    font-weight: 800;
}

.note {
    margin-top: 20px;

    padding: 15px;

    border-radius: 10px;

    background: #f9fafb;

    color: #374151;
}

.footer {
    margin-top: 45px;

    display: flex;

    justify-content:
        space-between;

    gap: 30px;
}

.signature {
    width: 220px;

    padding-top: 35px;

    border-top:
        1px solid #374151;

    text-align: center;

    color: #374151;
}

@media print {

    body {
        background: white;

        padding: 0;
    }

    .receipt {
        border: 0;

        box-shadow: none;

        max-width: none;
    }

}

</style>
</head>

<body>

<div class="receipt">

<img
    class="watermark"
    src="${logo}"
/>

<div class="content">

<div class="header">

<img
    class="logo"
    src="${logo}"
/>

<div class="title">

<h1>
আল ইনসাফ ইনভেস্টমেন্ট সোসাইটি
</h1>

<p>
{language === "bn" ? "আল-ইনসাফ ইনভেস্টমেন্ট সোসাইটি" : "Al-Insaf Investment Society"}
</p>

</div>

<div class="receipt-no">

<strong>
Receipt
</strong>

<br />

${escapeHtml(
    loan.receiptId ||
        `LR-${loan.loanId}`,
)}

<br />

<span class="badge">
Approved
</span>

</div>

</div>

<h2>
Loan Disbursement Receipt
</h2>

<div class="amount">

<div>
Approved Loan Amount
</div>

<div class="big">
${money(
    loan.amount,
)}
</div>

</div>

<div class="grid">

<div class="item">
<div class="label">
Loan ID
</div>
<div class="value">
${escapeHtml(
    loan.loanId,
)}
</div>
</div>

<div class="item">
<div class="label">
Loan Date
</div>
<div class="value">
${escapeHtml(
    dateText(
        loan.loanDate,
    ),
)}
</div>
</div>

<div class="item">
<div class="label">
Member ID
</div>
<div class="value">
${escapeHtml(
    loan.memberId,
)}
</div>
</div>

<div class="item">
<div class="label">
Member Name
</div>
<div class="value">
${escapeHtml(
    loan.memberName,
)}
</div>
</div>

<div class="item">
<div class="label">
Member Phone
</div>
<div class="value">
${escapeHtml(
    loan.memberPhone,
)}
</div>
</div>

<div class="item">
<div class="label">
Loan Type
</div>
<div class="value">
${escapeHtml(
    loan.loanType,
)}
</div>
</div>

<div class="item">
<div class="label">
Purpose
</div>
<div class="value">
${escapeHtml(
    loan.purpose,
)}
</div>
</div>

<div class="item">
<div class="label">
Duration
</div>
<div class="value">
${loan.durationMonths || 0}
months
</div>
</div>

<div class="item">
<div class="label">
Monthly Installment
</div>
<div class="value">
${money(
    loan.monthlyInstallment,
)}
</div>
</div>

<div class="item">
<div class="label">
Total Payable
</div>
<div class="value">
${money(
    loan.totalPayable,
)}
</div>
</div>

<div class="item">
<div class="label">
Guarantor Member ID
</div>
<div class="value">
${escapeHtml(
    loan.guarantorMemberId,
)}
</div>
</div>

<div class="item">
<div class="label">
Guarantor Name
</div>
<div class="value">
${escapeHtml(
    loan.guarantorName,
)}
</div>
</div>

<div class="item">
<div class="label">
Payment Method
</div>
<div class="value">
${escapeHtml(
    loan.paymentMethod,
)}
</div>
</div>

<div class="item">
<div class="label">
Transaction ID
</div>
<div class="value">
${escapeHtml(
    loan.transactionId,
)}
</div>
</div>

<div class="item">
<div class="label">
Approved By
</div>
<div class="value">
${escapeHtml(
    loan.approvedBy,
)}
</div>
</div>

<div class="item">
<div class="label">
Approved At
</div>
<div class="value">
${escapeHtml(
    dateText(
        loan.approvedAt,
    ),
)}
</div>
</div>

</div>

${
    loan.description
        ? `
<div class="note">

<strong>
Description:
</strong>

<br />

${escapeHtml(
    loan.description,
)}

</div>
`
        : ""
}

<div class="footer">

<div class="signature">
Member Signature
</div>

<div class="signature">
Authorized Signature
</div>

</div>

</div>

</div>

<script>
window.onload = function() {
    window.print();
};
</script>

</body>
</html>
`;

        popup.document.open();

        popup.document.write(
            html,
        );

        popup.document.close();
    };

    return (
        <div className="min-h-screen bg-slate-100 px-3 py-5 dark:bg-slate-950 md:px-6 md:py-8">

            <div className="mx-auto max-w-7xl">

                {/* HEADER */}

                <div className="mb-6 rounded-3xl bg-gradient-to-r from-emerald-800 to-green-600 p-6 text-white shadow-xl">

                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                        <div>

                            <p className="text-sm text-emerald-100">
                                Al-Insaf Investment Society
                            </p>

                            <h1 className="mt-1 text-3xl font-extrabold">
                                {t("Loan Management")}
                            </h1>

                            <p className="mt-2 text-sm text-emerald-50">
                                {language === "bn" ? "ঋণ আবেদন, অনুমোদন, প্রত্যাখ্যান ও Receipt Management" : "Manage loan applications, approvals, rejections, and receipts"}
                            </p>

                        </div>

                        <button
                            onClick={() =>
                                setShowNew(true)
                            }
                            className="rounded-2xl bg-white px-5 py-3 font-bold text-emerald-800 shadow-lg transition hover:scale-[1.02]"
                        >
                            + {t("New Loan")}
                        </button>

                    </div>

                </div>

                {/* SUMMARY */}

                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">

                    <SummaryCard
                        title={t("Total Loans")}
                        value={summary.total}
                    />

                    <SummaryCard
                        title={t("Pending")}
                        value={`${summary.pending.count} • ${money(
                            summary.pending.amount,
                        )}`}
                    />

                    <SummaryCard
                        title={t("Approved")}
                        value={`${summary.approved.count} • ${money(
                            summary.approved.amount,
                        )}`}
                    />

                    <SummaryCard
                        title={t("Rejected")}
                        value={`${summary.rejected.count} • ${money(
                            summary.rejected.amount,
                        )}`}
                    />

                    <SummaryCard
                        title={t("Total Due")}
                        value={money(
                            summary.totalDue,
                        )}
                    />

                </div>

                {/* TABS + SEARCH */}

                <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                        <div className="flex flex-wrap gap-2">

                            <TabButton
                                active={
                                    activeTab ===
                                    "all"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "all",
                                    )
                                }
                            >
                                {t("All")}
                            </TabButton>

                            <TabButton
                                active={
                                    activeTab ===
                                    "pending"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "pending",
                                    )
                                }
                            >
                                {t("Pending")}
                                {summary.pending.count >
                                    0 && (
                                    <span className="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-xs">
                                        {
                                            summary
                                                .pending
                                                .count
                                        }
                                    </span>
                                )}
                            </TabButton>

                            <TabButton
                                active={
                                    activeTab ===
                                    "approved"
                                }
                                onClick={() =>
                                    setActiveTab(
                                        "approved",
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
                                        "rejected",
                                    )
                                }
                            >
                                {t("Rejected")}
                            </TabButton>

                        </div>

                        <input
                            value={search}
                            onChange={(e) =>
                                setSearch(
                                    e.target.value,
                                )
                            }
                            placeholder={language === "bn" ? "Loan ID / Member ID / Name / Phone দিয়ে Search..." : "Search by loan ID, member ID, name, or phone..."}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 lg:w-96"
                        />

                    </div>

                </div>

                {/* TABLE */}

                <div className="overflow-hidden rounded-3xl bg-white shadow-sm">

                    <div className="overflow-x-auto">

                        <table className="min-w-[1200px] w-full">

                            <thead className="bg-slate-50">

                                <tr>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        {t("Loan")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        {t("Member")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        {t("Amount")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        {t("Installment")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        {t("Due")}
                                    </th>

                                    <th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">
                                        {t("Status")}
                                    </th>

                                    <th className="px-5 py-4 text-right text-xs font-bold uppercase text-slate-500">
                                        {t("Action")}
                                    </th>

                                </tr>

                            </thead>

                            <tbody className="divide-y divide-slate-100">

                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-16 text-center text-slate-500"
                                        >
                                            {t("Loading Loans...")}
                                        </td>
                                    </tr>
                                ) : filteredLoans.length ===
                                  0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-16 text-center text-slate-500"
                                        >
                                            {language === "bn" ? "কোনো Loan পাওয়া যায়নি।" : "No loans found."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLoans.map(
                                        (loan) => (
                                            <tr
                                                key={
                                                    loan.id ||
                                                    loan.loanId
                                                }
                                                className="transition hover:bg-slate-50"
                                            >

                                                <td className="px-5 py-4">

                                                    <div className="font-bold text-slate-900">
                                                        {
                                                            loan.loanId
                                                        }
                                                    </div>

                                                    <div className="mt-1 text-xs text-slate-500">
                                                        {dateText(
                                                            loan.loanDate,
                                                        )}
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="font-semibold text-slate-800">
                                                        {
                                                            loan.memberName ||
                                                            "-"
                                                        }
                                                    </div>

                                                    <div className="text-xs text-slate-500">
                                                        {
                                                            loan.memberId
                                                        }
                                                    </div>

                                                    <div className="text-xs text-slate-500">
                                                        {
                                                            loan.memberPhone ||
                                                            "-"
                                                        }
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="font-bold text-emerald-700">
                                                        {money(
                                                            loan.amount,
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500">
                                                        {
                                                            loan.loanType
                                                        }
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="font-semibold">
                                                        {money(
                                                            loan.monthlyInstallment,
                                                        )}
                                                    </div>

                                                    <div className="text-xs text-slate-500">
                                                        {
                                                            loan.durationMonths
                                                        }{" "}
                                                        {t("months")}
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="font-semibold text-red-600">
                                                        {money(
                                                            loan.dueAmount,
                                                        )}
                                                    </div>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                                            loan.status,
                                                        )}`}
                                                    >
                                                        {statusText(
                                                            loan.status,
                                                        )}
                                                    </span>

                                                </td>

                                                <td className="px-5 py-4">

                                                    <div className="flex justify-end gap-2">

                                                        <button
                                                            onClick={() =>
                                                                setSelectedLoan(
                                                                    loan,
                                                                )
                                                            }
                                                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                                                        >
                                                            View
                                                        </button>

                                                        {loan.status ===
                                                            "pending" && (
                                                            <>
                                                                <button
                                                                    disabled={
                                                                        saving
                                                                    }
                                                                    onClick={() =>
                                                                        approveLoan(
                                                                            loan,
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                                                >
                                                                    Approve
                                                                </button>

                                                                <button
                                                                    disabled={
                                                                        saving
                                                                    }
                                                                    onClick={() =>
                                                                        setRejectLoan(
                                                                            loan,
                                                                        )
                                                                    }
                                                                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}

                                                        {loan.status ===
                                                            "approved" && (
                                                            <button
                                                                onClick={() =>
                                                                    printReceipt(
                                                                        loan,
                                                                    )
                                                                }
                                                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-black"
                                                            >
                                                                Receipt
                                                            </button>
                                                        )}

                                                    </div>

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

            {/* NEW LOAN MODAL */}

            {showNew && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">

                    <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">

                            <div>

                                <h2 className="text-2xl font-extrabold text-slate-900">
                                    {t("New Loan")}
                                </h2>

                                <p className="text-sm text-slate-500">
                                    নতুন Loan তৈরি করুন
                                </p>

                            </div>

                            <button
                                onClick={() =>
                                    setShowNew(false)
                                }
                                className="rounded-full bg-slate-100 px-4 py-2 font-bold hover:bg-slate-200"
                            >
                                ✕
                            </button>

                        </div>

                        <form
                            onSubmit={
                                createLoan
                            }
                            className="space-y-6 p-6"
                        >

                            <SectionTitle>
                                Member Information
                            </SectionTitle>

                            <div className="grid gap-4 md:grid-cols-3">

                                <Field
                                    label="Member ID *"
                                    value={
                                        form.memberId
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "memberId",
                                            value,
                                        )
                                    }
                                    placeholder={t("e.g. M001")}
                                />

                                <Field
                                    label="Loan Amount *"
                                    type="number"
                                    value={
                                        form.amount
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "amount",
                                            value,
                                        )
                                    }
                                    placeholder="50000"
                                />

                                <Field
                                    label="Loan Date"
                                    type="date"
                                    value={
                                        form.loanDate
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "loanDate",
                                            value,
                                        )
                                    }
                                />

                            </div>

                            <SectionTitle>
                                Loan Information
                            </SectionTitle>

                            <div className="grid gap-4 md:grid-cols-3">

                                <Field
                                    label="Loan Type"
                                    value={
                                        form.loanType
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "loanType",
                                            value,
                                        )
                                    }
                                    placeholder={t("General Loan")}
                                />

                                <Field
                                    label="Purpose"
                                    value={
                                        form.purpose
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "purpose",
                                            value,
                                        )
                                    }
                                    placeholder={t("Business / Personal...")}
                                />

                                <Field
                                    label="Duration (Months)"
                                    type="number"
                                    value={
                                        form.durationMonths
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "durationMonths",
                                            value,
                                        )
                                    }
                                    placeholder="12"
                                />

                                <Field
                                    label="Monthly Installment"
                                    type="number"
                                    value={
                                        form.monthlyInstallment
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "monthlyInstallment",
                                            value,
                                        )
                                    }
                                    placeholder="5000"
                                />

                                <Field
                                    label="Total Payable"
                                    type="number"
                                    value={
                                        form.totalPayable
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "totalPayable",
                                            value,
                                        )
                                    }
                                    placeholder="60000"
                                />

                                <select
                                    value={
                                        form.paymentMethod
                                    }
                                    onChange={(e) =>
                                        updateForm(
                                            "paymentMethod",
                                            e.target.value,
                                        )
                                    }
                                    className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                                >
                                    <option>{t("Cash")}</option>
                                    <option>{t("Bank")}</option>
                                    <option>bKash</option>
                                    <option>Nagad</option>
                                    <option>Rocket</option>
                                    <option>{t("Other")}</option>
                                </select>

                            </div>

                            <SectionTitle>
                                Guarantor Information
                            </SectionTitle>

                            <div className="grid gap-4 md:grid-cols-2">

                                <Field
                                    label="Guarantor Member ID"
                                    value={
                                        form.guarantorMemberId
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "guarantorMemberId",
                                            value,
                                        )
                                    }
                                    placeholder={t("e.g. M002")}
                                />

                                <Field
                                    label="Guarantor Name"
                                    value={
                                        form.guarantorName
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "guarantorName",
                                            value,
                                        )
                                    }
                                    placeholder={t("Guarantor Name")}
                                />

                            </div>

                            <SectionTitle>
                                Transaction & Attachment
                            </SectionTitle>

                            <div className="grid gap-4 md:grid-cols-2">

                                <Field
                                    label="Transaction ID"
                                    value={
                                        form.transactionId
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "transactionId",
                                            value,
                                        )
                                    }
                                />

                                <Field
                                    label="Proof File ID"
                                    value={
                                        form.proofFileId
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "proofFileId",
                                            value,
                                        )
                                    }
                                    placeholder={t("Google Drive File ID")}
                                />

                                <Field
                                    label="Proof File Name"
                                    value={
                                        form.proofFileName
                                    }
                                    onChange={(value) =>
                                        updateForm(
                                            "proofFileName",
                                            value,
                                        )
                                    }
                                    placeholder="document.pdf"
                                />

                            </div>

                            <div>

                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Description / Note
                                </label>

                                <textarea
                                    value={
                                        form.description
                                    }
                                    onChange={(e) =>
                                        updateForm(
                                            "description",
                                            e.target.value,
                                        )
                                    }
                                    rows={4}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                                    placeholder={t("Additional loan details...")}
                                />

                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowNew(false)
                                    }
                                    className="rounded-xl border border-slate-200 px-6 py-3 font-bold"
                                >
                                    {t("Cancel")}
                                </button>

                                <button
                                    type="submit"
                                    disabled={
                                        saving
                                    }
                                    className="rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                                >
                                    {saving
                                        ? t("Saving...")
                                        : t("Create Loan")}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* DETAILS MODAL */}

            {selectedLoan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">

                    <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">

                            <div>

                                <h2 className="text-2xl font-extrabold">
                                    {t("Loan Details")}
                                </h2>

                                <p className="text-sm text-slate-500">
                                    {
                                        selectedLoan.loanId
                                    }
                                </p>

                            </div>

                            <button
                                onClick={() =>
                                    setSelectedLoan(
                                        null,
                                    )
                                }
                                className="rounded-full bg-slate-100 px-4 py-2 font-bold"
                            >
                                ✕
                            </button>

                        </div>

                        <div className="space-y-6 p-6">

                            <div className="grid gap-4 md:grid-cols-4">

                                <Info
                                    label={t("Loan ID")}
                                    value={
                                        selectedLoan.loanId
                                    }
                                />

                                <Info
                                    label={t("Status")}
                                    value={statusText(
                                        selectedLoan.status,
                                    )}
                                />

                                <Info
                                    label={t("Member ID")}
                                    value={
                                        selectedLoan.memberId
                                    }
                                />

                                <Info
                                    label={t("Member Name")}
                                    value={
                                        selectedLoan.memberName
                                    }
                                />

                            </div>

                            <div className="rounded-2xl bg-emerald-50 p-5">

                                <p className="text-sm text-emerald-700">
                                    Approved / Requested Amount
                                </p>

                                <p className="mt-1 text-3xl font-extrabold text-emerald-800">
                                    {money(
                                        selectedLoan.amount,
                                    )}
                                </p>

                            </div>

                            <div className="grid gap-4 md:grid-cols-3">

                                <Info
                                    label="Loan Date"
                                    value={dateText(
                                        selectedLoan.loanDate,
                                    )}
                                />

                                <Info
                                    label="Loan Type"
                                    value={
                                        selectedLoan.loanType
                                    }
                                />

                                <Info
                                    label="Purpose"
                                    value={
                                        selectedLoan.purpose
                                    }
                                />

                                <Info
                                    label="Duration"
                                    value={`${selectedLoan.durationMonths} ${t("months")}`}
                                />

                                <Info
                                    label="Monthly Installment"
                                    value={money(
                                        selectedLoan.monthlyInstallment,
                                    )}
                                />

                                <Info
                                    label="Total Payable"
                                    value={money(
                                        selectedLoan.totalPayable,
                                    )}
                                />

                                <Info
                                    label="Paid"
                                    value={money(
                                        selectedLoan.paidAmount,
                                    )}
                                />

                                <Info
                                    label="Due"
                                    value={money(
                                        selectedLoan.dueAmount,
                                    )}
                                />

                                <Info
                                    label="Payment Method"
                                    value={
                                        selectedLoan.paymentMethod
                                    }
                                />

                                <Info
                                    label="Transaction ID"
                                    value={
                                        selectedLoan.transactionId
                                    }
                                />

                                <Info
                                    label="Guarantor ID"
                                    value={
                                        selectedLoan.guarantorMemberId
                                    }
                                />

                                <Info
                                    label="Guarantor Name"
                                    value={
                                        selectedLoan.guarantorName
                                    }
                                />

                            </div>

                            <div className="rounded-2xl border p-5">

                                <h3 className="mb-3 font-bold">
                                    Attachment
                                </h3>

                                <Info
                                    label="Proof File ID"
                                    value={
                                        selectedLoan.proofFileId
                                    }
                                />

                                <Info
                                    label="Proof File Name"
                                    value={
                                        selectedLoan.proofFileName
                                    }
                                />

                            </div>

                            {selectedLoan.description && (
                                <div className="rounded-2xl bg-slate-50 p-5">

                                    <h3 className="font-bold">
                                        Description
                                    </h3>

                                    <p className="mt-2 whitespace-pre-wrap text-slate-600">
                                        {
                                            selectedLoan.description
                                        }
                                    </p>

                                </div>
                            )}

                            {selectedLoan.status ===
                                "rejected" && (
                                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

                                    <h3 className="font-bold text-red-700">
                                        Rejection Details
                                    </h3>

                                    <p className="mt-2 text-red-700">
                                        {
                                            selectedLoan.rejectionReason ||
                                            "কোনো কারণ দেওয়া হয়নি"
                                        }
                                    </p>

                                    <p className="mt-2 text-xs text-red-500">
                                        Rejected By:{" "}
                                        {
                                            selectedLoan.rejectedBy ||
                                            "-"
                                        }
                                    </p>

                                    <p className="text-xs text-red-500">
                                        Rejected At:{" "}
                                        {dateText(
                                            selectedLoan.rejectedAt,
                                        )}
                                    </p>

                                </div>
                            )}

                            <div className="flex flex-wrap justify-end gap-3 border-t pt-5">

                                {selectedLoan.status ===
                                    "pending" && (
                                    <>
                                        <button
                                            disabled={
                                                saving
                                            }
                                            onClick={() => {
                                                setSelectedLoan(
                                                    null,
                                                );

                                                approveLoan(
                                                    selectedLoan,
                                                );
                                            }}
                                            className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white"
                                        >
                                            Approve
                                        </button>

                                        <button
                                            disabled={
                                                saving
                                            }
                                            onClick={() => {
                                                setSelectedLoan(
                                                    null,
                                                );

                                                setRejectLoan(
                                                    selectedLoan,
                                                );
                                            }}
                                            className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white"
                                        >
                                            Reject
                                        </button>
                                    </>
                                )}

                                {selectedLoan.status ===
                                    "approved" && (
                                    <button
                                        onClick={() =>
                                            printReceipt(
                                                selectedLoan,
                                            )
                                        }
                                        className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"
                                    >
                                        {t("Print Receipt")}
                                    </button>
                                )}

                                <button
                                    onClick={() =>
                                        setSelectedLoan(
                                            null,
                                        )
                                    }
                                    className="rounded-xl border px-5 py-3 font-bold"
                                >
                                    Close
                                </button>

                            </div>

                        </div>

                    </div>

                </div>
            )}

            {/* REJECT MODAL */}

            {rejectLoan && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">

                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">

                        <h2 className="text-xl font-extrabold text-red-700">
                            Reject Loan
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            Loan:{" "}
                            <strong>
                                {
                                    rejectLoan.loanId
                                }
                            </strong>
                        </p>

                        <textarea
                            value={
                                rejectionReason
                            }
                            onChange={(e) =>
                                setRejectionReason(
                                    e.target.value,
                                )
                            }
                            rows={5}
                            placeholder={t("Enter rejection reason...")}
                            className="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-red-500"
                        />

                        <div className="mt-5 flex justify-end gap-3">

                            <button
                                onClick={() => {
                                    setRejectLoan(
                                        null,
                                    );

                                    setRejectionReason(
                                        "",
                                    );
                                }}
                                className="rounded-xl border px-5 py-3 font-bold"
                            >
                                Cancel
                            </button>

                            <button
                                disabled={
                                    saving
                                }
                                onClick={
                                    submitReject
                                }
                                className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                            >
                                {saving
                                    ? "Rejecting..."
                                    : "Confirm Reject"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

/* =====================================================
   SMALL COMPONENTS
===================================================== */

function SummaryCard({
    title,
    value,
}: {
    title: string;
    value: string | number;
}) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-xs font-bold uppercase text-slate-500">
                {title}
            </p>

            <p className="mt-2 break-words text-xl font-extrabold text-slate-900">
                {value}
            </p>

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
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                active
                    ? "bg-emerald-700 text-white shadow"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
        >
            {children}
        </button>
    );
}

function SectionTitle({
    children,
}: {
    children: React.ReactNode;
}) {
    const { language } = useLanguage();

    return (
        <div className="border-b pb-2">

            <h3 className="font-extrabold text-emerald-800">
                {typeof children === "string"
                    ? translate(language, children)
                    : children}
            </h3>

        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
}) {
    const { language } = useLanguage();

    return (
        <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
                {translate(language, label)}
            </label>

            <input
                type={type}
                value={value}
                onChange={(e) =>
                    onChange(
                        e.target.value,
                    )
                }
                placeholder={placeholder ? translate(language, placeholder) : undefined}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

        </div>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: any;
}) {
    const { language } = useLanguage();

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

            <p className="text-xs font-semibold text-slate-500">
                {translate(language, label)}
            </p>

            <p className="mt-1 break-words font-bold text-slate-800">
                {value || "-"}
            </p>

        </div>
    );
}