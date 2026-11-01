// বাংলা: এই API route-এ admin → members সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import {
    CashBook,
    Member,
    MemberRequest,
    Payment,
} from "@/lib/sheetsModels";
import Deposit from "@/models/Deposit";
import MemberArchive from "@/models/MemberArchive";
import Transaction from "@/models/Transaction";
import User from "@/models/user";
import type { SheetRecord } from "@/lib/sheet-record";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================
   HELPERS
========================= */

function getMemberData(doc: SheetRecord): SheetRecord {
    const root = doc?.toObject
        ? doc.toObject()
        : { ...doc };

    return {
        ...(root.data || {}),
        ...root,
    };
}

function cleanMember(member: SheetRecord) {
    const data = getMemberData(member);

    // Password কখনো frontend-এ পাঠাবো না
    delete data.password;
    delete data.Password;

    return {
        ...data,

        memberId:
            data.MemberID ||
            data.memberId ||
            data.recordId ||
            "",

        name:
            data["নাম"] ||
            data.name ||
            "",

        whatsapp:
            data["WhatsApp"] ||
            data.whatsapp ||
            "",

        mobile:
            data["অন্য মোবাইল"] ||
            data.mobile ||
            "",

        email:
            data["Gmail"] ||
            data.email ||
            "",

        address:
            data["ঠিকানা"] ||
            data.address ||
            "",

        nid:
            data["NID নম্বর"] ||
            data.nid ||
            "",

        joinDate:
            data["যোগদানের তারিখ"] ||
            data.joinDate ||
            "",

        status:
            data["Status"] ||
            data.status ||
            "Active",

        shares:
            data["অংশ সংখ্যা"] ??
            data.shares ??
            0,

        monthlyDeposit:
            data["মাসিক জমা"] ??
            data.monthlyDeposit ??
            0,

        nomineeName:
            data["Nominee নাম"] ||
            data.nomineeName ||
            "",

        nomineeMobile:
            data["Nominee মোবাইল"] ||
            data.nomineeMobile ||
            "",

        nomineeRelation:
            data["Nominee সম্পর্ক"] ||
            data.nomineeRelation ||
            "",

        nomineeNid:
            data["Nominee NID"] ||
            data.nomineeNid ||
            "",

        note:
            data["নোট"] ||
            data.note ||
            "",

        loginStatus:
            data["LoginStatus"] ||
            data.loginStatus ||
            "Active",

        photoFileId:
            data["ছবি File ID"] ||
            data.photoFileId ||
            "",

        nidFrontFileId:
            data["NID Front File ID"] ||
            data.nidFrontFileId ||
            "",

        nidBackFileId:
            data["NID Back File ID"] ||
            data.nidBackFileId ||
            "",

        nomineePhotoFileId:
            data["Nominee ছবি File ID"] ||
            data.nomineePhotoFileId ||
            "",

        nomineeNidFileId:
            data["Nominee NID File ID"] ||
            data.nomineeNidFileId ||
            "",

        photoUrl:
            data["ছবি URL"] ||
            data.photoUrl ||
            "",
    };
}

