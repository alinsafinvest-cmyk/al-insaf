// বাংলা: এই API route-এ admin → member-requests সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import { Member, MemberRequest } from "@/lib/sheetsModels";
import MemberArchive from "@/models/MemberArchive";
import User from "@/models/user";
import type { SheetRecord } from "@/lib/sheet-record";

import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   HELPERS
========================= */

async function generateMemberId() {
    const docs = await Member.find({
        sourceSheet: "Members",
    })
        .select("recordId data MemberID")
        .lean();

    let max = 0;

    for (const doc of docs as SheetRecord[]) {
        const raw =
            doc.MemberID ||
            doc.data?.MemberID ||
            doc.recordId ||
            "";

        const n = Number(
            String(raw).replace(/^M/i, "")
        );

        if (Number.isFinite(n)) {
            max = Math.max(max, n);
        }
    }

    return `M${String(max + 1).padStart(3, "0")}`;
}

/* =========================
   GET REQUESTS
========================= */

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET(
    request: NextRequest
) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const status =
            request.nextUrl.searchParams.get(
                "status"
            ) || "all";

        const filter: Record<string, unknown> = {
            sourceSheet: "Member Requests",
        };

        if (
            status === "pending" ||
            status === "rejected" ||
            status === "approved"
        ) {
            filter.status = status;
        }

        const requests =
            await MemberRequest.find(filter)
                .sort({ createdAt: -1 })
                .lean();

        return NextResponse.json({
            success: true,

            requests: requests.map(
                (item: SheetRecord) => ({
                    requestId:
                        item.requestId ||
                        item.recordId,

                    status:
                        item.status ||
                        "pending",

                    data:
                        item.data || {},

                    createdAt:
                        item.createdAt,

                    updatedAt:
                        item.updatedAt,

                    rejectedAt:
                        item.rejectedAt,

                    rejectedBy:
                        item.rejectedBy,

                    approvedAt:
                        item.approvedAt,

                    approvedBy:
                        item.approvedBy,
                })
            ),
        });

    } catch (error) {
        console.error(
            "GET MEMBER REQUEST ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    (error instanceof Error ? error.message : "") ||
                    "Request পাওয়া যায়নি",
            },
            { status: 500 }
        );
    }
}

/* =========================
   CREATE REQUEST
========================= */

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(
    request: NextRequest
) {
    try {
        await connectDB();

        const body = await request.json();

        const requestId =
            `REQ-${Date.now()}`;

        const data = {
            name:
                body.name || "",

            whatsapp:
                body.whatsapp || "",

            mobile:
                body.mobile || "",

            email:
                body.email || "",

            address:
                body.address || "",

            nid:
                body.nid || "",

            joinDate:
                body.joinDate || "",

            shares:
                Number(body.shares || 0),

            monthlyDeposit:
                Number(
                    body.monthlyDeposit || 0
                ),

            nomineeName:
                body.nomineeName || "",

            nomineeMobile:
                body.nomineeMobile || "",

            nomineeRelation:
                body.nomineeRelation || "",

            nomineeNid:
                body.nomineeNid || "",

            photoFileId:
                body.photoFileId || "",

            nidFrontFileId:
                body.nidFrontFileId || "",

            nidBackFileId:
                body.nidBackFileId || "",

            nomineePhotoFileId:
                body.nomineePhotoFileId || "",

            nomineeNidFileId:
                body.nomineeNidFileId || "",

            note:
                body.note || "",
        };

        if (!data.name.trim()) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "সদস্যের নাম দিন",
                },
                { status: 400 }
            );
        }

        const created =
            await MemberRequest.create({
                sourceSheet:
                    "Member Requests",

                recordId:
                    requestId,

                requestId,

                status: "pending",

                data,

                requestedBy:
                    body.requestedBy ||
                    "member",

                syncedAt:
                    new Date(),
            });

        return NextResponse.json({
            success: true,

            message:
                "সদস্য আবেদন সফলভাবে জমা হয়েছে",

            requestId:
                created.requestId,
        });

    } catch (error) {
        console.error(
            "CREATE MEMBER REQUEST ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    (error instanceof Error ? error.message : "") ||
                    "Request জমা দেওয়া যায়নি",
            },
            { status: 500 }
        );
    }
}

/* =========================
   APPROVE / REJECT
========================= */

