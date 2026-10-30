// বাংলা: এই API route-এ loans সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import {
    Member,
    CashBook,
    Payment,
} from "@/lib/sheetsModels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getData(doc: any) {
    return {
        ...(doc?.data || {}),
        ...(doc || {}),
    };
}

function getValue(data: any, keys: string[], fallback = "") {
    for (const key of keys) {
        const value = data?.[key];

        if (
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        ) {
            return value;
        }
    }

    return fallback;
}

function toNumber(value: any) {
    const n = Number(
        String(value ?? "")
            .replace(/,/g, "")
            .replace(/[৳$]/g, "")
            .trim(),
    );

    return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(value: any) {
    const status = String(value || "")
        .trim()
        .toLowerCase();

    if (status === "approved") return "approved";
    if (status === "rejected") return "rejected";

    return "pending";
}

function isLoanRecord(doc: any) {
    const data = getData(doc);

    const sourceSheet = String(
        doc?.sourceSheet || "",
    )
        .trim()
        .toLowerCase();

    const loanId = getValue(data, [
        "LoanID",
        "loanId",
        "Loan Id",
    ]);

    const type = String(
        getValue(data, [
            "Loan Type",
            "Type",
            "Payment Type",
            "Transaction Type",
        ]),
    )
        .trim()
        .toLowerCase();

    return (
        sourceSheet === "loans" ||
        Boolean(loanId) ||
        type.includes("loan") ||
        type.includes("ঋণ")
    );
}

function formatLoan(doc: any) {
    const data = getData(doc);

    const loanId = getValue(data, [
        "LoanID",
        "loanId",
        "Loan Id",
        "PaymentID",
        "paymentId",
    ], doc?.recordId || String(doc?._id || ""));

    const memberId = getValue(data, [
        "MemberID",
        "memberId",
    ]);

    const memberName = getValue(data, [
        "MemberName",
        "memberName",
        "নাম",
        "Name",
    ]);

    const memberPhone = getValue(data, [
        "MemberPhone",
        "memberPhone",
        "WhatsApp",
        "মোবাইল",
        "Mobile",
        "অন্য মোবাইল",
    ]);

    const amount = toNumber(
        getValue(data, [
            "LoanAmount",
            "loanAmount",
            "Amount",
        ]),
    );

    const durationMonths = toNumber(
        getValue(data, [
            "DurationMonths",
            "durationMonths",
            "Loan Duration",
            "Duration",
        ]),
    );

    const monthlyInstallment = toNumber(
        getValue(data, [
            "MonthlyInstallment",
            "monthlyInstallment",
            "Monthly Installment",
        ]),
    );

    const totalPayableRaw = toNumber(
        getValue(data, [
            "TotalPayable",
            "totalPayable",
            "Total Payable",
        ]),
    );

    const totalPayable =
        totalPayableRaw > 0
            ? totalPayableRaw
            : monthlyInstallment > 0 && durationMonths > 0
                ? monthlyInstallment * durationMonths
                : amount;

    const paidAmount = toNumber(
        getValue(data, [
            "PaidAmount",
            "paidAmount",
            "TotalPaid",
        ]),
    );

    const dueAmount = Math.max(
        0,
        totalPayable - paidAmount,
    );

    return {
        id: String(doc?._id || ""),

        loanId,

        memberId,
        memberName,
        memberPhone,

        amount,

        loanDate: getValue(data, [
            "LoanDate",
            "loanDate",
            "Date",
        ]),

        loanType: getValue(data, [
            "LoanType",
            "loanType",
            "Loan Type",
            "Type",
        ]),

        purpose: getValue(data, [
            "Purpose",
            "purpose",
            "Loan Purpose",
        ]),

        durationMonths,

        monthlyInstallment,

        totalPayable,

        paidAmount,

        dueAmount,

        guarantorMemberId: getValue(data, [
            "GuarantorMemberID",
            "guarantorMemberId",
            "Guarantor ID",
            "জামিনদার MemberID",
        ]),

        guarantorName: getValue(data, [
            "GuarantorName",
            "guarantorName",
            "Guarantor Name",
        ]),

        paymentMethod: getValue(data, [
            "PaymentMethod",
            "paymentMethod",
            "Method",
        ], "Cash"),

        transactionId: getValue(data, [
            "TransactionID",
            "transactionId",
            "Transaction ID",
        ]),

        proofFileId: getValue(data, [
            "ProofFileId",
            "proofFileId",
            "Proof File ID",
        ]),

        proofFileName: getValue(data, [
            "ProofFileName",
            "proofFileName",
            "Proof File Name",
        ]),

        description: getValue(data, [
            "Description",
            "description",
            "Note",
            "নোট",
        ]),

        status: normalizeStatus(
            getValue(data, [
                "Status",
                "status",
            ]),
        ),

        submittedBy: getValue(data, [
            "SubmittedBy",
            "submittedBy",
        ]),

        approvedBy: getValue(data, [
            "ApprovedBy",
            "approvedBy",
            "Approved By",
        ]),

        approvedAt: getValue(data, [
            "ApprovedAt",
            "approvedAt",
            "Approved At",
        ]),

        rejectedBy: getValue(data, [
            "RejectedBy",
            "rejectedBy",
            "Rejected By",
        ]),

        rejectedAt: getValue(data, [
            "RejectedAt",
            "rejectedAt",
            "Rejected At",
        ]),

        rejectionReason: getValue(data, [
            "RejectionReason",
            "rejectionReason",
            "Rejection Reason",
        ]),

        receiptId: getValue(data, [
            "ReceiptID",
            "receiptId",
            "Receipt Id",
        ]),

        createdAt:
            doc?.createdAt ||
            getValue(data, ["CreatedAt", "createdAt"]),

        updatedAt:
            doc?.updatedAt ||
            getValue(data, ["UpdatedAt", "updatedAt"]),
    };
}

function makeLoanId(existing: any[]) {
    const now = new Date();

    const datePart =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0");

    let max = 0;

    for (const item of existing) {
        const loan = formatLoan(item);

        const match = String(loan.loanId).match(
            /^LOAN-(\d{8})-(\d+)$/i,
        );

        if (
            match &&
            match[1] === datePart
        ) {
            max = Math.max(
                max,
                Number(match[2]),
            );
        }
    }

    return `LOAN-${datePart}-${String(
        max + 1,
    ).padStart(3, "0")}`;
}

async function findLoan(loanId: string) {
    const docs = await Payment.find({}).lean();

    return docs.find((doc: any) => {
        if (!isLoanRecord(doc)) return false;

        const loan = formatLoan(doc);

        return String(loan.loanId) === String(loanId);
    });
}

async function calculateCashBalance() {
    const docs = await CashBook.find({}).lean();

    let moneyIn = 0;
    let moneyOut = 0;

    for (const doc of docs) {
        const data = getData(doc);

        moneyIn += toNumber(
            getValue(data, [
                "Money In",
                "MoneyIn",
                "moneyIn",
            ]),
        );

        moneyOut += toNumber(
            getValue(data, [
                "Money Out",
                "MoneyOut",
                "moneyOut",
            ]),
        );
    }

    return {
        moneyIn,
        moneyOut,
        balance: moneyIn - moneyOut,
    };
}

/* =====================================================
   GET
===================================================== */

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const docs = await Payment.find({})
            .sort({ createdAt: -1 })
            .lean();

        const loans = docs
            .filter(isLoanRecord)
            .map(formatLoan)
            .sort((a: any, b: any) => {
                return (
                    new Date(
                        b.createdAt || b.loanDate || 0,
                    ).getTime() -
                    new Date(
                        a.createdAt || a.loanDate || 0,
                    ).getTime()
                );
            });

        const pending = loans.filter(
            (x: any) => x.status === "pending",
        );

        const approved = loans.filter(
            (x: any) => x.status === "approved",
        );

        const rejected = loans.filter(
            (x: any) => x.status === "rejected",
        );

        const totalApprovedAmount =
            approved.reduce(
                (sum: number, item: any) =>
                    sum + item.amount,
                0,
            );

        const totalPendingAmount =
            pending.reduce(
                (sum: number, item: any) =>
                    sum + item.amount,
                0,
            );

        const totalRejectedAmount =
            rejected.reduce(
                (sum: number, item: any) =>
                    sum + item.amount,
                0,
            );

        const totalPaid =
            approved.reduce(
                (sum: number, item: any) =>
                    sum + item.paidAmount,
                0,
            );

        const totalDue =
            approved.reduce(
                (sum: number, item: any) =>
                    sum + item.dueAmount,
                0,
            );

        const cash = await calculateCashBalance();

        return NextResponse.json({
            success: true,

            loans,

            summary: {
                total: loans.length,

                pending: {
                    count: pending.length,
                    amount: totalPendingAmount,
                },

                approved: {
                    count: approved.length,
                    amount: totalApprovedAmount,
                },

                rejected: {
                    count: rejected.length,
                    amount: totalRejectedAmount,
                },

                totalApprovedAmount,

                totalPaid,

                totalDue,

                cashBalance: cash.balance,
            },
        });
    } catch (error: any) {
        console.error("LOANS GET ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Loan data load failed",
            },
            { status: 500 },
        );
    }
}

