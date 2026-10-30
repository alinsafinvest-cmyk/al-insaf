// বাংলা: এই API route-এ withdrawals সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import {
    Payment,
    Member,
    CashBook,
} from "@/lib/sheetsModels";
import Transaction from "@/models/Transaction";
import User from "@/models/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   Helpers
========================================================= */

function getData(doc: any) {
    return {
        ...(doc?.data || {}),
        ...doc,
    };
}

function getValue(data: any, ...keys: string[]) {
    for (const key of keys) {
        if (
            data?.[key] !== undefined &&
            data?.[key] !== null &&
            String(data[key]).trim() !== ""
        ) {
            return data[key];
        }
    }

    return "";
}

function toNumber(value: any) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    if (typeof value === "number") {
        return Number.isFinite(value)
            ? value
            : 0;
    }

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/[^\d.-]/g, "");

    const number = Number(cleaned);

    return Number.isFinite(number)
        ? number
        : 0;
}

function normalizeStatus(value: any) {
    const status = String(value || "")
        .trim()
        .toLowerCase();

    if (
        status === "approved" ||
        status === "approve" ||
        status === "success" ||
        status === "successful" ||
        status === "paid"
    ) {
        return "approved";
    }

    if (
        status === "rejected" ||
        status === "reject" ||
        status === "failed"
    ) {
        return "rejected";
    }

    return "pending";
}

function formatDate(value: any) {
    if (!value) return "";

    try {
        const date = new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return String(value);
        }

        return date.toISOString();
    } catch {
        return String(value);
    }
}

function transformWithdrawal(doc: any) {
    const data = getData(doc);

    const withdrawalId =
        getValue(
            data,
            "WithdrawalID",
            "withdrawalId",
            "PaymentID",
            "paymentId",
            "recordId"
        ) ||
        doc.recordId ||
        String(doc._id);

    const memberId = getValue(
        data,
        "MemberID",
        "memberId"
    );

    const memberName = getValue(
        data,
        "MemberName",
        "memberName",
        "নাম",
        "Name"
    );

    const memberPhone = getValue(
        data,
        "MemberPhone",
        "memberPhone",
        "WhatsApp",
        "মোবাইল",
        "Mobile"
    );

    const amount = toNumber(
        getValue(
            data,
            "Amount",
            "amount",
            "টাকা",
            "Amount Paid"
        )
    );

    const withdrawalDate =
        getValue(
            data,
            "Withdrawal Date",
            "withdrawalDate",
            "Payment Date",
            "paymentDate",
            "তারিখ",
            "Date"
        ) ||
        doc.createdAt;

    const paymentMethod =
        getValue(
            data,
            "Method",
            "method",
            "Payment Method",
            "paymentMethod"
        ) || "Cash";

    const transactionId =
        getValue(
            data,
            "Transaction ID",
            "transactionId",
            "TransactionID"
        );

    const description =
        getValue(
            data,
            "Description",
            "description",
            "Note",
            "নোট",
            "মন্তব্য"
        );

    const proofFileId =
        getValue(
            data,
            "ProofFileId",
            "proofFileId",
            "AttachmentFileId"
        );

    const proofFileName =
        getValue(
            data,
            "ProofFileName",
            "proofFileName"
        );

    const status =
        normalizeStatus(
            getValue(
                data,
                "Status",
                "status"
            )
        );

    const receiptId =
        getValue(
            data,
            "ReceiptID",
            "receiptId"
        ) ||
        (
            status === "approved"
                ? `WRC-${withdrawalId}`
                : ""
        );

    return {
        id: String(doc._id),

        withdrawalId:
            String(withdrawalId),

        memberId:
            String(memberId || ""),

        memberName:
            String(
                memberName || ""
            ) || "Unknown Member",

        memberPhone:
            String(
                memberPhone || ""
            ),

        amount,

        withdrawalDate:
            formatDate(
                withdrawalDate
            ),

        paymentMethod:
            String(paymentMethod),

        transactionId:
            String(
                transactionId || ""
            ),

        description:
            String(
                description || ""
            ),

        proofFileId:
            String(
                proofFileId || ""
            ),

        proofFileName:
            String(
                proofFileName || ""
            ),

        status,

        submittedBy:
            String(
                getValue(
                    data,
                    "Submitted By",
                    "submittedBy"
                ) || ""
            ),

        approvedBy:
            String(
                getValue(
                    data,
                    "Approved By",
                    "approvedBy"
                ) || ""
            ),

        approvedAt:
            formatDate(
                getValue(
                    data,
                    "Approved At",
                    "approvedAt"
                )
            ),

        rejectedBy:
            String(
                getValue(
                    data,
                    "Rejected By",
                    "rejectedBy"
                ) || ""
            ),

        rejectedAt:
            formatDate(
                getValue(
                    data,
                    "Rejected At",
                    "rejectedAt"
                )
            ),

        rejectionReason:
            String(
                getValue(
                    data,
                    "Rejection Reason",
                    "rejectionReason"
                ) || ""
            ),

        receiptId,

        sourceSheet:
            String(
                doc.sourceSheet || ""
            ),

        createdAt:
            formatDate(
                doc.createdAt
            ),

        updatedAt:
            formatDate(
                doc.updatedAt
            ),
    };
}

