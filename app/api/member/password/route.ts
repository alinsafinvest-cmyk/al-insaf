import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import User from "@/models/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const auth = await requireRole(["member"]);
    if (auth.response) return auth.response;

    try {
        const body = await request.json();
        const currentPassword = String(body.currentPassword ?? "");
        const code = String(body.code ?? "").trim();
        const newPassword = String(body.newPassword ?? "");

        if (!currentPassword || !/^\d{6}$/.test(code)) {
            return NextResponse.json(
                { success: false, message: "বর্তমান পাসওয়ার্ড ও ৬ সংখ্যার কোড দিন" },
                { status: 400 }
            );
        }

        if (newPassword.length < 8 || newPassword.length > 128) {
            return NextResponse.json(
                { success: false, message: "নতুন পাসওয়ার্ড ৮ থেকে ১২৮ অক্ষরের মধ্যে দিন" },
                { status: 400 }
            );
        }

        await connectDB();
        const account = await User.findOne({
            _id: auth.user.userId,
            role: "member",
            isActive: true,
        }).select("+password");

        if (!account?.password) {
            return NextResponse.json(
                { success: false, message: "সদস্যের account পাওয়া যায়নি" },
                { status: 404 }
            );
        }

        if (!(await bcrypt.compare(currentPassword, account.password))) {
            return NextResponse.json(
                { success: false, message: "বর্তমান পাসওয়ার্ড সঠিক নয়" },
                { status: 401 }
            );
        }

        const challenge = await User.findOneAndUpdate(
            {
                _id: account._id,
                passwordChangeCodeHash: { $exists: true },
                passwordChangeCodeExpiresAt: { $gt: new Date() },
                passwordChangeCodeAttempts: { $lt: 5 },
            },
            { $inc: { passwordChangeCodeAttempts: 1 } },
            { new: true }
        ).select("+password +passwordChangeCodeHash +passwordChangeCodeAttempts");

        if (!challenge?.passwordChangeCodeHash) {
            return NextResponse.json(
                {
                    success: false,
                    message: "কোডের মেয়াদ শেষ বা প্রচেষ্টার সীমা অতিক্রম হয়েছে; নতুন কোড নিন",
                },
                { status: 400 }
            );
        }

        if (!(await bcrypt.compare(code, challenge.passwordChangeCodeHash))) {
            return NextResponse.json(
                { success: false, message: "যাচাইকরণ কোড সঠিক নয়" },
                { status: 400 }
            );
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        const result = await User.updateOne(
            {
                _id: account._id,
                password: account.password,
                passwordChangeCodeHash: challenge.passwordChangeCodeHash,
                passwordChangeCodeAttempts: challenge.passwordChangeCodeAttempts,
            },
            {
                $set: { password: passwordHash },
                $unset: {
                    passwordChangeCodeHash: "",
                    passwordChangeCodeExpiresAt: "",
                    passwordChangeCodeAttempts: "",
                    passwordChangeCodeSentAt: "",
                },
            }
        );

        if (result.modifiedCount !== 1) {
            return NextResponse.json(
                { success: false, message: "পাসওয়ার্ড পরিবর্তন করা যায়নি; নতুন কোড নিয়ে আবার চেষ্টা করুন" },
                { status: 409 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে",
        });
    } catch (error) {
        console.error("MEMBER PASSWORD CHANGE ERROR:", error);
        return NextResponse.json(
            { success: false, message: "পাসওয়ার্ড পরিবর্তন করা যায়নি" },
            { status: 500 }
        );
    }
}
