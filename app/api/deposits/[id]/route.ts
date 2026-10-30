// বাংলা: এই API route-এ deposits → id সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import {
    Payment,
    Member,
    CashBook,
} from "@/lib/sheetsModels";
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
    if (typeof value === "number") return value;

    if (value === null || value === undefined) {
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

    if (
        status === "pending" ||
        status === "processing"
    ) {
        return "pending";
    }

    /*
      পুরোনো imported Member Savings data-তে
      Status blank থাকতে পারে।
      সেগুলো historical successful deposit হিসেবে
      approved ধরা হবে।
    */
    return "approved";
}

function formatDate(value: any) {
    if (!value) return "";

    try {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toISOString();
    } catch {
        return String(value);
    }
}

function transformPayment(doc: any) {
    const data = getData(doc);

    const depositId =
        getValue(
            data,
            "DepositID",
            "depositId",
            "PaymentID",
            "paymentId",
            "recordId"
        ) ||
        doc.recordId ||
        String(doc._id);

    const memberId = getValue(
        data,
        "MemberID",
        "memberId",
        "Member Id"
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

    const depositDate =
        getValue(
            data,
            "Payment Date",
            "paymentDate",
            "Deposit Date",
            "depositDate",
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
        ) || "Other";

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

    const status = normalizeStatus(
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
        (status === "approved"
            ? `RCT-${depositId}`
            : "");

    return {
        id: String(doc._id),

        depositId: String(depositId),

        memberId: String(memberId || ""),

        memberName:
            String(memberName || "") ||
            "Unknown Member",

        memberPhone: String(memberPhone || ""),

        amount,

        depositDate: formatDate(depositDate),

        paymentMethod: String(paymentMethod),

        transactionId: String(transactionId || ""),

        description: String(description || ""),

        proofFileId: String(proofFileId || ""),

        proofFileName: String(proofFileName || ""),

        status,

        submittedBy: String(
            getValue(
                data,
                "Submitted By",
                "submittedBy"
            ) || ""
        ),

        approvedBy: String(
            getValue(
                data,
                "Approved By",
                "approvedBy"
            ) || ""
        ),

        approvedAt: formatDate(
            getValue(
                data,
                "Approved At",
                "approvedAt"
            )
        ),

        rejectedBy: String(
            getValue(
                data,
                "Rejected By",
                "rejectedBy"
            ) || ""
        ),

        rejectedAt: formatDate(
            getValue(
                data,
                "Rejected At",
                "rejectedAt"
            )
        ),

        rejectionReason: String(
            getValue(
                data,
                "Rejection Reason",
                "rejectionReason"
            ) || ""
        ),

        receiptId,

        sourceSheet: String(
            doc.sourceSheet || ""
        ),

        createdAt: formatDate(doc.createdAt),

        updatedAt: formatDate(doc.updatedAt),
    };
}

/* =========================================================
   Generate Deposit ID
========================================================= */

async function generateDepositId() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        now.getDate()
    ).padStart(2, "0");

    const prefix = `DEP-${year}${month}${day}-`;

    const docs = await Payment.find({
        sourceSheet: "Deposits",
    })
        .select("recordId data")
        .lean();

    let max = 0;

    for (const doc of docs as any[]) {
        const data = doc.data || {};

        const id =
            data.DepositID ||
            data.depositId ||
            doc.recordId ||
            "";

        const match = String(id).match(
            /-(\d+)$/
        );

        if (match) {
            max = Math.max(
                max,
                Number(match[1])
            );
        }
    }

    return `${prefix}${String(
        max + 1
    ).padStart(3, "0")}`;
}

/* =========================================================
   GET
   Old + New Deposit data from MongoDB
========================================================= */

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET(request: Request) {
    try {
        const auth = await requireRole([
            "admin",
        ]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const { searchParams } =
            new URL(request.url);

        const requestedStatus =
            searchParams.get("status");

        const search =
            searchParams.get("search")?.trim() ||
            "";

        /*
          গুরুত্বপূর্ণ:

          শুধু sourceSheet = Deposits না।

          Member Savings-এর পুরোনো data-ও
          Deposit page-এ দেখানো হবে।
        */

        const docs = await Payment.find({})
            .sort({
                createdAt: -1,
            })
            .lean();

        let deposits = docs.map(
            transformPayment
        );

        /* Search */

        if (search) {
            const q =
                search.toLowerCase();

            deposits = deposits.filter(
                (item) =>
                    item.depositId
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

        /* Status filter */

        if (
            requestedStatus &&
            requestedStatus !== "all"
        ) {
            deposits =
                deposits.filter(
                    (item) =>
                        item.status ===
                        requestedStatus
                );
        }

        /* Summary */

        const allDeposits =
            docs.map(transformPayment);

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
                count: allDeposits.length,
                amount: 0,
            },
        };

        for (const item of allDeposits) {
            const amount =
                Number(item.amount) || 0;

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
            deposits,
            summary,
        });
    } catch (error: any) {
        console.error(
            "GET /api/deposits error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Deposit data load failed",
            },
            {
                status: 500,
            }
        );
    }
}

