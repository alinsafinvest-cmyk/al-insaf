import { NextRequest, NextResponse } from "next/server";

import { getMemberPhotoUrl } from "@/lib/member-photo";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import User from "@/models/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: NextRequest) {
    const auth = await requireRole(["member"]);
    if (auth.response) return auth.response;

    try {
        const formData = await request.formData();
        const file = formData.get("file");
        if (!(file instanceof File) || !allowedTypes.has(file.type)) {
            return NextResponse.json(
                { success: false, message: "JPG, PNG, WEBP বা GIF ছবি নির্বাচন করুন" },
                { status: 400 }
            );
        }

        if (!file.size || file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { success: false, message: "ছবির আকার সর্বোচ্চ 5MB হতে পারবে" },
                { status: 400 }
            );
        }

        await connectDB();
        const account = await User.findOne({
            _id: auth.user.userId,
            role: "member",
            isActive: true,
        })
            .select("memberId")
            .lean();

        if (!account?.memberId) {
            return NextResponse.json(
                { success: false, message: "Member ID পাওয়া যায়নি" },
                { status: 404 }
            );
        }

        const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
        if (!appsScriptUrl) {
            return NextResponse.json(
                { success: false, message: "ছবি আপলোড সার্ভার কনফিগার করা নেই" },
                { status: 503 }
            );
        }

        const response = await fetch(appsScriptUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "uploadMemberFile",
                memberId: account.memberId,
                fileType: "photoFileId",
                fileName: file.name,
                mimeType: file.type,
                base64Data: Buffer.from(await file.arrayBuffer()).toString("base64"),
            }),
            cache: "no-store",
        });

        const result = await response.json();
        if (!response.ok || !result.success || typeof result.fileId !== "string") {
            console.error("Member photo upload failed:", result.message || response.status);
            return NextResponse.json(
                { success: false, message: "ছবি আপলোড করা যায়নি" },
                { status: 502 }
            );
        }

        const photoUrl = getMemberPhotoUrl(result.fileId);
        if (!photoUrl) {
            throw new Error("Photo upload returned an invalid file ID.");
        }

        const updated = await User.findOneAndUpdate(
            { _id: account._id, role: "member", isActive: true },
            { $set: { photoUrl } },
            { new: true }
        )
            .select("photoUrl")
            .lean();

        if (!updated) {
            return NextResponse.json(
                { success: false, message: "ছবি account-এ সংরক্ষণ করা যায়নি" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            photoUrl,
            message: "প্রোফাইল ছবি আপলোড হয়েছে",
        });
    } catch (error) {
        console.error("MEMBER PHOTO UPLOAD ERROR:", error);
        return NextResponse.json(
            { success: false, message: "ছবি আপলোড করা যায়নি" },
            { status: 500 }
        );
    }
}
