// বাংলা: এই API route-এ member → dashboard সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import { Payment, Member } from "@/lib/sheetsModels";

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

        const memberId = user.userId;

        /*
         * User model-এর userId যদি MongoDB _id হয়,
         * তাহলে memberId আলাদা করে নেওয়ার জন্য
         * Member collection থেকে lookup করছি।
         */

        let member = null;

        try {
            member = await Member.findOne({
                sourceSheet: "Members",
                $or: [
                    { recordId: memberId },
                    { "data.MemberID": memberId },
                    { MemberID: memberId },
                ],
            }).lean();
        } catch {
            member = null;
        }

        /*
         * কিছু ক্ষেত্রে JWT-এর userId সরাসরি MemberID হতে পারে।
         */

        const resolvedMemberId =
            member?.data?.MemberID ||
            member?.MemberID ||
            member?.recordId ||
            memberId;

        const paymentDocs = await Payment.find({
            sourceSheet: {
                $in: [
                    "Member Savings",
                    "Deposits",
                    "Withdrawals",
                    "Loans",
                ],
            },
        })
            .sort({ createdAt: -1 })
            .lean();

        const memberPayments = paymentDocs.filter((doc: any) => {
            const data = doc.data || {};

            const id =
                data.MemberID ||
                data.memberId ||
                data["Member ID"] ||
                doc.recordId;

            return String(id) === String(resolvedMemberId);
        });

        let totalDeposit = 0;
        let totalWithdrawal = 0;
        let totalLoan = 0;

        const transactions = memberPayments.map(
            (doc: any) => {
                const data = doc.data || {};

                const amount = Number(
                    data.Amount ||
                    data.amount ||
                    data["টাকা"] ||
                    data.LoanAmount ||
                    data.DepositAmount ||
                    0
                );

                const source = String(
                    doc.sourceSheet || ""
                ).toLowerCase();

                const typeValue = String(
                    data.Type ||
                    data.type ||
                    data["Payment Type"] ||
                    data["Transaction Type"] ||
                    ""
                ).toLowerCase();

                let type:
                    | "deposit"
                    | "withdrawal"
                    | "loan" = "deposit";

                if (
                    source.includes("withdraw") ||
                    typeValue.includes("withdraw")
                ) {
                    type = "withdrawal";
                    totalWithdrawal += amount;
                } else if (
                    source.includes("loan") ||
                    typeValue.includes("loan")
                ) {
                    type = "loan";
                    totalLoan += amount;
                } else {
                    type = "deposit";
                    totalDeposit += amount;
                }

                const date =
                    data["Payment Date"] ||
                    data.PaymentDate ||
                    data.depositDate ||
                    data.withdrawalDate ||
                    data.LoanDate ||
                    doc.createdAt;

                return {
                    id:
                        data.PaymentID ||
                        data.DepositID ||
                        data.WithdrawalID ||
                        data.LoanID ||
                        doc.recordId,

                    transactionId:
                        data.TransactionID ||
                        data.transactionId ||
                        data.PaymentID ||
                        data.DepositID ||
                        data.WithdrawalID ||
                        data.LoanID ||
                        doc.recordId,

                    type,

                    amount,

                    date,

                    status:
                        data.Status ||
                        data.status ||
                        "Approved",

                    paymentMethod:
                        data.Method ||
                        data.method ||
                        data.PaymentMethod ||
                        "",

                    description:
                        data.Description ||
                        data.description ||
                        data.Note ||
                        "",

                    sourceSheet:
                        doc.sourceSheet,
                };
            }
        );

        const currentBalance =
            totalDeposit -
            totalWithdrawal -
            totalLoan;

        return NextResponse.json({
            success: true,

            dashboard: {
                memberId: resolvedMemberId,

                totalDeposit,

                totalWithdrawal,

                totalLoan,

                currentBalance,

                totalTransactions:
                    transactions.length,

                recentTransactions:
                    transactions.slice(0, 10),
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