/* =====================================================
   POST - NEW LOAN
===================================================== */

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(
    request: Request,
) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body = await request.json();

        const memberId = String(
            body.memberId || "",
        ).trim();

        const amount = toNumber(body.amount);

        if (!memberId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Member ID দিন",
                },
                { status: 400 },
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "সঠিক Loan Amount দিন",
                },
                { status: 400 },
            );
        }

        const member = await Member.findOne({
            sourceSheet: "Members",

            $or: [
                { MemberID: memberId },
                { recordId: memberId },
                { "data.MemberID": memberId },
            ],
        }).lean();

        if (!member) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "এই Member ID পাওয়া যায়নি",
                },
                { status: 404 },
            );
        }

        const memberData = getData(member);

        const memberName = getValue(
            memberData,
            [
                "নাম",
                "Name",
                "name",
            ],
        );

        const memberPhone = getValue(
            memberData,
            [
                "WhatsApp",
                "অন্য মোবাইল",
                "Mobile",
                "মোবাইল",
                "phone",
            ],
        );

        const existing = await Payment.find(
            {},
        ).lean();

        const loanId = makeLoanId(
            existing,
        );

        const durationMonths =
            toNumber(
                body.durationMonths,
            );

        const monthlyInstallment =
            toNumber(
                body.monthlyInstallment,
            );

        const totalPayable =
            toNumber(
                body.totalPayable,
            ) ||
            (
                monthlyInstallment > 0 &&
                durationMonths > 0
                    ? monthlyInstallment *
                      durationMonths
                    : amount
            );

        const now = new Date();

        await Payment.create({
            sourceSheet: "Loans",

            recordId: loanId,

            data: {
                LoanID: loanId,

                MemberID: memberId,

                MemberName: memberName,

                MemberPhone: memberPhone,

                LoanAmount: amount,

                LoanDate:
                    body.loanDate ||
                    now.toISOString(),

                LoanType:
                    body.loanType || "",

                Purpose:
                    body.purpose || "",

                DurationMonths:
                    durationMonths,

                MonthlyInstallment:
                    monthlyInstallment,

                TotalPayable:
                    totalPayable,

                PaidAmount: 0,

                DueAmount:
                    totalPayable,

                GuarantorMemberID:
                    body.guarantorMemberId ||
                    "",

                GuarantorName:
                    body.guarantorName ||
                    "",

                PaymentMethod:
                    body.paymentMethod ||
                    "Cash",

                TransactionID:
                    body.transactionId ||
                    "",

                ProofFileId:
                    body.proofFileId ||
                    "",

                ProofFileName:
                    body.proofFileName ||
                    "",

                Description:
                    body.description ||
                    "",

                Status: "Pending",

                SubmittedBy:
                    auth.user?.userId ||
                    "admin",

                ApprovedBy: "",

                ApprovedAt: "",

                RejectedBy: "",

                RejectedAt: "",

                RejectionReason: "",

                ReceiptID: "",

                CreatedAt: now,

                UpdatedAt: now,
            },

            syncedAt: now,
        });

        return NextResponse.json({
            success: true,

            message:
                "Loan সফলভাবে তৈরি হয়েছে এবং Pending অবস্থায় আছে",

            loanId,
        });
    } catch (error: any) {
        console.error("LOAN POST ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Loan create failed",
            },
            { status: 500 },
        );
    }
}

