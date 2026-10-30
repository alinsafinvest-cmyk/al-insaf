// বাংলা: এই API route-এ member → withdrawals সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";;
import Transaction from "@/models/Transaction";
import User from "@/models/user";
import { requireRole } from "@/lib/require-auth";
import {
    isBangladeshPaymentMethod,
    needsPaymentAccount,
} from "@/lib/payment-methods";

export const runtime = "nodejs";

// নিজের Withdrawal History দেখুন
// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    const { user, response } = await requireRole(["member"]);

    if (response) return response;

    try {
        await connectDB();

        const memberProfile = await User.findById(user!.userId)
            .select("name memberId phone")
            .lean();

        const withdrawals = await Transaction.find({
            member: user!.userId,
            type: "withdrawal",
        })
            .sort({ date: -1 })
            .select("amount date note status createdAt paymentMethod accountNumber transactionId receiptId approvedBy approvedAt")
            .lean();

        const totalApproved = withdrawals
            .filter((item) => item.status === "approved")
            .reduce((sum, item) => sum + item.amount, 0);

        const totalPending = withdrawals
            .filter((item) => item.status === "pending")
            .reduce((sum, item) => sum + item.amount, 0);

        return NextResponse.json({
            withdrawals: withdrawals.map((withdrawal) => ({
                ...withdrawal,
                receiptId: withdrawal.receiptId || `WRC-${withdrawal.transactionId || withdrawal._id}`,
                memberName: memberProfile?.name || "",
                memberId: memberProfile?.memberId || user!.memberId || "",
                memberPhone: memberProfile?.phone || "",
                approvedBy: "",
                approvedAt: withdrawal.approvedAt || withdrawal.updatedAt,
            })),
            totalApproved,
            totalPending,
            totalTransactions: withdrawals.length,
        });
    } catch (error) {
        console.error("Withdrawal GET error:", error);

        return NextResponse.json(
            { message: "Withdrawal History লোড করা যায়নি" },
            { status: 500 }
        );
    }
}

// নতুন Withdrawal Request
// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(request: NextRequest) {
    const { user, response } = await requireRole(["member"]);

    if (response) return response;

    try {
        await connectDB();

        const body = await request.json();
        const amount = Number(body.amount);
        const note = typeof body.note === "string" ? body.note.trim() : "";
        const paymentMethod = body.paymentMethod;
        const accountNumber = typeof body.accountNumber === "string"
            ? body.accountNumber.trim()
            : "";

        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json(
                { message: "সঠিক টাকার পরিমাণ লিখুন" },
                { status: 400 }
            );
        }

        if (amount > 1_000_000_000_000) {
            return NextResponse.json(
                { message: "টাকার পরিমাণ অনেক বেশি" },
                { status: 400 }
            );
        }

        if (!isBangladeshPaymentMethod(paymentMethod)) {
            return NextResponse.json(
                { message: "একটি বৈধ উত্তোলন মাধ্যম নির্বাচন করুন" },
                { status: 400 }
            );
        }

        if (needsPaymentAccount(paymentMethod) && !accountNumber) {
            return NextResponse.json(
                { message: "যে নম্বর/ব্যাংক অ্যাকাউন্টে টাকা নিতে চান সেটি লিখুন" },
                { status: 400 }
            );
        }

        // অনুমোদিত লেনদেন থেকে বর্তমান ব্যালেন্স হিসাব
        const transactions = await Transaction.find({
            member: user!.userId,
            status: "approved",
            type: { $in: ["deposit", "withdrawal", "loan", "loan_payment"] },
        })
            .select("type amount")
            .lean();

        const balance = transactions.reduce((total, transaction) => {
            switch (transaction.type) {
                case "deposit":
                case "loan_payment":
                    return total + transaction.amount;
                case "withdrawal":
                case "loan":
                    return total - transaction.amount;
                default:
                    return total;
            }
        }, 0);

        // অন্য Pending Withdrawal-ও বিবেচনায় নিন
        const pendingWithdrawals = await Transaction.aggregate([
            {
                $match: {
                    member: (await import("mongoose")).default.Types.ObjectId.createFromHexString(
                        user!.userId
                    ),
                    type: "withdrawal",
                    status: "pending",
                },
            },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);

        const pendingAmount = pendingWithdrawals[0]?.total ?? 0;

        if (amount > balance - pendingAmount) {
            return NextResponse.json(
                {
                    message: "পর্যাপ্ত ব্যালেন্স নেই অথবা অন্য Withdrawal Request pending আছে",
                },
                { status: 400 }
            );
        }

        const withdrawal = await Transaction.create({
            member: user!.userId,
            type: "withdrawal",
            amount,
            date: new Date(),
            note,
            paymentMethod,
            accountNumber,
            status: "pending",
            createdBy: user!.userId,
        });

        return NextResponse.json(
            {
                message: "Withdrawal Request সফলভাবে জমা হয়েছে",
                withdrawal,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Withdrawal POST error:", error);

        return NextResponse.json(
            { message: "Withdrawal Request জমা দেওয়া যায়নি" },
            { status: 500 }
        );
    }
}