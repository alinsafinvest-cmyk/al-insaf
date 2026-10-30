// বাংলা: এই API route-এ public → members সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Member } from "@/lib/sheetsModels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        await connectDB();

        const records = await Member.find({ sourceSheet: "Members" })
            .sort({ createdAt: -1 })
            .lean();

        const members = records.flatMap((record: any) => {
            const data = { ...(record.data || {}), ...record };
            const name = String(data["নাম"] || data.name || data.Name || "").trim();
            const id = String(
                data.MemberID ||
                data.memberId ||
                data["Member ID"] ||
                data.recordId ||
                "",
            ).trim();

            if (!name || !id) return [];

            const nameEn = String(data.nameEn || data.nameEnglish || data.Name || name).trim();
            const role = String(data.role || data.position || "সদস্য").trim();
            const roleEn = String(data.roleEn || data.roleEnglish || "Member").trim();

            return [{ id, name, nameEn, role, roleEn }];
        });

        return NextResponse.json({ success: true, members });
    } catch (error) {
        console.error("GET PUBLIC MEMBERS ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                message: "সদস্যদের তথ্য লোড করা যায়নি।",
            },
            { status: 500 },
        );
    }
}
