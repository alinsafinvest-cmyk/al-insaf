// বাংলা: এই API route-এ members সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import { Member } from "@/lib/sheetsModels";
import User from "@/models/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =========================================================
   HELPERS
========================================================= */

function getMemberData(record: any) {
    return {
        ...record,
        ...(record?.data || {}),
    };
}

function clean(value: any) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
}

function numberValue(value: any) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

/* =========================================================
   GET MEMBERS
   /api/members
   /api/members?search=M001
========================================================= */

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET(request: Request) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const { searchParams } = new URL(request.url);

        const search =
            searchParams.get("search")?.trim().toLowerCase() || "";

        const records = await Member.find({})
            .sort({ createdAt: -1 })
            .lean();

        let members = records.map((record: any) => {
            const data = getMemberData(record);

            return {
                memberId:
                    data.MemberID ||
                    data.memberId ||
                    data["Member ID"] ||
                    data.recordId ||
                    "",

                name:
                    data["নাম"] ||
                    data.name ||
                    data.Name ||
                    "",

                whatsapp:
                    data["WhatsApp"] ||
                    data.whatsapp ||
                    "",

                mobile:
                    data["অন্য মোবাইল"] ||
                    data.mobile ||
                    data.Mobile ||
                    "",

                email:
                    data["Gmail"] ||
                    data.email ||
                    data.Email ||
                    "",

                address:
                    data["ঠিকানা"] ||
                    data.address ||
                    data.Address ||
                    "",

                nid:
                    data["NID নম্বর"] ||
                    data.nid ||
                    data["NID Number"] ||
                    "",

                joinDate:
                    data["যোগদানের তারিখ"] ||
                    data.joinDate ||
                    data["Join Date"] ||
                    "",

                status:
                    data.Status ||
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
                    data.Note ||
                    "",

                loginStatus:
                    data.LoginStatus ||
                    data.loginStatus ||
                    "",

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

                nomineeNidFileId:
                    data["Nominee NID File ID"] ||
                    data.nomineeNidFileId ||
                    "",

                nomineePhotoFileId:
                    data["Nominee ছবি File ID"] ||
                    data.nomineePhotoFileId ||
                    "",

                createdAt: record.createdAt,
                updatedAt: record.updatedAt,
            };
        });

        if (search) {
            members = members.filter((member: any) => {
                const searchable = [
                    member.memberId,
                    member.name,
                    member.whatsapp,
                    member.mobile,
                    member.email,
                    member.address,
                    member.status,
                ]
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(search);
            });
        }

        const active = members.filter((member: any) => {
            const status = clean(member.status).toLowerCase();

            return (
                status === "active" ||
                status === "সক্রিয়"
            );
        }).length;

        return NextResponse.json({
            success: true,
            members,
            stats: {
                total: members.length,
                active,
            },
        });
    } catch (error) {
        console.error("GET MEMBERS ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: "সদস্যদের তথ্য পাওয়া যায়নি",
            },
            { status: 500 }
        );
    }
}