/* =========================================================
   Generate Withdrawal ID
========================================================= */

async function generateWithdrawalId() {
    const now = new Date();

    const year =
        now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    const prefix =
        `WDR-${year}${month}${day}-`;

    const docs =
        await Payment.find({
            sourceSheet:
                "Withdrawals",
        })
            .select(
                "recordId data"
            )
            .lean();

    let max = 0;

    for (
        const doc of docs as any[]
    ) {
        const data =
            doc.data || {};

        const id =
            data.WithdrawalID ||
            data.withdrawalId ||
            doc.recordId ||
            "";

        const match =
            String(id).match(
                /-(\d+)$/
            );

        if (match) {
            max = Math.max(
                max,
                Number(match[1])
            );
        }
    }

    return (
        prefix +
        String(max + 1)
            .padStart(3, "0")
    );
}

/* =========================================================
   GET
   All Withdrawal Data
========================================================= */

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET(
    request: Request
) {
    try {
        const auth =
            await requireRole([
                "admin",
            ]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const { searchParams } =
            new URL(request.url);

        const requestedStatus =
            searchParams.get(
                "status"
            );

        const search =
            searchParams
                .get("search")
                ?.trim() || "";

        /*
          শুধু Withdrawals collection/sourceSheet
          থেকে data নেওয়া হচ্ছে।
        */

        const docs =
            await Payment.find({
                sourceSheet:
                    "Withdrawals",
            })
                .sort({
                    createdAt: -1,
                })
                .lean();

        let withdrawals =
            docs.map(
                transformWithdrawal
            );

        const memberRequests = await Transaction.find({
            type: "withdrawal",
        })
            .populate("member", "_id name email memberId phone")
            .sort({ createdAt: -1 })
            .lean();

        const transactionWithdrawals = memberRequests.map((item: any) => {
            const member = item.member || {};
            return {
                id: String(item._id),
                withdrawalId: String(item.transactionId || item._id),
                memberId: String(member.memberId || member._id || ""),
                memberName: String(member.name || ""),
                memberPhone: String(member.phone || ""),
                amount: Number(item.amount || 0),
                withdrawalDate: formatDate(item.date || item.createdAt),
                paymentMethod: String(item.paymentMethod || ""),
                accountNumber: String(item.accountNumber || ""),
                transactionId: "",
                description: String(item.note || ""),
                proofFileId: "",
                proofFileName: "",
                status: String(item.status || "pending").toLowerCase(),
                submittedBy: String(member.name || ""),
                approvedBy: "",
                approvedAt: "",
                rejectedBy: "",
                rejectedAt: "",
                rejectionReason: String(item.rejectionReason || ""),
                receiptId: "",
                sourceSheet: "Member Request",
                createdAt: formatDate(item.createdAt),
                updatedAt: formatDate(item.updatedAt),
            };
        });

        withdrawals = [...withdrawals, ...transactionWithdrawals];

        /* Search */

        if (search) {
            const q =
                search.toLowerCase();

            withdrawals =
                withdrawals.filter(
                    (item) =>
                        item.withdrawalId
                            .toLowerCase()
                            .includes(q) ||

                        item.memberId
                            .toLowerCase()
                            .includes(q) ||

                        item.memberName
                            .toLowerCase()
                            .includes(q) ||

                        item.memberPhone
                            .toLowerCase()
                            .includes(q) ||

                        item.transactionId
                            .toLowerCase()
                            .includes(q)
                );
        }

        /* Status */

        if (
            requestedStatus &&
            requestedStatus !==
                "all"
        ) {
            withdrawals =
                withdrawals.filter(
                    (item) =>
                        item.status ===
                        requestedStatus
                );
        }

        /* Summary */

        const all = [
            ...docs.map(transformWithdrawal),
            ...transactionWithdrawals,
        ];

        const summary = {
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

            total: {
                count: all.length,
                amount: 0,
            },
        };

        for (const item of all) {
            const amount =
                Number(item.amount) ||
                0;

            summary.total.amount +=
                amount;

            if (
                item.status ===
                "pending"
            ) {
                summary.pending.count++;

                summary.pending.amount +=
                    amount;
            }

            if (
                item.status ===
                "approved"
            ) {
                summary.approved.count++;

                summary.approved.amount +=
                    amount;
            }

            if (
                item.status ===
                "rejected"
            ) {
                summary.rejected.count++;

                summary.rejected.amount +=
                    amount;
            }
        }

        return NextResponse.json({
            success: true,

            withdrawals,

            summary,
        });
    } catch (error: any) {
        console.error(
            "GET /api/withdrawals:",
            error
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    error?.message ||
                    "Withdrawal data load failed",
            },
            {
                status: 500,
            }
        );
    }
}

