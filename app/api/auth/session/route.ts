// বাংলা: এই API route-এ auth → session সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { Member } from "@/lib/sheetsModels";

export const dynamic = "force-dynamic";

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    const user = await getAuthUser();

    if (!user) {
        return NextResponse.json({
            authenticated: false,
            role: null,
            profile: null,
        });
    }

    try {
        await connectDB();
        const account = await User.findById(user.userId)
            .select("name photoUrl role memberId")
            .lean();

        if (!account) {
            return NextResponse.json({
                authenticated: false,
                role: null,
                profile: null,
            });
        }

        let photoUrl = account.photoUrl || "";
        let name = account.name || "";

        if (user.role === "member" && account.memberId) {
            const memberRecord = await Member.findOne({
                sourceSheet: "Members",
                $or: [
                    { recordId: account.memberId },
                    { "data.MemberID": account.memberId },
                    { MemberID: account.memberId },
                ],
            }).lean();

            if (memberRecord) {
                const data = {
                    ...(memberRecord.data || {}),
                    ...memberRecord,
                } as Record<string, unknown>;
                name = String(data["নাম"] || data.name || data.Name || name);
                const storedPhoto = String(
                    data["ছবি URL"] ||
                    data.photoUrl ||
                    data.photoFileId ||
                    data["ছবি File ID"] ||
                    "",
                ).trim();
                if (storedPhoto) {
                    photoUrl = /^https?:\/\//i.test(storedPhoto)
                        ? storedPhoto
                        : `https://drive.google.com/thumbnail?id=${encodeURIComponent(storedPhoto)}&sz=w256`;
                }
            }
        }

        return NextResponse.json({
            authenticated: true,
            role: user.role,
            profile: { name, photoUrl },
        });
    } catch (error) {
        console.error("GET AUTH SESSION PROFILE ERROR:", error);
        return NextResponse.json(
            { authenticated: false, role: null, profile: null },
            { status: 500 },
        );
    }

}