/* =========================================================
   CREATE NEW MEMBER
   POST /api/members
========================================================= */

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(request: Request) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body = await request.json();

        const memberId = clean(body.memberId);
        const name = clean(body.name);
        const email = clean(body.email).toLowerCase();

        if (!memberId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Member ID আবশ্যক",
                },
                { status: 400 }
            );
        }

        if (!name) {
            return NextResponse.json(
                {
                    success: false,
                    message: "সদস্যের নাম আবশ্যক",
                },
                { status: 400 }
            );
        }

        /* Duplicate Member ID */

        const existingMember = await Member.findOne({
            $or: [
                { recordId: memberId },
                { MemberID: memberId },
                { memberId: memberId },
            ],
        }).lean();

        if (existingMember) {
            return NextResponse.json(
                {
                    success: false,
                    message: "এই Member ID ইতিমধ্যে আছে",
                },
                { status: 409 }
            );
        }

        /* Duplicate User */

        if (email) {
            const existingEmail = await User.findOne({
                email,
            }).lean();

            if (existingEmail) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "এই Gmail/Email ইতিমধ্যে ব্যবহার করা হয়েছে",
                    },
                    { status: 409 }
                );
            }
        }

        const rawPassword =
            clean(body.password) || memberId;

        const hashedPassword = await bcrypt.hash(
            rawPassword,
            12
        );

        const memberData = {
            MemberID: memberId,
            "নাম": name,
            "WhatsApp": clean(body.whatsapp),
            "অন্য মোবাইল": clean(body.mobile),
            "Gmail": email,
            "ঠিকানা": clean(body.address),
            "NID নম্বর": clean(body.nid),
            "যোগদানের তারিখ": clean(body.joinDate),
            "Status": clean(body.status) || "Active",

            "অংশ সংখ্যা": numberValue(body.shares),

            "মাসিক জমা":
                numberValue(body.monthlyDeposit),

            "Nominee নাম":
                clean(body.nomineeName),

            "Nominee মোবাইল":
                clean(body.nomineeMobile),

            "Nominee সম্পর্ক":
                clean(body.nomineeRelation),

            "Nominee NID":
                clean(body.nomineeNid),

            "নোট":
                clean(body.note),

            LoginStatus: "Active",

            "ছবি File ID":
                clean(body.photoFileId),

            "NID Front File ID":
                clean(body.nidFrontFileId),

            "NID Back File ID":
                clean(body.nidBackFileId),

            "Nominee NID File ID":
                clean(body.nomineeNidFileId),

            "Nominee ছবি File ID":
                clean(body.nomineePhotoFileId),
        };

        const member = await Member.create({
            sourceSheet: "Members",
            recordId: memberId,
            data: memberData,
            ...memberData,
            syncedAt: new Date(),
        });

        /* Create Login User */

        const user = await User.create({
            name,
            email:
                email ||
                `${memberId.toLowerCase()}@member.local`,
            password: hashedPassword,
            role: "member",
            memberId,
            phone:
                clean(body.whatsapp) ||
                clean(body.mobile),
            isActive:
                clean(body.status).toLowerCase() !==
                    "inactive",
        });

        return NextResponse.json(
            {
                success: true,
                message: "নতুন সদস্য সফলভাবে তৈরি হয়েছে",
                memberId,
                userId: user._id,
                temporaryPassword:
                    rawPassword,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("CREATE MEMBER ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "নতুন সদস্য তৈরি করা যায়নি",
            },
            { status: 500 }
        );
    }
}

/* =========================================================
   UPDATE MEMBER
   PUT /api/members
========================================================= */

