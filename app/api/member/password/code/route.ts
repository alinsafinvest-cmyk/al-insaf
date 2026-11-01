import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import {
    isMemberPasswordEmailConfigured,
    sendMemberPasswordCode,
} from "@/lib/member-password-email";
import { requireRole } from "@/lib/require-auth";
import User from "@/models/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskEmail(email: string) {
    const [name, domain] = email.split("@");
    if (!name || !domain) return email;
    return `${name.slice(0, 1)}${"*".repeat(Math.max(2, name.length - 1))}@${domain}`;
}

export async function POST() {
    const auth = await requireRole(["member"]);
    if (auth.response) return auth.response;

    if (!isMemberPasswordEmailConfigured()) {
        return NextResponse.json(
            {
                success: false,
                message: "পাসওয়ার্ড কোড পাঠাতে ইমেইল সার্ভার কনফিগার করা নেই",
            },
            { status: 503 }
        );
    }

    try {
        await connectDB();
        const account = await User.findOne({
            _id: auth.user.userId,
            role: "member",
            isActive: true,
        })
            .select("name email passwordChangeCodeSentAt")
            .lean();

        if (!account) {
            return NextResponse.json(
                { success: false, message: "সদস্যের account পাওয়া যায়নি" },
                { status: 404 }
            );
        }

        const email = account.email?.trim().toLowerCase() || "";
        if (!email.includes("@") || email.endsWith("@member.local")) {
            return NextResponse.json(
                {
                    success: false,
                    message: "আপনার account-এ কার্যকর ইমেইল ঠিকানা নেই; অ্যাডমিনের সঙ্গে যোগাযোগ করুন",
                },
                { status: 400 }
            );
        }

        const now = new Date();
        const cooldownEndsAt = account.passwordChangeCodeSentAt
            ? new Date(account.passwordChangeCodeSentAt.getTime() + 60_000)
            : null;

        if (cooldownEndsAt && cooldownEndsAt > now) {
            return NextResponse.json(
                {
                    success: false,
                    message: "নতুন কোড পাঠানোর আগে এক মিনিট অপেক্ষা করুন",
                },
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
                    { passwordChangeCodeSentAt: { $exists: false } },
                    { passwordChangeCodeSentAt: { $lte: new Date(now.getTime() - 60_000) } },
                ],
            },
            {
                $set: {
                    passwordChangeCodeHash: codeHash,
                    passwordChangeCodeExpiresAt: new Date(now.getTime() + 10 * 60_000),
                    passwordChangeCodeAttempts: 0,
                    passwordChangeCodeSentAt: now,
                },
            },
            { new: true }
        )
            .select("name email")
            .lean();

        if (!updated) {
            return NextResponse.json(
                {
                    success: false,
                    message: "নতুন কোড পাঠানোর আগে এক মিনিট অপেক্ষা করুন",
                },
                { status: 429 }
            );
        }

        try {
            await sendMemberPasswordCode({
                email,
                name: account.name || "সদস্য",
                code,
            });
        } catch (error) {
            await User.updateOne(
                { _id: account._id, passwordChangeCodeHash: codeHash },
                {
                    $unset: {
                        passwordChangeCodeHash: "",
                        passwordChangeCodeExpiresAt: "",
                        passwordChangeCodeAttempts: "",
                        passwordChangeCodeSentAt: "",
                    },
                }
            );
            throw error;
        }

        return NextResponse.json({
            success: true,
            message: `যাচাইকরণ কোড ${maskEmail(email)} ঠিকানায় পাঠানো হয়েছে`,
        });
    } catch (error) {
        console.error("MEMBER PASSWORD CODE EMAIL ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                message: "ইমেইলে কোড পাঠানো যায়নি; কিছুক্ষণ পর আবার চেষ্টা করুন",
            },
            { status: 502 }
        );
    }
}
