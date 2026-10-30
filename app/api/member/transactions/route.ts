// বাংলা: এই API route-এ member → transactions সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";;
import { getAuthUser } from "@/lib/auth";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs";

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        const auth = await getAuthUser();

        if (!auth) {
            return NextResponse.json(
                { message: "প্রথমে লগইন করুন" },
                { status: 401 }
            );
        }

        if (auth.role !== "member") {
            return NextResponse.json(
                { message: "শুধু মেম্বাররা এই তথ্য দেখতে পারবেন" },
                { status: 403 }
            );
        }

        await connectDB();

        const transactions = await Transaction.find({
            member: auth.userId,
        })
            .select("type amount date note status transactionId")
            .sort({ date: -1, createdAt: -1 })
            .lean();

        const approved = transactions.filter(
            (item) => item.status === "approved"
        );

        const summary = {
            totalDeposit: 0,
            totalWithdrawal: 0,
            totalLoan: 0,
            totalLoanPayment: 0,
        };

        for (const item of approved) {
            const amount = Number(item.amount) || 0;

            switch (item.type) {
                case "deposit":
                    summary.totalDeposit += amount;
                    break;
                case "withdrawal":
                    summary.totalWithdrawal += amount;
                    break;
                case "loan":
                    summary.totalLoan += amount;
                    break;
                case "loan_payment":
                    summary.totalLoanPayment += amount;
                    break;
            }
        }

        return NextResponse.json({
            transactions,
            summary,
            totalTransactions: transactions.length,
        });
    } catch (error) {
        console.error("Member transactions error:", error);

        return NextResponse.json(
            { message: "লেনদেনের তথ্য লোড করা যায়নি" },
            { status: 500 }
        );
    }
}