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
        const code = String(body.code ?? "").trim();
        if (!/^\d{6}$/.test(code)) {
            return NextResponse.json(
                { success: false, message: "৬ সংখ্যার ইমেইল যাচাইকরণ কোড দিন" },
                { status: 400 }
            );
        }

        await connectDB();
        const challenge = await User.findOneAndUpdate(
            {
                _id: auth.user.userId,
                role: "member",
                isActive: true,
                pendingEmail: { $exists: true },
                emailChangeCodeHash: { $exists: true },
                emailChangeCodeExpiresAt: { $gt: new Date() },
                emailChangeCodeAttempts: { $lt: 5 },
            },
            { $inc: { emailChangeCodeAttempts: 1 } },
            { new: true }
        ).select("+pendingEmail +emailChangeCodeHash +emailChangeCodeAttempts");

        if (!challenge?.pendingEmail || !challenge.emailChangeCodeHash) {
            return NextResponse.json(
                { success: false, message: "কোডের মেয়াদ শেষ বা প্রচেষ্টার সীমা অতিক্রম হয়েছে; নতুন কোড নিন" },
                { status: 400 }
            );
        }

        if (!(await bcrypt.compare(code, challenge.emailChangeCodeHash))) {
            return NextResponse.json(
                { success: false, message: "ইমেইল যাচাইকরণ কোড সঠিক নয়" },
                { status: 400 }
            );
        }

        try {
            const result = await User.updateOne(
                {
                    _id: challenge._id,
                    pendingEmail: challenge.pendingEmail,
                    emailChangeCodeHash: challenge.emailChangeCodeHash,
                    emailChangeCodeAttempts: challenge.emailChangeCodeAttempts,
                    emailChangeCodeExpiresAt: { $gt: new Date() },
                },
                {
                    $set: { email: challenge.pendingEmail },
                    $unset: {
                        pendingEmail: "",
                        emailChangeCodeHash: "",
                        emailChangeCodeExpiresAt: "",
                        emailChangeCodeAttempts: "",
                        emailChangeCodeSentAt: "",
                    },
                }
            );

            if (result.modifiedCount !== 1) {
                return NextResponse.json(
                    { success: false, message: "ইমেইল পরিবর্তন করা যায়নি; নতুন কোড নিয়ে চেষ্টা করুন" },
                    { status: 409 }
                );
            }
        } catch (error) {
            if (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === 11000
            ) {
                return NextResponse.json(
                    { success: false, message: "এই ইমেইলটি অন্য account-এ ব্যবহৃত হচ্ছে" },
                    { status: 409 }
                );
            }
            throw error;
        }

        return NextResponse.json({
            success: true,
            email: challenge.pendingEmail,
            message: "ইমেইল যাচাই করে পরিবর্তন করা হয়েছে",
        });
    } catch (error) {
        console.error("MEMBER EMAIL CHANGE ERROR:", error);
        return NextResponse.json(
            { success: false, message: "ইমেইল পরিবর্তন করা যায়নি" },
            { status: 500 }
        );
    }
}