/* =========================
   MEMBER ID
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

        const number = Number(
            String(raw).replace(/^M/i, "")
        );

        if (Number.isFinite(number)) {
            max = Math.max(max, number);
        }
    }

    const archivedMembers = await MemberArchive.find({
        expiresAt: { $gt: new Date() },
    })
        .select("memberId")
        .lean();

    for (const archive of archivedMembers) {
        const number = Number(
            String(archive.memberId).replace(/^M/i, "")
        );
        if (Number.isFinite(number)) {
            max = Math.max(max, number);
        }
    }

    return `M${String(max + 1).padStart(3, "0")}`;
}

/* =========================
   GET MEMBERS
========================= */

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const members = await Member.find({
            sourceSheet: "Members",
        })
            .sort({ createdAt: -1 })
            .lean();

        const cleanedMembers = members.map(cleanMember);
        const accounts = await User.find({
            role: "member",
            memberId: {
                $in: cleanedMembers.map((member) =>
                    String(member.memberId)
                ),
            },
        })
            .select("name email memberId phone whatsapp address photoUrl preferredLanguage notificationPreferences")
            .lean();
        const accountsByMemberId = new Map(
            accounts.map((account) => [
                String(account.memberId),
                account,
            ])
        );

        return NextResponse.json({
            success: true,
            members: cleanedMembers.map((member) => {
                const account = accountsByMemberId.get(
                    String(member.memberId)
                );
                const accountEmail =
                    account?.email &&
                    !account.email.endsWith("@member.local")
                        ? account.email
                        : "";

                return {
                    ...member,
                    name: account?.name || member.name,
                    email: accountEmail || member.email,
                    whatsapp:
                        account?.whatsapp ||
                        account?.phone ||
                        member.whatsapp,
                    address: account?.address || member.address,
                    photoUrl: account?.photoUrl || member.photoUrl,
                    preferredLanguage:
                        account?.preferredLanguage || "bn",
                    notificationPreferences:
                        account?.notificationPreferences || {
                            emailUpdates: true,
                            transactionUpdates: true,
                            announcements: true,
                        },
                };
            }),
        });

    } catch (error) {
        console.error("GET MEMBERS ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    (error instanceof Error ? error.message : "") ||
                    "সদস্যদের তথ্য পাওয়া যায়নি",
            },
            { status: 500 }
        );
    }
}

/* =========================
   CREATE MEMBER
========================= */

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(
    request: NextRequest
) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body = await request.json();

        const memberId = await generateMemberId();

        const name = String(
            body.name || ""
        ).trim();

        if (!name) {
            return NextResponse.json(
                {
                    success: false,
                    message: "সদস্যের নাম দিন",
                },
                { status: 400 }
            );
        }

        const email =
            String(body.email || "")
                .trim()
                .toLowerCase();

        /*
         * Email না থাকলেও member login কাজ করবে।
         * User model-এর email required হওয়ায় internal email তৈরি করছি।
         */
        const loginEmail =
            email ||
            `${memberId.toLowerCase()}@member.local`;

        const existingEmail = await User.findOne({
            email: loginEmail,
        });

        const archivedEmail = await MemberArchive.exists({
            expiresAt: { $gt: new Date() },
            "snapshot.account.email": loginEmail,
        });

        if (existingEmail || archivedEmail) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "এই email দিয়ে user আগে থেকেই আছে",
                },
                { status: 409 }
            );
        }

        const plainPassword =
            String(body.password || "").trim() ||
            memberId;

        const hashedPassword =
            await bcrypt.hash(
                plainPassword,
                12
            );

        const memberData = {
            MemberID: memberId,

            "নাম": name,

            "WhatsApp":
                body.whatsapp || "",

            "অন্য মোবাইল":
                body.mobile || "",

            "Gmail":
                body.email || "",

            "ঠিকানা":
                body.address || "",

            "NID নম্বর":
                body.nid || "",

            "যোগদানের তারিখ":
                body.joinDate || "",

            "Status":
                body.status || "Active",

            "অংশ সংখ্যা":
                Number(body.shares || 0),

            "মাসিক জমা":
                Number(body.monthlyDeposit || 0),

            "Nominee নাম":
                body.nomineeName || "",

            "Nominee মোবাইল":
                body.nomineeMobile || "",

            "Nominee সম্পর্ক":
                body.nomineeRelation || "",

            "Nominee NID":
                body.nomineeNid || "",

            "নোট":
                body.note || "",

            "LoginStatus":
                body.loginStatus || "Active",

            "ছবি File ID":
                body.photoFileId || "",

            "NID Front File ID":
                body.nidFrontFileId || "",

            "NID Back File ID":
                body.nidBackFileId || "",

            "Nominee ছবি File ID":
                body.nomineePhotoFileId || "",

            "Nominee NID File ID":
                body.nomineeNidFileId || "",
        };

        await Member.create({
            sourceSheet: "Members",
            recordId: memberId,
            data: memberData,

            // Existing imported members-এর সাথে
            // compatibility রাখার জন্য root-এও রাখা হচ্ছে.
            ...memberData,

            syncedAt: new Date(),
        });

        await User.create({
            name,
            email: loginEmail,
            password: hashedPassword,

            role: "member",

            memberId,

            phone:
                body.whatsapp ||
                body.mobile ||
                "",

            whatsapp: body.whatsapp || "",
            address: body.address || "",
            preferredLanguage:
                body.preferredLanguage === "en" ? "en" : "bn",
            notificationPreferences: {
                emailUpdates:
                    body.notificationPreferences?.emailUpdates !== false,
                transactionUpdates:
                    body.notificationPreferences?.transactionUpdates !== false,
                announcements:
                    body.notificationPreferences?.announcements !== false,
            },

            isActive:
                body.status === "Active" &&
                body.loginStatus !== "Blocked" &&
                body.loginStatus !== "Disabled",
        });

        return NextResponse.json({
            success: true,
            message: "সদস্য সফলভাবে যোগ হয়েছে",
            memberId,
        });

    } catch (error) {
        console.error(
            "CREATE MEMBER ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    (error instanceof Error ? error.message : "") ||
                    "সদস্য যোগ করা যায়নি",
            },
            { status: 500 }
        );
    }
}

