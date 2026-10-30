// বাংলা: এই API route-এ member → loans সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";;
import Transaction from "@/models/Transaction";
import { requireRole } from "@/lib/require-auth";

export const runtime = "nodejs";

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    const { user, response } = await requireRole(["member"]);

    if (response) return response;

    try {
        await connectDB();

        const transactions = await Transaction.find({
            member: user!.userId,
            type: { $in: ["loan", "loan_payment"] },
        })
            .select("type amount date note status createdAt")
            .sort({ date: -1 })
            .lean();

        const approvedLoans = transactions.filter(
            (item) => item.type === "loan" && item.status === "approved"
        );

        const approvedPayments = transactions.filter(
            (item) =>
                item.type === "loan_payment" && item.status === "approved"
        );

        const totalLoan = approvedLoans.reduce(
            (sum, item) => sum + item.amount,
            0
        );

        const totalPaid = approvedPayments.reduce(
            (sum, item) => sum + item.amount,
            0
        );

        const pendingLoan = transactions
            .filter(
                (item) => item.type === "loan" && item.status === "pending"
            )
            .reduce((sum, item) => sum + item.amount, 0);

        return NextResponse.json({
            transactions,
            totalLoan,
            totalPaid,
            remainingLoan: Math.max(0, totalLoan - totalPaid),
            pendingLoan,
        });
    } catch (error) {
        console.error("Member loans error:", error);

        return NextResponse.json(
            { message: "ঋণের হিসাব লোড করা যায়নি" },
            { status: 500 }
        );
    }
}