/* =========================================================
   POST
   New Deposit
========================================================= */

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(request: Request) {
    try {
        const auth = await requireRole([
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

        const amount = toNumber(
            body.amount
        );

        const depositDate =
            body.depositDate ||
            new Date();

        const paymentMethod =
            String(
                body.paymentMethod ||
                    "Other"
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

        /* Find Member */

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

        const depositId =
            await generateDepositId();

        const newPayment =
            await Payment.create({
                sourceSheet:
                    "Deposits",

                recordId:
                    depositId,

                data: {
                    PaymentID:
                        depositId,

                    DepositID:
                        depositId,

                    MemberID:
                        memberId,

                    MemberName:
                        memberName,

                    MemberPhone:
                        memberPhone,

                    "Payment Type":
                        "Deposit",

                    Amount:
                        amount,

                    "Payment Date":
                        depositDate,

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
                    "Deposit সফলভাবে তৈরি হয়েছে",

                deposit:
                    transformPayment(
                        newPayment.toObject()
                    ),
            },
            {
                status: 201,
            }
        );
    } catch (error: any) {
        console.error(
            "POST /api/deposits error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Deposit create failed",
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
export async function PATCH(request: Request) {
    try {
        const auth = await requireRole([
            "admin",
        ]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body =
            await request.json();

        const depositId =
            String(
                body.depositId || ""
            ).trim();

        const action =
            String(
                body.action || ""
            ).trim()
            .toLowerCase();

        const rejectionReason =
            String(
                body.rejectionReason ||
                    ""
            ).trim();

        if (!depositId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Deposit ID প্রয়োজন",
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

        const doc =
            await Payment.findOne({
                sourceSheet:
                    "Deposits",

                $or: [
                    {
                        recordId:
                            depositId,
                    },
                    {
                        "data.DepositID":
                            depositId,
                    },
                    {
                        "data.PaymentID":
                            depositId,
                    },
                ],
            });

        if (!doc) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Deposit পাওয়া যায়নি",
                },
                {
                    status: 404,
                }
            );
        }

        const current =
            transformPayment(
                doc.toObject()
            );

        /* =========================
           APPROVE
        ========================= */

        if (
            action === "approve"
        ) {
            if (
                current.status ===
                "approved"
            ) {
                return NextResponse.json(
                    {
                        success:
                            false,

                        message:
                            "এই Deposit আগে থেকেই Approved",
                    },
                    {
                        status: 400,
                    }
                );
            }

            if (
                current.status ===
                "rejected"
            ) {
                /*
                  Rejected deposit আবার
                  approve করা যাবে।
                */
            }

            const receiptId =
                current.receiptId ||
                `RCT-${depositId}`;

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
                // fallback থাকবে
            }

            const approvedAt =
                new Date();

            doc.data = {
                ...(doc.data || {}),

                Status:
                    "Approved",

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

                "Rejection Reason":
                    "",

                RejectedBy:
                    "",

                "Rejected By":
                    "",

                RejectedAt:
                    "",

                "Payment Type":
                    "Deposit",
            };

            doc.markModified(
                "data"
            );

            await doc.save();

            /* =========================
               CashBook Sync
            ========================= */

            const cashBookExists =
                await CashBook.findOne({
                    sourceSheet:
                        "CashBook",

                    $or: [
                        {
                            recordId:
                                `CB-${depositId}`,
                        },
                        {
                            "data.ReferenceID":
                                depositId,
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
                        item.data || {};

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
                    balance +
                    current.amount;

                await CashBook.create({
                    sourceSheet:
                        "CashBook",

                    recordId:
                        `CB-${depositId}`,

                    data: {
                        EntryID:
                            `CB-${depositId}`,

                        Date:
                            current.depositDate,

                        TransactionID:
                            current.transactionId ||
                            depositId,

                        Type:
                            "Payment",

                        ReferenceID:
                            depositId,

                        Description:
                            `সদস্য ${current.memberName} এর Deposit Approved`,

                        "Money In":
                            current.amount,

                        "Money Out":
                            0,

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
                    "Deposit Approved হয়েছে",

                receiptId,

                deposit:
                    transformPayment(
                        doc.toObject()
                    ),
            });
        }

        /* =========================
           REJECT
        ========================= */

        if (
            action === "reject"
        ) {
            if (!rejectionReason) {
                return NextResponse.json(
                    {
                        success:
                            false,

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
                        success:
                            false,

                        message:
                            "Approved Deposit Reject করা যাবে না",
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
                    "Deposit Reject করা হয়েছে",

                deposit:
                    transformPayment(
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
            "PATCH /api/deposits error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Deposit update failed",
            },
            {
                status: 500,
            }
        );
    }
}