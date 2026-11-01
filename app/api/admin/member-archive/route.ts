import { NextRequest, NextResponse } from "next/server";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getMemberData(
    record: Record<string, unknown> | null
): Record<string, unknown> {
    if (!record) return {};
    const data =
        record.data && typeof record.data === "object"
            ? (record.data as Record<string, unknown>)
            : {};

    return {
        ...data,
        ...record,
        memberId:
            record.MemberID ||
            record.memberId ||
            record.recordId ||
            "",
        name: record["নাম"] || record.name || "",
        whatsapp: record["WhatsApp"] || record.whatsapp || "",
        mobile: record["অন্য মোবাইল"] || record.mobile || "",
        email: record.Gmail || record.email || "",
        address: record["ঠিকানা"] || record.address || "",
        nid: record["NID নম্বর"] || record.nid || "",
        joinDate:
            record["যোগদানের তারিখ"] || record.joinDate || "",
        status: record.Status || record.status || "Active",
        shares: record["অংশ সংখ্যা"] ?? record.shares ?? 0,
        monthlyDeposit:
            record["মাসিক জমা"] ?? record.monthlyDeposit ?? 0,
        nomineeName:
            record["Nominee নাম"] || record.nomineeName || "",
        nomineeMobile:
            record["Nominee মোবাইল"] || record.nomineeMobile || "",
        nomineeRelation:
            record["Nominee সম্পর্ক"] || record.nomineeRelation || "",
        nomineeNid:
            record["Nominee NID"] || record.nomineeNid || "",
        note: record["নোট"] || record.note || "",
        loginStatus:
            record.LoginStatus || record.loginStatus || "Active",
        photoFileId:
            record["ছবি File ID"] || record.photoFileId || "",
        nidFrontFileId:
            record["NID Front File ID"] || record.nidFrontFileId || "",
        nidBackFileId:
            record["NID Back File ID"] || record.nidBackFileId || "",
        nomineePhotoFileId:
            record["Nominee ছবি File ID"] ||
            record.nomineePhotoFileId ||
            "",
        nomineeNidFileId:
            record["Nominee NID File ID"] ||
            record.nomineeNidFileId ||
            "",
    };
}

