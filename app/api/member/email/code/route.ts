import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import {
    isMemberPasswordEmailConfigured,
    sendMemberEmailChangeCode,
} from "@/lib/member-password-email";
import { requireRole } from "@/lib/require-auth";
import User from "@/models/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
    return email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
    const auth = await requireRole(["member"]);
    if (auth.response) return auth.response;

    if (!isMemberPasswordEmailConfigured()) {
        return NextResponse.json(
            { success: false, message: "ইমেইল যাচাইয়ের সার্ভার কনফিগার করা নেই" },
            { status: 503 }
        );
    }

    try {
        const body = await request.json();
        const email = String(body.email ?? "").trim().toLowerCase();
        if (!isValidEmail(email) || email.endsWith("@member.local")) {
            return NextResponse.json(
                { success: false, message: "একটি সঠিক ইমেইল ঠিকানা দিন" },
                { status: 400 }
            );
        }

        await connectDB();
        const account = await User.findOne({
            _id: auth.user.userId,
            role: "member",
            isActive: true,
        })
            .select("name email emailChangeCodeSentAt")
            .lean();

        if (!account) {
            return NextResponse.json(
                { success: false, message: "সদস্যের account পাওয়া যায়নি" },
                { status: 404 }
            );
        }

        if (email === account.email.toLowerCase()) {
            return NextResponse.json(
                { success: false, message: "এটি আপনার বর্তমান ইমেইল ঠিকানা" },
                { status: 400 }
            );
        }

        if (await User.exists({ email })) {
            return NextResponse.json(
                { success: false, message: "এই ইমেইলটি অন্য account-এ ব্যবহৃত হচ্ছে" },
                { status: 409 }
            );
        }

        const now = new Date();
        const sentAt = account.emailChangeCodeSentAt;
        if (sentAt && sentAt.getTime() > now.getTime() - 60_000) {
            return NextResponse.json(
                { success: false, message: "নতুন কোড পাঠানোর আগে এক মিনিট অপেক্ষা করুন" },
                { status: 429 }
            );
        }

        const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
        const codeHash = await bcrypt.hash(code, 10);
        const updated = await User.findOneAndUpdate(
            {
                _id: account._id,
                role: "member",
                isActive: true,
                $or: [
                    { emailChangeCodeSentAt: { $exists: false } },
                    { emailChangeCodeSentAt: { $lte: new Date(now.getTime() - 60_000) } },
                ],
            },
            {
                $set: {
                    pendingEmail: email,
                    emailChangeCodeHash: codeHash,
                    emailChangeCodeExpiresAt: new Date(now.getTime() + 10 * 60_000),
                    emailChangeCodeAttempts: 0,
                    emailChangeCodeSentAt: now,
                },
            },
            { new: true }
        )
            .select("name")
            .lean();

        if (!updated) {
            return NextResponse.json(
                { success: false, message: "নতুন কোড পাঠানোর আগে এক মিনিট অপেক্ষা করুন" },
                { status: 429 }
            );
        }

        try {
            await sendMemberEmailChangeCode({
                email,
                name: account.name || "সদস্য",
                code,
            });
        } catch (error) {
            await User.updateOne(
                { _id: account._id, emailChangeCodeHash: codeHash },
                {
                    $unset: {
                        pendingEmail: "",
                        emailChangeCodeHash: "",
                        emailChangeCodeExpiresAt: "",
                        emailChangeCodeAttempts: "",
                        emailChangeCodeSentAt: "",
                    },
                }
            );
            throw error;
        }

        const [local, domain] = email.split("@");
        const maskedEmail = `${local.slice(0, 1)}${"*".repeat(Math.max(2, local.length - 1))}@${domain}`;
        return NextResponse.json({
            success: true,
            message: `যাচাইকরণ কোড ${maskedEmail} ঠিকানায় পাঠানো হয়েছে`,
        });
    } catch (error) {
        console.error("MEMBER EMAIL CHANGE CODE ERROR:", error);
        return NextResponse.json(
            { success: false, message: "নতুন ইমেইলে কোড পাঠানো যায়নি" },
            { status: 502 }
        );
    }
}
