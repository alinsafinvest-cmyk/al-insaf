// বাংলা: এই API route-এ transactions সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import { Payment } from "@/lib/sheetsModels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TransactionType = "deposit" | "withdrawal" | "loan";

function getData(record: any) {
    return {
        ...(record?.data || {}),
        ...(record || {}),
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
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (value === undefined || value === null || value === "") {
        return 0;
    }

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/[^\d.-]/g, "");

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : 0;
}

function normalizeStatus(value: any) {
    const status = String(value || "")
        .trim()
        .toLowerCase();

    if (
        status === "approved" ||
        status === "approve" ||
        status === "success" ||
        status === "successful"
    ) {
        return "approved";
    }

    if (
        status === "rejected" ||
        status === "reject" ||
        status === "failed" ||
        status === "cancelled"
    ) {
        return "rejected";
    }

    if (
        status === "pending" ||
        status === "processing" ||
        status === "submitted"
    ) {
        return "pending";
    }

    // পুরোনো Member Savings data-তে Status blank থাকতে পারে।
    return "approved";
}

function detectTransactionType(
    data: any,
    sourceSheet: string,
): TransactionType | null {
    const source = sourceSheet.toLowerCase();

    if (source === "withdrawals" || source.includes("withdraw")) {
        return "withdrawal";
    }

    if (source === "loans" || source.includes("loan")) {
        return "loan";
    }

    if (
        source === "deposits" ||
        source.includes("deposit") ||
        source === "member savings"
    ) {
        return "deposit";
    }

    const rawType = String(
        getValue(data, [
            "Type",
            "type",
            "Payment Type",
            "paymentType",
            "Transaction Type",
            "transactionType",
        ]),
    ).toLowerCase();

    if (
        rawType.includes("withdraw") ||
        rawType.includes("withdrawal")
    ) {
        return "withdrawal";
    }

    if (rawType.includes("loan")) {
        return "loan";
    }

    if (
        rawType.includes("deposit") ||
        rawType.includes("payment") ||
        rawType.includes("saving") ||
        rawType.includes("savings")
    ) {
        return "deposit";
    }

    // ID দেখে classification
    if (
        getValue(data, ["WithdrawalID", "withdrawalId", "Withdrawal ID"])
    ) {
        return "withdrawal";
    }

    if (getValue(data, ["LoanID", "loanId", "Loan ID"])) {
        return "loan";
    }

    if (
        getValue(data, [
            "DepositID",
            "depositId",
            "Deposit ID",
            "PaymentID",
            "paymentId",
        ])
    ) {
        return "deposit";
    }

    return null;
}

function getTransactionId(
    data: any,
    sourceSheet: string,
    fallback: string,
) {
    return String(
        getValue(
            data,
            [
                "DepositID",
                "depositId",
                "Deposit ID",

                "WithdrawalID",
                "withdrawalId",
                "Withdrawal ID",

                "LoanID",
                "loanId",
                "Loan ID",

                "PaymentID",
                "paymentId",
                "Payment ID",
            ],
            getValue(data, ["recordId"], fallback),
        ),
    );
}

function getDate(data: any, record: any) {
    const value = getValue(data, [
        "DepositDate",
        "depositDate",

        "WithdrawalDate",
        "withdrawalDate",

        "LoanDate",
        "loanDate",

        "Payment Date",
        "PaymentDate",
        "paymentDate",

        "Date",
        "date",

        "Submitted At",
        "SubmittedAt",
        "submittedAt",

        "CreatedAt",
        "createdAt",
    ]);

    if (value) {
        return value;
    }

    if (record?.createdAt) {
        return record.createdAt;
    }

    return null;
}