export async function GET() {
    try {
        const auth = await requireRole(["admin"]);
        if (auth.response) return auth.response;

        await connectDB();
        await MemberArchive.createIndexes();
        const now = new Date();
        await MemberArchive.deleteMany({
            expiresAt: { $lte: now },
        });

        const archives = await MemberArchive.find({
            expiresAt: { $gt: now },
        })
            .sort({ archivedAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            archives: archives.map((archive) => {
                const snapshot = archive.snapshot as Record<string, unknown>;
                const member = getMemberData(
                    snapshot.member as Record<string, unknown> | null
                );
                delete member.password;
                delete member.Password;
                const account = snapshot.account as
                    | Record<string, unknown>
                    | null;
                const accountEmail =
                    typeof account?.email === "string" &&
                    !account.email.endsWith("@member.local")
                        ? account.email
                        : "";
                const transactions = Array.isArray(snapshot.transactions)
                    ? snapshot.transactions
                    : [];
                const deposits = Array.isArray(snapshot.deposits)
                    ? snapshot.deposits
                    : [];
                const payments = Array.isArray(snapshot.payments)
                    ? snapshot.payments
                    : [];
                const cashBooks = Array.isArray(snapshot.cashBooks)
                    ? snapshot.cashBooks
                    : [];
                const memberRequests = Array.isArray(snapshot.memberRequests)
                    ? snapshot.memberRequests
                    : [];

                return {
                    archiveId: String(archive._id),
                    member: {
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
                            account?.notificationPreferences || {},
                    },
                    archivedAt: archive.archivedAt,
                    expiresAt: archive.expiresAt,
                    daysRemaining: Math.max(
                        0,
                        Math.ceil(
                            (new Date(archive.expiresAt).getTime() -
                                now.getTime()) /
                                (24 * 60 * 60 * 1000)
                        )
                    ),
                    relatedRecords: {
                        transactions: transactions.length,
                        deposits: deposits.length,
                        payments: payments.length,
                        cashBooks: cashBooks.length,
                        memberRequests: memberRequests.length,
                    },
                };
            }),
        });
    } catch (error) {
        console.error("GET MEMBER ARCHIVE ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Archive-এর তথ্য পাওয়া যায়নি",
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireRole(["admin"]);
        if (auth.response) return auth.response;

        const body = await request.json();
        const archiveId = String(body.archiveId || "").trim();
        if (!mongoose.isValidObjectId(archiveId)) {
            return NextResponse.json(
                { success: false, message: "সঠিক Archive নির্বাচন করুন" },
                { status: 400 }
            );
        }

        await connectDB();
        await MemberArchive.createIndexes();
        const session = await mongoose.startSession();
        let restored = false;
        let conflict = false;

        try {
            await session.withTransaction(async () => {
                const archive = await MemberArchive.findOne({
                    _id: archiveId,
                    expiresAt: { $gt: new Date() },
                }).session(session);

                if (!archive) return;

                const snapshot = archive.snapshot as Record<string, unknown>;
                const memberId = archive.memberId;
                const member = snapshot.member as
                    | Record<string, unknown>
                    | null;
                const account = snapshot.account as
                    | Record<string, unknown>
                    | null;

                const existingMember = await Member.findOne({
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
                const existingAccount = await User.findOne({
                    $or: [
                        ...(account?._id
                            ? [{ _id: account._id }]
                            : []),
                        ...(account?.email
                            ? [{ email: account.email }]
                            : []),
                        { memberId },
                    ],
                }).session(session);

                if (existingMember || existingAccount) {
                    conflict = true;
                    return;
                }

                if (member) {
                    await Member.create([member], { session });
                }

                if (account) {
                    await User.create([account], { session });
                }

                const transactionRecords = Array.isArray(
                    snapshot.transactions
                )
                    ? snapshot.transactions
                    : [];
                const depositRecords = Array.isArray(snapshot.deposits)
                    ? snapshot.deposits
                    : [];
                const paymentRecords = Array.isArray(snapshot.payments)
                    ? snapshot.payments
                    : [];
                const cashBookRecords = Array.isArray(snapshot.cashBooks)
                    ? snapshot.cashBooks
                    : [];
                const memberRequestRecords = Array.isArray(
                    snapshot.memberRequests
                )
                    ? snapshot.memberRequests
                    : [];

                if (transactionRecords.length) {
                    await Transaction.insertMany(transactionRecords, {
                        session,
                    });
                }
                if (depositRecords.length) {
                    await Deposit.insertMany(depositRecords, { session });
                }
                if (paymentRecords.length) {
                    await Payment.insertMany(paymentRecords, { session });
                }
                if (cashBookRecords.length) {
                    await CashBook.insertMany(cashBookRecords, { session });
                }
                if (memberRequestRecords.length) {
                    await MemberRequest.insertMany(memberRequestRecords, {
                        session,
                    });
                }

                await MemberArchive.deleteOne(
                    { _id: archive._id },
                    { session }
                );
                restored = true;
            });
        } finally {
            await session.endSession();
        }

        if (conflict) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "একই Member ID বা login অন্য রেকর্ডে ব্যবহৃত হচ্ছে; archive অক্ষত রাখা হয়েছে",
                },
                { status: 409 }
            );
        }

        if (!restored) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Archive-এর মেয়াদ শেষ হয়েছে অথবা archive পাওয়া যায়নি",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "সদস্য ও তার সব সংরক্ষিত রেকর্ড restore হয়েছে",
        });
    } catch (error) {
        console.error("RESTORE MEMBER ARCHIVE ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Archive restore করা যায়নি",
            },
            { status: 500 }
        );
    }
}