// বাংলা: PUT অনুরোধে যাচাইকৃত তথ্য দিয়ে বিদ্যমান রেকর্ড হালনাগাদ করে।
export async function PUT(request: Request) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body = await request.json();

        const memberId = clean(body.memberId);

        if (!memberId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Member ID পাওয়া যায়নি",
                },
                { status: 400 }
            );
        }

        const existing = await Member.findOne({
            $or: [
                { recordId: memberId },
                { MemberID: memberId },
                { memberId: memberId },
            ],
        });

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Member পাওয়া যায়নি",
                },
                { status: 404 }
            );
        }

        const email = clean(body.email).toLowerCase();

        /* Check email */

        if (email) {
            const anotherUser = await User.findOne({
                email,
                memberId: {
                    $ne: memberId,
                },
            }).lean();

            if (anotherUser) {
                return NextResponse.json(
                    {
                        success: false,
                        message:
                            "এই Email অন্য account-এ ব্যবহার হচ্ছে",
                    },
                    { status: 409 }
                );
            }
        }

        const updateData = {
            MemberID: memberId,
            "নাম": clean(body.name),
            "WhatsApp": clean(body.whatsapp),
            "অন্য মোবাইল": clean(body.mobile),
            "Gmail": email,
            "ঠিকানা": clean(body.address),
            "NID নম্বর": clean(body.nid),
            "যোগদানের তারিখ": clean(body.joinDate),
            "Status": clean(body.status) || "Active",

            "অংশ সংখ্যা":
                numberValue(body.shares),

            "মাসিক জমা":
                numberValue(body.monthlyDeposit),

            "Nominee নাম":
                clean(body.nomineeName),

            "Nominee মোবাইল":
                clean(body.nomineeMobile),

            "Nominee সম্পর্ক":
                clean(body.nomineeRelation),

            "Nominee NID":
                clean(body.nomineeNid),

            "নোট":
                clean(body.note),

            LoginStatus:
                clean(body.loginStatus) ||
                "Active",

            "ছবি File ID":
                clean(body.photoFileId),

            "NID Front File ID":
                clean(body.nidFrontFileId),

            "NID Back File ID":
                clean(body.nidBackFileId),

            "Nominee NID File ID":
                clean(body.nomineeNidFileId),

            "Nominee ছবি File ID":
                clean(body.nomineePhotoFileId),

            updatedAt: new Date(),
        };

        /* Update main member document */

        await Member.updateOne(
            {
                _id: existing._id,
            },
            {
                $set: {
                    ...updateData,

                    "data.MemberID":
                        updateData.MemberID,

                    "data.নাম":
                        updateData["নাম"],

                    "data.WhatsApp":
                        updateData["WhatsApp"],

                    "data.অন্য মোবাইল":
                        updateData["অন্য মোবাইল"],

                    "data.Gmail":
                        updateData["Gmail"],

                    "data.ঠিকানা":
                        updateData["ঠিকানা"],

                    "data.NID নম্বর":
                        updateData["NID নম্বর"],

                    "data.যোগদানের তারিখ":
                        updateData["যোগদানের তারিখ"],

                    "data.Status":
                        updateData["Status"],

                    "data.অংশ সংখ্যা":
                        updateData["অংশ সংখ্যা"],

                    "data.মাসিক জমা":
                        updateData["মাসিক জমা"],

                    "data.Nominee নাম":
                        updateData["Nominee নাম"],

                    "data.Nominee মোবাইল":
                        updateData["Nominee মোবাইল"],

                    "data.Nominee সম্পর্ক":
                        updateData["Nominee সম্পর্ক"],

                    "data.Nominee NID":
                        updateData["Nominee NID"],

                    "data.নোট":
                        updateData["নোট"],

                    "data.LoginStatus":
                        updateData.LoginStatus,

                    "data.ছবি File ID":
                        updateData["ছবি File ID"],

                    "data.NID Front File ID":
                        updateData["NID Front File ID"],

                    "data.NID Back File ID":
                        updateData["NID Back File ID"],

                    "data.Nominee NID File ID":
                        updateData["Nominee NID File ID"],

                    "data.Nominee ছবি File ID":
                        updateData["Nominee ছবি File ID"],

                    syncedAt: new Date(),
                },
            }
        );

        /* Update login account */

        const user = await User.findOne({
            memberId,
        });

        if (user) {
            user.name =
                updateData["নাম"];

            user.email =
                email ||
                user.email;

            user.phone =
                updateData["WhatsApp"] ||
                updateData["অন্য মোবাইল"];

            user.isActive =
                updateData["Status"]
                    .toLowerCase() !==
                "inactive";

            /*
             * Password only changes if Admin
             * enters a NEW password.
             */

            if (clean(body.password)) {
                user.password =
                    await bcrypt.hash(
                        clean(body.password),
                        12
                    );
            }

            await user.save();
        }

        return NextResponse.json({
            success: true,
            message:
                "সদস্যের তথ্য সফলভাবে আপডেট হয়েছে",
        });
    } catch (error: any) {
        console.error("UPDATE MEMBER ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Member update করা যায়নি",
            },
            { status: 500 }
        );
    }
}