// বাংলা: PUT অনুরোধে যাচাইকৃত তথ্য দিয়ে বিদ্যমান রেকর্ড হালনাগাদ করে।
export async function PUT(
    request: NextRequest
) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body = await request.json();

        const requestId =
            String(
                body.requestId || ""
            ).trim();

        const action =
            String(
                body.action || ""
            ).trim();

        if (!requestId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Request ID পাওয়া যায়নি",
                },
                { status: 400 }
            );
        }

        const memberRequest =
            await MemberRequest.findOne({
                sourceSheet:
                    "Member Requests",

                recordId:
                    requestId,
            });

        if (!memberRequest) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Request পাওয়া যায়নি",
                },
                { status: 404 }
            );
        }

        const currentStatus =
            memberRequest.status ||
            "pending";

        /* =========================
           REJECT
        ========================= */

        if (action === "reject") {
            if (
                currentStatus ===
                "approved"
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "Approved request reject করা যাবে না",
                    },
                    { status: 400 }
                );
            }

            const rejected = await MemberRequest.findOneAndUpdate(
                {
                    _id: memberRequest._id,
                    sourceSheet: "Member Requests",
                    status: currentStatus,
                },
                {
                    $set: {
                        status: "rejected",
                        rejectedAt: new Date(),
                        rejectedBy: auth.user?.userId || "admin",
                        rejectionReason: body.reason || "",
                    },
                },
                { new: true }
            );

            if (!rejected) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "আবেদনটি ইতিমধ্যে অন্য admin পরিবর্তন করেছেন; তালিকা রিফ্রেশ করুন",
                    },
                    { status: 409 }
                );
            }

            return NextResponse.json({
                success: true,
                message:
                    "আবেদনটি প্রত্যাখ্যান করা হয়েছে এবং Failed Requests-এ সরানো হয়েছে",
            });
        }

        /* =========================
           APPROVE
        ========================= */

        if (action === "approve") {
            if (
                currentStatus ===
                "approved"
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "এই request ইতিমধ্যে approved হয়েছে",
                    },
                    { status: 409 }
                );
            }

            const data =
                memberRequest.data ||
                {};

            const memberId =
                await generateMemberId();

            const name =
                String(
                    data.name || ""
                ).trim();

            const email =
                String(
                    data.email || ""
                )
                    .trim()
                    .toLowerCase();

            const loginEmail =
                email ||
                `${memberId.toLowerCase()}@member.local`;

            const existingUser =
                await User.findOne({
                    $or: [
                        { email: loginEmail },
                        { memberId },
                    ],
                });

            const archivedAccount = await MemberArchive.exists({
                expiresAt: { $gt: new Date() },
                $or: [
                    { memberId },
                    { "snapshot.account.email": loginEmail },
                ],
            });

            if (existingUser || archivedAccount) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "এই MemberID বা email দিয়ে User আগে থেকেই আছে",
                    },
                    { status: 409 }
                );
            }

            const password =
                String(
                    data.password ||
                    body.password ||
                    ""
                ).trim() ||
                memberId;

            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );

            const memberData = {
                MemberID: memberId,

                "নাম": name,

                "WhatsApp":
                    data.whatsapp || "",

                "অন্য মোবাইল":
                    data.mobile || "",

                "Gmail":
                    data.email || "",

                "ঠিকানা":
                    data.address || "",

                "NID নম্বর":
                    data.nid || "",

                "যোগদানের তারিখ":
                    data.joinDate || "",

                "Status":
                    "Active",

                "অংশ সংখ্যা":
                    Number(
                        data.shares || 0
                    ),

                "মাসিক জমা":
                    Number(
                        data.monthlyDeposit ||
                        0
                    ),

                "Nominee নাম":
                    data.nomineeName || "",

                "Nominee মোবাইল":
                    data.nomineeMobile || "",

                "Nominee সম্পর্ক":
                    data.nomineeRelation ||
                    "",

                "Nominee NID":
                    data.nomineeNid || "",

                "নোট":
                    data.note || "",

                "LoginStatus":
                    "Active",

                "ছবি File ID":
                    data.photoFileId || "",

                "NID Front File ID":
                    data.nidFrontFileId ||
                    "",

                "NID Back File ID":
                    data.nidBackFileId ||
                    "",

                "Nominee ছবি File ID":
                    data.nomineePhotoFileId ||
                    "",

                "Nominee NID File ID":
                    data.nomineeNidFileId ||
                    "",
            };

            /*
             * Member তৈরি
             */

            let createdMember = false;
            let createdUser = false;
            try {
                await Member.create({
                    sourceSheet: "Members",
                    recordId: memberId,
                    data: memberData,
                    ...memberData,
                    syncedAt: new Date(),
                });
                createdMember = true;

                await User.create({
                    name,
                    email: loginEmail,
                    password: hashedPassword,
                    role: "member",
                    memberId,
                    phone: data.whatsapp || data.mobile || "",
                    isActive: true,
                });
                createdUser = true;

                const approved = await MemberRequest.findOneAndUpdate(
                    {
                        _id: memberRequest._id,
                        sourceSheet: "Member Requests",
                        status: currentStatus,
                    },
                    {
                        $set: {
                            status: "approved",
                            approvedAt: new Date(),
                            approvedBy: auth.user?.userId || "admin",
                            approvedMemberId: memberId,
                        },
                    },
                    { new: true }
                );

                if (!approved) {
                    throw new Error(
                        "আবেদনটি ইতিমধ্যে অন্য admin পরিবর্তন করেছেন"
                    );
                }
            } catch (error) {
                const rollbackErrors: unknown[] = [];

                if (createdUser) {
                    try {
                        await User.deleteOne({ memberId, email: loginEmail });
                    } catch (rollbackError) {
                        rollbackErrors.push(rollbackError);
                    }
                }

                if (createdMember) {
                    try {
                        await Member.deleteOne({
                            sourceSheet: "Members",
                            recordId: memberId,
                        });
                    } catch (rollbackError) {
                        rollbackErrors.push(rollbackError);
                    }
                }

                for (const rollbackError of rollbackErrors) {
                    console.error(
                        "MEMBER REQUEST APPROVAL ROLLBACK ERROR:",
                        rollbackError
                    );
                }

                throw error;
            }

            return NextResponse.json({
                success: true,

                message:
                    "Member request approved হয়েছে",

                memberId,

                requestId,
            });
        }

        return NextResponse.json(
            {
                success: false,
                message:
                    "Invalid action",
            },
            { status: 400 }
        );

    } catch (error) {
        console.error(
            "MEMBER REQUEST ACTION ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error &&
                    (error.message.includes("duplicate key") ||
                        ("code" in error && error.code === 11000))
                        ? "এই email বা Member ID দিয়ে account আগে থেকেই আছে"
                        : (error instanceof Error ? error.message : "") ||
                          "Request update করা যায়নি",
            },
            {
                status:
                    error instanceof Error &&
                    (error.message.includes("duplicate key") ||
                        ("code" in error && error.code === 11000))
                        ? 409
                        : 500,
            }
        );
    }
}