/* =========================
   UPDATE MEMBER
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

        const memberId = String(
            body.memberId || ""
        ).trim();

        if (!memberId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "MemberID পাওয়া যায়নি",
                },
                { status: 400 }
            );
        }

        const member = await Member.findOne({
            sourceSheet: "Members",
            $or: [
                { recordId: memberId },
                { MemberID: memberId },
                { memberId },
                { "data.MemberID": memberId },
                { "data.Member ID": memberId },
                { "data.memberId": memberId },
            ],
        });

        if (!member) {
            return NextResponse.json(
                {
                    success: false,
                    message: "সদস্য পাওয়া যায়নি",
                },
                { status: 404 }
            );
        }

        const oldData = getMemberData(member);
        const user = await User.findOne({
            role: "member",
            memberId,
        }).select("+password");
        const email = String(
            body.email ?? oldData["Gmail"] ?? ""
        )
            .trim()
            .toLowerCase();
        const loginEmail =
            email || `${memberId.toLowerCase()}@member.local`;
        const emailOwner = await User.findOne({
            role: "member",
            email: loginEmail,
        }).select("_id");
        const archivedEmailOwner = await MemberArchive.exists({
            memberId: { $ne: memberId },
            expiresAt: { $gt: new Date() },
            "snapshot.account.email": loginEmail,
        });

        if (
            archivedEmailOwner ||
            emailOwner &&
            String(emailOwner._id) !== String(user?._id || "")
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "এই email অন্য সদস্য ব্যবহার করছেন",
                },
                { status: 409 }
            );
        }

        const newData = {
            ...oldData,

            MemberID: memberId,

            "নাম":
                body.name ??
                oldData["নাম"] ??
                "",

            "WhatsApp":
                body.whatsapp ??
                oldData["WhatsApp"] ??
                "",

            "অন্য মোবাইল":
                body.mobile ??
                oldData["অন্য মোবাইল"] ??
                "",

            "Gmail":
                body.email ??
                oldData["Gmail"] ??
                "",

            "ঠিকানা":
                body.address ??
                oldData["ঠিকানা"] ??
                "",

            "NID নম্বর":
                body.nid ??
                oldData["NID নম্বর"] ??
                "",

            "যোগদানের তারিখ":
                body.joinDate ??
                oldData["যোগদানের তারিখ"] ??
                "",

            "Status":
                body.status ??
                oldData["Status"] ??
                "Active",

            "অংশ সংখ্যা":
                Number(
                    body.shares ??
                    oldData["অংশ সংখ্যা"] ??
                    0
                ),

            "মাসিক জমা":
                Number(
                    body.monthlyDeposit ??
                    oldData["মাসিক জমা"] ??
                    0
                ),

            "Nominee নাম":
                body.nomineeName ??
                oldData["Nominee নাম"] ??
                "",

            "Nominee মোবাইল":
                body.nomineeMobile ??
                oldData["Nominee মোবাইল"] ??
                "",

            "Nominee সম্পর্ক":
                body.nomineeRelation ??
                oldData["Nominee সম্পর্ক"] ??
                "",

            "Nominee NID":
                body.nomineeNid ??
                oldData["Nominee NID"] ??
                "",

            "নোট":
                body.note ??
                oldData["নোট"] ??
                "",

            "LoginStatus":
                body.loginStatus ??
                oldData["LoginStatus"] ??
                "Active",

            "ছবি File ID":
                body.photoFileId ??
                oldData["ছবি File ID"] ??
                "",

            "NID Front File ID":
                body.nidFrontFileId ??
                oldData["NID Front File ID"] ??
                "",

            "NID Back File ID":
                body.nidBackFileId ??
                oldData["NID Back File ID"] ??
                "",

            "Nominee ছবি File ID":
                body.nomineePhotoFileId ??
                oldData["Nominee ছবি File ID"] ??
                "",

            "Nominee NID File ID":
                body.nomineeNidFileId ??
                oldData["Nominee NID File ID"] ??
                "",
        };

        /*
         * Root fields + data দুই জায়গাতেই রাখা হচ্ছে,
         * কারণ তোমার imported Members data root-level-এ আছে।
         */
        member.data = newData;

        for (const [key, value] of Object.entries(
            newData
        )) {
            member.set(key, value);
        }

        await member.save();

        /* =========================
           UPDATE LOGIN
        ========================= */

        if (user) {
            user.name =
                body.name ??
                oldData["নাম"] ??
                user.name;

            user.email = loginEmail;

            user.phone =
                body.whatsapp ??
                body.mobile ??
                user.phone ??
                "";

            user.whatsapp =
                body.whatsapp ??
                user.whatsapp ??
                "";

            user.address =
                body.address ??
                user.address ??
                "";

            if (
                body.preferredLanguage === "bn" ||
                body.preferredLanguage === "en"
            ) {
                user.preferredLanguage =
                    body.preferredLanguage;
            }

            if (
                body.notificationPreferences &&
                typeof body.notificationPreferences === "object"
            ) {
                const preferences =
                    body.notificationPreferences;
                user.notificationPreferences = {
                    emailUpdates:
                        typeof preferences.emailUpdates === "boolean"
                            ? preferences.emailUpdates
                            : user.notificationPreferences?.emailUpdates ?? true,
                    transactionUpdates:
                        typeof preferences.transactionUpdates === "boolean"
                            ? preferences.transactionUpdates
                            : user.notificationPreferences?.transactionUpdates ?? true,
                    announcements:
                        typeof preferences.announcements === "boolean"
                            ? preferences.announcements
                            : user.notificationPreferences?.announcements ?? true,
                };
            }

            user.isActive =
                (body.status ??
                    oldData["Status"] ??
                    "Active") === "Active" &&
                (body.loginStatus ??
                    oldData["LoginStatus"] ??
                    "Active") === "Active";

            if (
                body.password &&
                String(body.password).trim()
            ) {
                user.password =
                    await bcrypt.hash(
                        String(body.password).trim(),
                        12
                    );
            }

            await user.save();

        } else {
            /*
             * কোনো কারণে User নেই হলে login আবার তৈরি হবে।
             */
            const password =
                String(
                    body.password || ""
                ).trim() || memberId;

            await User.create({
                name:
                    body.name ||
                    oldData["নাম"] ||
                    "",

                email: loginEmail,

                password:
                    await bcrypt.hash(
                        password,
                        12
                    ),

                role: "member",

                memberId,

                phone:
                    body.whatsapp ||
                    body.mobile ||
                    "",

                whatsapp: body.whatsapp || "",
                address: body.address || "",
                preferredLanguage:
                    body.preferredLanguage === "en" ? "en" : "bn",
                notificationPreferences: {
                    emailUpdates:
                        body.notificationPreferences?.emailUpdates !== false,
                    transactionUpdates:
                        body.notificationPreferences?.transactionUpdates !== false,
                    announcements:
                        body.notificationPreferences?.announcements !== false,
                },

                isActive:
                    (body.status ||
                        oldData["Status"] ||
                        "Active") === "Active",
            });
        }

        return NextResponse.json({
            success: true,
            message:
                "সদস্যের তথ্য সফলভাবে আপডেট হয়েছে",
            memberId,
        });

    } catch (error) {
        console.error(
            "UPDATE MEMBER ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    (error instanceof Error ? error.message : "") ||
                    "সদস্য আপডেট করা যায়নি",
            },
            { status: 500 }
        );
    }
}