function formatTransaction(record: any) {
    const data = getData(record);

    const sourceSheet = String(
        getValue(data, ["sourceSheet"], record?.sourceSheet || ""),
    );

    const type = detectTransactionType(data, sourceSheet);

    if (!type) {
        return null;
    }

    const amount = toNumber(
        getValue(data, [
            "Amount",
            "amount",
            "DepositAmount",
            "depositAmount",
            "WithdrawalAmount",
            "withdrawalAmount",
            "LoanAmount",
            "loanAmount",
        ]),
    );

    const transactionId = getTransactionId(
        data,
        sourceSheet,
        String(record?.recordId || ""),
    );

    const memberId = String(
        getValue(data, [
            "MemberID",
            "memberId",
            "Member Id",
        ]),
    );

    const memberName = String(
        getValue(data, [
            "MemberName",
            "memberName",
            "Name",
            "নাম",
        ]),
    );

    const memberPhone = String(
        getValue(data, [
            "MemberPhone",
            "memberPhone",
            "WhatsApp",
            "Mobile",
            "মোবাইল",
        ]),
    );

    const status = normalizeStatus(
        getValue(data, [
            "Status",
            "status",
        ]),
    );

    const paymentMethod = String(
        getValue(data, [
            "PaymentMethod",
            "paymentMethod",
            "Method",
            "method",
        ]),
    );

    const transactionReference = String(
        getValue(data, [
            "TransactionID",
            "transactionId",
            "Transaction ID",
            "ReferenceID",
            "referenceId",
        ]),
    );

    const description = String(
        getValue(data, [
            "Description",
            "description",
            "Note",
            "নোট",
            "Purpose",
            "purpose",
        ]),
    );

    const receiptId = String(
        getValue(data, [
            "ReceiptID",
            "receiptId",
            "Receipt ID",
        ]),
    );

    const rejectionReason = String(
        getValue(data, [
            "RejectionReason",
            "rejectionReason",
            "Rejection Reason",
        ]),
    );

    const approvedBy = String(
        getValue(data, [
            "ApprovedBy",
            "approvedBy",
        ]),
    );

    const approvedAt = getValue(data, [
        "ApprovedAt",
        "approvedAt",
    ]);

    const rejectedBy = String(
        getValue(data, [
            "RejectedBy",
            "rejectedBy",
        ]),
    );

    const rejectedAt = getValue(data, [
        "RejectedAt",
        "rejectedAt",
    ]);

    const date = getDate(data, record);

    const moneyIn =
        type === "deposit" && status === "approved"
            ? amount
            : 0;

    const moneyOut =
        (type === "withdrawal" || type === "loan") &&
        status === "approved"
            ? amount
            : 0;

    return {
        id: String(record?._id || record?.recordId || transactionId),

        transactionId,

        type,

        memberId,
        memberName,
        memberPhone,

        amount,

        date,

        status,

        paymentMethod,

        transactionReference,

        description,

        moneyIn,
        moneyOut,

        receiptId,

        rejectionReason,

        approvedBy,
        approvedAt,

        rejectedBy,
        rejectedAt,

        sourceSheet,

        data,
    };
}

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const records = await Payment.find({})
            .sort({ createdAt: -1 })
            .lean();

        const transactions = records
            .map((record: any) => formatTransaction(record))
            .filter(Boolean);

        const items = transactions as any[];

        const totalCount = items.length;

        const totalAmount = items.reduce(
            (sum, item) => sum + item.amount,
            0,
        );

        const moneyIn = items.reduce(
            (sum, item) => sum + item.moneyIn,
            0,
        );

        const moneyOut = items.reduce(
            (sum, item) => sum + item.moneyOut,
            0,
        );

        const pending = items.filter(
            (item) => item.status === "pending",
        );

        const approved = items.filter(
            (item) => item.status === "approved",
        );

        const rejected = items.filter(
            (item) => item.status === "rejected",
        );

        const deposits = items.filter(
            (item) => item.type === "deposit",
        );

        const withdrawals = items.filter(
            (item) => item.type === "withdrawal",
        );

        const loans = items.filter(
            (item) => item.type === "loan",
        );

        const summary = {
            total: {
                count: totalCount,
                amount: totalAmount,
            },

            moneyIn,

            moneyOut,

            balance: moneyIn - moneyOut,

            pending: {
                count: pending.length,
                amount: pending.reduce(
                    (sum, item) => sum + item.amount,
                    0,
                ),
            },

            approved: {
                count: approved.length,
                amount: approved.reduce(
                    (sum, item) => sum + item.amount,
                    0,
                ),
            },

            rejected: {
                count: rejected.length,
                amount: rejected.reduce(
                    (sum, item) => sum + item.amount,
                    0,
                ),
            },

            byType: {
                deposits: {
                    count: deposits.length,
                    amount: deposits.reduce(
                        (sum, item) => sum + item.amount,
                        0,
                    ),
                },

                withdrawals: {
                    count: withdrawals.length,
                    amount: withdrawals.reduce(
                        (sum, item) => sum + item.amount,
                        0,
                    ),
                },

                loans: {
                    count: loans.length,
                    amount: loans.reduce(
                        (sum, item) => sum + item.amount,
                        0,
                    ),
                },
            },
        };

        return NextResponse.json({
            success: true,
            summary,
            transactions: items,
        });
    } catch (error: any) {
        console.error("Transactions API Error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Transactions data load failed",
            },
            {
                status: 500,
            },
        );
    }
}