/* =========================================================
   POST
   New Withdrawal
========================================================= */

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(
    request: Request
) {
    try {
        const auth =
            await requireRole([
                "admin",
            ]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body =
            await request.json();

        const memberId =
            String(
                body.memberId || ""
            ).trim();

        const amount =
            toNumber(
                body.amount
            );

        const withdrawalDate =
            body.withdrawalDate ||
            new Date();

        const paymentMethod =
            String(
                body.paymentMethod ||
                    "Cash"
            );

        const transactionId =
            String(
                body.transactionId ||
                    ""
            ).trim();

        const description =
            String(
                body.description ||
                    ""
            ).trim();

        const proofFileId =
            String(
                body.proofFileId ||
                    ""
            ).trim();

        const proofFileName =
            String(
                body.proofFileName ||
                    ""
            ).trim();

        if (!memberId) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Member ID দিন",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            !amount ||
            amount <= 0
        ) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "সঠিক Amount দিন",
                },
                {
                    status: 400,
                }
            );
        }

        /* Member */

        const member =
            await Member.findOne({
                $or: [
                    {
                        recordId:
                            memberId,
                    },

                    {
                        MemberID:
                            memberId,
                    },

                    {
                        "data.MemberID":
                            memberId,
                    },
                ],
            }).lean();

        if (!member) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "এই Member ID পাওয়া যায়নি",
                },
                {
                    status: 404,
                }
            );
        }

        const memberData =
            getData(member);

        const memberName =
            getValue(
                memberData,
                "নাম",
                "Name",
                "MemberName"
            );

        const memberPhone =
            getValue(
                memberData,
                "WhatsApp",
                "অন্য মোবাইল",
                "Mobile",
                "Phone"
            );

        const withdrawalId =
            await generateWithdrawalId();

        const newWithdrawal =
            await Payment.create({
                sourceSheet:
                    "Withdrawals",

                recordId:
                    withdrawalId,

                data: {
                    PaymentID:
                        withdrawalId,

                    WithdrawalID:
                        withdrawalId,

                    MemberID:
                        memberId,

                    MemberName:
                        memberName,

                    MemberPhone:
                        memberPhone,

                    "Payment Type":
                        "Withdrawal",

                    Amount:
                        amount,

                    "Withdrawal Date":
                        withdrawalDate,

                    "Payment Date":
                        withdrawalDate,

                    "Transaction ID":
                        transactionId,

                    Status:
                        "Pending",

                    "Submitted At":
                        new Date(),

                    Method:
                        paymentMethod,

                    Description:
                        description,

                    ProofFileId:
                        proofFileId,

                    ProofFileName:
                        proofFileName,

                    "Approved By":
                        "",

                    "Approved At":
                        "",

                    "Rejected By":
                        "",

                    "Rejected At":
                        "",

                    "Rejection Reason":
                        "",

                    ReceiptID:
                        "",
                },
            });

        return NextResponse.json(
            {
                success: true,

                message:
                    "Withdrawal সফলভাবে তৈরি হয়েছে",

                withdrawal:
                    transformWithdrawal(
                        newWithdrawal.toObject()
                    ),
            },
            {
                status: 201,
            }
        );
    } catch (error: any) {
        console.error(
            "POST /api/withdrawals:",
            error
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    error?.message ||
                    "Withdrawal create failed",
            },
            {
                status: 500,
            }
        );
    }
}

