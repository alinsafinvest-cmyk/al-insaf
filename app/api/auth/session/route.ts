// বাংলা: এই API route-এ auth → session সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";
import { Member } from "@/lib/sheetsModels";
import { getMemberPhotoUrl } from "@/lib/member-photo";

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
            .select("name email photoUrl role memberId")
            .lean();

        if (!account) {
            return NextResponse.json({
                authenticated: false,
                role: null,
                profile: null,
            });
        }

        let photoUrl = getMemberPhotoUrl(account.photoUrl);
        let name = account.name || "";

        if (user.role === "member") {
            const memberIdentity = account.memberId?.trim();
            let memberRecord = memberIdentity
                ? await Member.findOne({
                    sourceSheet: "Members",
                    $or: [
                        { recordId: memberIdentity },
                        { "data.MemberID": memberIdentity },
                        { "data.Member ID": memberIdentity },
                        { "data.memberId": memberIdentity },
                        { MemberID: memberIdentity },
                        { memberId: memberIdentity },
                    ],
                }).lean()
                : null;

            if (!memberRecord && account.email) {
                memberRecord = await Member.findOne({
                    sourceSheet: "Members",
                    $or: [
                        { "data.Gmail": account.email },
                        { "data.Email": account.email },
                        { "data.email": account.email },
                        { Gmail: account.email },
                        { Email: account.email },
                        { email: account.email },
                    ],
                }).lean();
            }

            if (memberRecord) {
                const data = { ...(memberRecord.data || {}), ...memberRecord };
                name = String(data["নাম"] || data.name || data.Name || name);
                const storedPhoto =
                    data["ছবি URL"] ||
                    data.photoUrl ||
                    data.photoFileId ||
                    data["ছবি File ID"] ||
                    data["সদস্যের ছবি"] ||
                    data.photo ||
                    data.Photo;
                if (storedPhoto) {
                    photoUrl = getMemberPhotoUrl(storedPhoto) || photoUrl;
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