/* =====================================================
   PATCH - APPROVE / REJECT
===================================================== */

// বাংলা: PATCH অনুরোধে যাচাইকৃত পরিবর্তন বিদ্যমান রেকর্ডে প্রয়োগ করে।
export async function PATCH(
    request: Request,
) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body = await request.json();

        const loanId = String(
            body.loanId || "",
        ).trim();

        const action = String(
            body.action || "",
        ).trim().toLowerCase();

        if (!loanId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Loan ID পাওয়া যায়নি",
                },
                { status: 400 },
            );
        }

        if (
            action !== "approve" &&
            action !== "reject"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Invalid action",
                },
                { status: 400 },
            );
        }

        const doc = await findLoan(
            loanId,
        );

        if (!doc) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Loan পাওয়া যায়নি",
                },
                { status: 404 },
            );
        }

        const current = formatLoan(
            doc,
        );

        if (current.status !== "pending") {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "এই Loan আর Pending নেই",
                },
                { status: 400 },
            );
        }

        const now = new Date();

        /* =========================
           REJECT
        ========================= */

        if (action === "reject") {
            const reason = String(
                body.rejectionReason ||
                    "",
            ).trim();

            if (!reason) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Reject করার কারণ দিন",
                    },
                    { status: 400 },
                );
            }

            await Payment.updateOne(
                {
                    _id: doc._id,
                },
                {
                    $set: {
                        "data.Status":
                            "Rejected",

                        "data.RejectedBy":
                            auth.user?.userId ||
                            "admin",

                        "data.RejectedAt":
                            now,

                        "data.RejectionReason":
                            reason,

                        "data.UpdatedAt":
                            now,

                        updatedAt: now,
                    },
                },
            );

            return NextResponse.json({
                success: true,

                message:
                    "Loan Reject করা হয়েছে",
            });
        }

        /* =========================
           APPROVE
        ========================= */

        const receiptId =
            current.receiptId ||
            `LR-${loanId}`;

        await Payment.updateOne(
            {
                _id: doc._id,
            },
            {
                $set: {
                    "data.Status":
                        "Approved",

                    "data.ApprovedBy":
                        auth.user?.userId ||
                        "admin",

                    "data.ApprovedAt":
                        now,

                    "data.ReceiptID":
                        receiptId,

                    "data.UpdatedAt":
                        now,

                    updatedAt: now,
                },
            },
        );

        /* =========================
           CASHBOOK MONEY OUT
        ========================= */

        const existingCashBook =
            await CashBook.findOne({
                $or: [
                    {
                        recordId:
                            `CB-${loanId}`,
                    },

                    {
                        "data.ReferenceID":
                            loanId,
                    },

                    {
                        "data.EntryID":
                            `CB-${loanId}`,
                    },
                ],
            }).lean();

        if (!existingCashBook) {
            const cash =
                await calculateCashBalance();

            const newBalance =
                cash.balance -
                current.amount;

            await CashBook.create({
                sourceSheet:
                    "CashBook",

                recordId:
                    `CB-${loanId}`,

                data: {
                    EntryID:
                        `CB-${loanId}`,

                    Date: now,

                    TransactionID:
                        current.transactionId ||
                        loanId,

                    Type: "Loan",

                    ReferenceID:
                        loanId,

                    Description:
                        `Loan approved - ${current.memberId} - ${current.memberName}`,

                    "Money In": 0,

                    "Money Out":
                        current.amount,

                    Balance:
                        newBalance,

                    "Created By":
                        auth.user?.userId ||
                        "admin",

                    "Created At":
                        now,
                },

                syncedAt: now,
            });
        }

        return NextResponse.json({
            success: true,

            message:
                "Loan Approve হয়েছে এবং CashBook-এ Money Out যোগ হয়েছে",

            receiptId,
        });
    } catch (error: any) {
        console.error(
            "LOAN PATCH ERROR:",
            error,
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Loan update failed",
            },
            { status: 500 },
        );
    }
}