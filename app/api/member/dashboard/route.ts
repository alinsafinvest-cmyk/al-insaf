// বাংলা: এই API route-এ member → dashboard সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    message: "প্রথমে লগইন করুন",
                },
                { status: 401 }
            );
        }

        if (user.role !== "member") {
            return NextResponse.json(
                {
                    success: false,
                    message: "এই কাজের অনুমতি নেই",
                },
                { status: 403 }
            );
        }

        await connectDB();

        if (!mongoose.Types.ObjectId.isValid(user.userId)) {
            return NextResponse.json(
                { success: false, message: "সদস্য account সঠিক নয়" },
                { status: 401 }
            );
        }

        const member = new mongoose.Types.ObjectId(user.userId);
        const [summary] = await Transaction.aggregate<{
            totalDeposit: number;
            totalWithdrawal: number;
            totalLoan: number;
            totalLoanPayment: number;
            totalTransactions: number;
        }>([
            { $match: { member } },
            {
                $group: {
                    _id: null,
                    totalDeposit: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$type", "deposit"] }, { $eq: ["$status", "approved"] }] },
                                "$amount",
                                0,
                            ],
                        },
                    },
                    totalWithdrawal: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$type", "withdrawal"] }, { $eq: ["$status", "approved"] }] },
                                "$amount",
                                0,
                            ],
                        },
                    },
                    totalLoan: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$type", "loan"] }, { $eq: ["$status", "approved"] }] },
                                "$amount",
                                0,
                            ],
                        },
                    },
                    totalLoanPayment: {
                        $sum: {
                            $cond: [
                                { $and: [{ $eq: ["$type", "loan_payment"] }, { $eq: ["$status", "approved"] }] },
                                "$amount",
                                0,
                            ],
                        },
                    },
                    totalTransactions: { $sum: 1 },
                },
            },
        ]);

        const recentTransactions = await Transaction.find({ member })
            .select("type amount date note status transactionId")
            .sort({ date: -1, createdAt: -1 })
            .limit(8)
            .lean();

        const totalDeposit = summary?.totalDeposit ?? 0;
        const totalWithdrawal = summary?.totalWithdrawal ?? 0;
        const totalLoan = summary?.totalLoan ?? 0;
        const totalLoanPayment = summary?.totalLoanPayment ?? 0;

        return NextResponse.json({
            success: true,
            dashboard: {
                totalDeposit,
                totalWithdrawal,
                totalLoan,
                totalLoanPayment,
                pendingTransactions: await Transaction.countDocuments({
                    member,
                    status: "pending",
                }),
                totalTransactions: summary?.totalTransactions ?? 0,
                currentBalance:
                    totalDeposit + totalLoanPayment - totalWithdrawal - totalLoan,
                recentTransactions,
            },
        });
    } catch (error) {
        console.error(
            "Member dashboard error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Member dashboard data load করা যায়নি",
            },
            { status: 500 }
        );
    }
}