/* =========================================================
   PATCH
   Approve / Reject
========================================================= */

// বাংলা: PATCH অনুরোধে যাচাইকৃত পরিবর্তন বিদ্যমান রেকর্ডে প্রয়োগ করে।
export async function PATCH(
    request: Request
) {
    try {
        const auth =
            await requireRole([
                "admin",
            ]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body =
            await request.json();

        const withdrawalId =
            String(
                body.withdrawalId ||
                    ""
            ).trim();

        const action =
            String(
                body.action || ""
            )
                .trim()
                .toLowerCase();

        const rejectionReason =
            String(
                body.rejectionReason ||
                    ""
            ).trim();

        if (!withdrawalId) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Withdrawal ID প্রয়োজন",
                },
                {
                    status: 400,
                }
            );
        }

        if (
            ![
                "approve",
                "reject",
            ].includes(action)
        ) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Invalid action",
                },
                {
                    status: 400,
                }
            );
        }

        const transactionRequest =
            /^[a-f\d]{24}$/i.test(withdrawalId)
                ? await Transaction.findOne({
                    _id: withdrawalId,
                    type: "withdrawal",
                })
                : null;

        if (transactionRequest) {
            if (transactionRequest.status !== "pending") {
                return NextResponse.json(
                    {
                        success: false,
                        message: "এই অনুরোধটি ইতোমধ্যে প্রক্রিয়া করা হয়েছে",
                    },
                    { status: 409 }
                );
            }

            if (action === "reject" && !rejectionReason) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "প্রত্যাখ্যানের কারণ লিখুন",
                    },
                    { status: 400 }
                );
            }

            const update = action === "approve"
                ? {
                    status: "approved",
                    approvedBy: auth.user!.userId,
                }
                : {
                    status: "rejected",
                    rejectedBy: auth.user!.userId,
                    rejectionReason,
                };
            const result = await Transaction.updateOne(
                { _id: transactionRequest._id, type: "withdrawal", status: "pending" },
                { $set: update }
            );

            if (result.modifiedCount !== 1) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "অনুরোধটি অন্য প্রশাসক প্রক্রিয়া করেছেন; তালিকা রিফ্রেশ করুন",
                    },
                    { status: 409 }
                );
            }

            return NextResponse.json({
                success: true,
                message: action === "approve"
                    ? "Withdrawal approved"
                    : "Withdrawal rejected",
                withdrawal: await Transaction.findById(transactionRequest._id).lean(),
            });
        }

        const doc =
            await Payment.findOne({
                sourceSheet:
                    "Withdrawals",

                $or: [
                    {
                        recordId:
                            withdrawalId,
                    },

                    {
                        "data.WithdrawalID":
                            withdrawalId,
                    },

                    {
                        "data.PaymentID":
                            withdrawalId,
                    },
                ],
            });

        if (!doc) {
            return NextResponse.json(
                {
                    success: false,

                    message:
                        "Withdrawal পাওয়া যায়নি",
                },
                {
                    status: 404,
                }
            );
        }

        const current =
            transformWithdrawal(
                doc.toObject()
            );

        /* =================================================
           APPROVE
        ================================================= */

        if (
            action === "approve"
        ) {
            if (
                current.status ===
                "approved"
            ) {
                return NextResponse.json(
                    {
                        success: false,

                        message:
                            "এই Withdrawal আগে থেকেই Approved",
                    },
                    {
                        status: 400,
                    }
                );
            }

            let adminName =
                auth.user?.userId ||
                "Admin";

            try {
                const admin =
                    await User.findById(
                        auth.user?.userId
                    )
                        .select(
                            "name email"
                        )
                        .lean();

                if (admin) {
                    adminName =
                        admin.name ||
                        admin.email ||
                        adminName;
                }
            } catch {
                // fallback
            }

            const approvedAt =
                new Date();

            const receiptId =
                current.receiptId ||
                `WRC-${withdrawalId}`;

            doc.data = {
                ...(doc.data || {}),

                Status:
                    "Approved",

                "Payment Type":
                    "Withdrawal",

                "Approved By":
                    adminName,

                ApprovedBy:
                    adminName,

                "Approved At":
                    approvedAt,

                ApprovedAt:
                    approvedAt,

                ReceiptID:
                    receiptId,

                ReceiptId:
                    receiptId,

                "Rejected By":
                    "",

                RejectedBy:
                    "",

                "Rejected At":
                    "",

                RejectedAt:
                    "",

                "Rejection Reason":
                    "",
            };

            doc.markModified(
                "data"
            );

            await doc.save();

            /* =================================================
               CashBook - MONEY OUT
            ================================================= */

            const cashBookExists =
                await CashBook.findOne({
                    sourceSheet:
                        "CashBook",

                    $or: [
                        {
                            recordId:
                                `CB-WDR-${withdrawalId}`,
                        },

                        {
                            "data.ReferenceID":
                                withdrawalId,
                        },
                    ],
                });

            if (!cashBookExists) {
                const cashBookDocs =
                    await CashBook.find(
                        {}
                    )
                        .select(
                            "data createdAt"
                        )
                        .lean();

                let balance = 0;

                for (
                    const item of cashBookDocs as any[]
                ) {
                    const data =
                        item.data ||
                        {};

                    const moneyIn =
                        toNumber(
                            getValue(
                                data,
                                "Money In",
                                "moneyIn",
                                "MoneyIn"
                            )
                        );

                    const moneyOut =
                        toNumber(
                            getValue(
                                data,
                                "Money Out",
                                "moneyOut",
                                "MoneyOut"
                            )
                        );

                    balance +=
                        moneyIn -
                        moneyOut;
                }

                const newBalance =
                    balance -
                    current.amount;

                await CashBook.create({
                    sourceSheet:
                        "CashBook",

                    recordId:
                        `CB-WDR-${withdrawalId}`,

                    data: {
                        EntryID:
                            `CB-WDR-${withdrawalId}`,

                        Date:
                            current.withdrawalDate,

                        TransactionID:
                            current.transactionId ||
                            withdrawalId,

                        Type:
                            "Withdrawal",

                        ReferenceID:
                            withdrawalId,

                        Description:
                            `সদস্য ${current.memberName} এর Withdrawal Approved`,

                        "Money In":
                            0,

                        "Money Out":
                            current.amount,

                        Balance:
                            newBalance,

                        "Created By":
                            adminName,

                        "Created At":
                            approvedAt,
                    },
                });
            }

            return NextResponse.json({
                success: true,

                message:
                    "Withdrawal Approved হয়েছে",

                receiptId,

                withdrawal:
                    transformWithdrawal(
                        doc.toObject()
                    ),
            });
        }

        /* =================================================
           REJECT
        ================================================= */

        if (
            action === "reject"
        ) {
            if (
                !rejectionReason
            ) {
                return NextResponse.json(
                    {
                        success: false,

                        message:
                            "Reject করার কারণ দিন",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (
                current.status ===
                "approved"
            ) {
                return NextResponse.json(
                    {
                        success: false,

                        message:
                            "Approved Withdrawal Reject করা যাবে না",
                    },
                    {
                        status: 400,
                    }
                );
            }

            let adminName =
                auth.user?.userId ||
                "Admin";

            try {
                const admin =
                    await User.findById(
                        auth.user?.userId
                    )
                        .select(
                            "name email"
                        )
                        .lean();

                if (admin) {
                    adminName =
                        admin.name ||
                        admin.email ||
                        adminName;
                }
            } catch {
                // fallback
            }

            const rejectedAt =
                new Date();

            doc.data = {
                ...(doc.data || {}),

                Status:
                    "Rejected",

                "Rejected By":
                    adminName,

                RejectedBy:
                    adminName,

                "Rejected At":
                    rejectedAt,

                RejectedAt:
                    rejectedAt,

                "Rejection Reason":
                    rejectionReason,

                "Approved By":
                    "",

                "Approved At":
                    "",

                ReceiptID:
                    "",
            };

            doc.markModified(
                "data"
            );

            await doc.save();

            return NextResponse.json({
                success: true,

                message:
                    "Withdrawal Reject করা হয়েছে",

                withdrawal:
                    transformWithdrawal(
                        doc.toObject()
                    ),
            });
        }

        return NextResponse.json(
            {
                success: false,

                message:
                    "Unknown action",
            },
            {
                status: 400,
            }
        );
    } catch (error: any) {
        console.error(
            "PATCH /api/withdrawals:",
            error
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    error?.message ||
                    "Withdrawal update failed",
            },
            {
                status: 500,
            }
        );
    }
}
