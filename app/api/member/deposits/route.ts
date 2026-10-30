// বাংলা: এই API route-এ member → deposits সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";;
import Transaction from "@/models/Transaction";
import User from "@/models/user";
import { requireRole } from "@/lib/require-auth";

export const runtime = "nodejs";

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    const { user, response } = await requireRole(["member"]);

    if (response) return response;

    try {
        await connectDB();

        const memberProfile = await User.findById(user!.userId)
            .select("name memberId phone")
            .lean();

        const deposits = await Transaction.find({
            member: user!.userId,
            type: "deposit",
        })
            .sort({ date: -1 })
            .select("amount date note status createdAt paymentMethod senderNumber referenceNumber receiptId transactionId approvedBy approvedAt")
            .lean();

        const totalDeposit = deposits
            .filter((item) => item.status === "approved")
            .reduce((sum, item) => sum + item.amount, 0);

        return NextResponse.json({
            deposits: deposits.map((deposit) => ({
                ...deposit,
                receiptId: deposit.receiptId || `RCT-${deposit.transactionId || deposit._id}`,
                memberName: memberProfile?.name || "",
                memberId: memberProfile?.memberId || user!.memberId || "",
                memberPhone: memberProfile?.phone || "",
                approvedBy: "",
                approvedAt: deposit.approvedAt || deposit.updatedAt,
            })),
            totalDeposit,
            totalTransactions: deposits.length,
        });
    } catch (error) {
        console.error("Member deposits error:", error);

        return NextResponse.json(
            { message: "Deposit History লোড করা যায়নি" },
            { status: 500 }
        );
    }
}