/* =========================
   ARCHIVE MEMBER
========================= */

export async function DELETE(request: NextRequest) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        const body = await request.json();
        const memberId = String(body.memberId || "").trim();
        const confirmMemberId = String(
            body.confirmMemberId || ""
        ).trim();

        if (!memberId || confirmMemberId !== memberId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "সদস্যের Member ID নিশ্চিত করুন",
                },
                { status: 400 }
            );
        }

        await connectDB();

        await MemberArchive.createIndexes();
        const session = await mongoose.startSession();
        let archived = false;

        try {
            await session.withTransaction(async () => {
                const member = await Member.findOne({
                    sourceSheet: "Members",
                    $or: [
                        { recordId: memberId },
                        { MemberID: memberId },
                        { "Member ID": memberId },
                        { memberId },
                        { "data.MemberID": memberId },
                        { "data.Member ID": memberId },
                        { "data.memberId": memberId },
                    ],
                }).session(session);

                const account = await User.findOne({
                    role: "member",
                    memberId,
                })
                    .select("_id")
                    .session(session);

                if (!member && !account) {
                    return;
                }

                const linkedSheetRecord = {
                    $or: [
                        { MemberID: memberId },
                        { "Member ID": memberId },
                        { memberId },
                        { "data.MemberID": memberId },
                        { "data.Member ID": memberId },
                        { "data.memberId": memberId },
                    ],
                };

                const transactions = account
                    ? await Transaction.find({
                          member: account._id,
                      })
                          .session(session)
                          .lean()
                    : [];
                const deposits = await Deposit.find({ memberId })
                    .session(session)
                    .lean();
                const payments = await Payment.find(linkedSheetRecord)
                    .session(session)
                    .lean();
                const cashBooks = await CashBook.find(linkedSheetRecord)
                    .session(session)
                    .lean();
                const memberRequests = await MemberRequest.find({
                    sourceSheet: "Member Requests",
                    approvedMemberId: memberId,
                })
                    .session(session)
                    .lean();
                const fullAccount = account
                    ? await User.findById(account._id)
                          .select("+password")
                          .session(session)
                          .lean()
                    : null;

                const archivedAt = new Date();
                const expiresAt = new Date(archivedAt);
                expiresAt.setDate(expiresAt.getDate() + 30);

                await MemberArchive.create(
                    [
                        {
                            memberId,
                            name:
                                String(
                                    fullAccount?.name ||
                                        member?.name ||
                                        member?.["নাম"] ||
                                        member?.data?.["নাম"] ||
                                        "Member"
                                ),
                            archivedAt,
                            expiresAt,
                            snapshot: {
                                member: member
                                    ? member.toObject()
                                    : null,
                                account: fullAccount,
                                transactions,
                                deposits,
                                payments,
                                cashBooks,
                                memberRequests,
                            },
                        },
                    ],
                    { session }
                );

                if (account) {
                    await Transaction.deleteMany(
                        { member: account._id },
                        { session }
                    );
                }

                await Deposit.deleteMany(
                    { memberId },
                    { session }
                );
                await Payment.deleteMany(
                    linkedSheetRecord,
                    { session }
                );
                await CashBook.deleteMany(
                    linkedSheetRecord,
                    { session }
                );
                await MemberRequest.deleteMany(
                    {
                        sourceSheet: "Member Requests",
                        approvedMemberId: memberId,
                    },
                    { session }
                );

                if (member) {
                    await Member.deleteOne(
                        { _id: member._id },
                        { session }
                    );
                }

                if (account) {
                    await User.deleteOne(
                        {
                            _id: account._id,
                            role: "member",
                        },
                        { session }
                    );
                }

                archived = true;
            });
        } finally {
            await session.endSession();
        }

        if (!archived) {
            return NextResponse.json(
                {
                    success: false,
                    message: "সদস্য পাওয়া যায়নি",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message:
                "সদস্যের সব তথ্য ও linked records ৩০ দিনের জন্য archive করা হয়েছে",
            memberId,
        });
    } catch (error) {
        console.error("ARCHIVE MEMBER ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    (error instanceof Error ? error.message : "") ||
                    "সদস্য archive করা যায়নি",
            },
            { status: 500 }
        );
    }
}