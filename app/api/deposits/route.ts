// বাংলা: এই API route-এ deposits সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import User from "@/models/user";
import Transaction from "@/models/Transaction";
import {
    isBangladeshPaymentMethod,
    needsPaymentAccount,
} from "@/lib/payment-methods";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ============================================================
// GET ALL DEPOSITS
// ============================================================

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const members = await User.find({
            role: "member",
            isActive: true,
        })
            .select("_id name email memberId phone")
            .sort({ name: 1 })
            .lean();

        const deposits = await Transaction.find({
            type: "deposit",
        })
            .populate(
                "member",
                "_id name email memberId phone"
            )
            .populate(
                "approvedBy",
                "_id name email"
            )
            .populate(
                "rejectedBy",
                "_id name email"
            )
            .sort({
                createdAt: -1,
            })
            .lean();

        return NextResponse.json({
            success: true,
            members,
            deposits,
        });
    } catch (error) {
        console.error("GET deposits error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Deposit data load করা যায়নি",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// CREATE NEW DEPOSIT REQUEST
// ============================================================

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(request: Request) {
    try {
        const auth = await requireRole([
            "admin",
            "member",
        ]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const body = await request.json();

        let memberId = String(
            body.memberId || ""
        ).trim();

        const amount = Number(body.amount);

        const date = String(
            body.date || ""
        ).trim();

        const note = String(
            body.note || ""
        ).trim();

        const paymentMethod = String(
            body.paymentMethod || ""
        ).trim();

        const senderNumber = String(
            body.senderNumber || ""
        ).trim();

        const referenceNumber = String(
            body.referenceNumber || ""
        ).trim();

        const proofImage = String(
            body.proofImage || ""
        );

        const proofImageName = String(
            body.proofImageName || ""
        );

        // ----------------------------------------------------
        // MEMBER LOGIN করলে নিজের member ID automatically use
        // ----------------------------------------------------

        if (
            auth.user?.role === "member"
        ) {
            const loggedInUser = await User.findById(
                auth.user.userId
            )
                .select("_id memberId")
                .lean();

            if (!loggedInUser) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "Member account পাওয়া যায়নি",
                    },
                    { status: 404 }
                );
            }

            memberId = String(
                loggedInUser._id
            );
        }

        if (!memberId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Member নির্বাচন করুন",
                },
                { status: 400 }
            );
        }

        if (!amount || amount <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    message: "সঠিক amount দিন",
                },
                { status: 400 }
            );
        }

        if (!date) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Deposit date দিন",
                },
                { status: 400 }
            );
        }

        if (auth.user?.role === "member") {
            if (!isBangladeshPaymentMethod(paymentMethod)) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "একটি বৈধ জমার মাধ্যম নির্বাচন করুন",
                    },
                    { status: 400 }
                );
            }

            if (
                needsPaymentAccount(paymentMethod) &&
                !senderNumber
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "যে নম্বর/অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন সেটি লিখুন",
                    },
                    { status: 400 }
                );
            }

            if (
                ["bKash", "Nagad", "Rocket", "Upay"].includes(paymentMethod) &&
                !referenceNumber
            ) {
                return NextResponse.json(
                    {
                        success: false,
                        message: "পেমেন্টের Transaction ID লিখুন",
                    },
                    { status: 400 }
                );
            }
        } else if (
            paymentMethod &&
            !isBangladeshPaymentMethod(paymentMethod) &&
            paymentMethod !== "Bank"
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "বৈধ পেমেন্ট মাধ্যম নির্বাচন করুন",
                },
                { status: 400 }
            );
        }

        // ----------------------------------------------------
        // MEMBER CHECK
        // ----------------------------------------------------

        const member = await User.findOne({
            _id: memberId,
            role: "member",
            isActive: true,
        })
            .select(
                "_id name email memberId phone"
            );

        if (!member) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Active member পাওয়া যায়নি",
                },
                { status: 404 }
            );
        }

        // ----------------------------------------------------
        // TRANSACTION ID
        // ----------------------------------------------------

        const transactionId =
            "DEP-" +
            Date.now()
                .toString(36)
                .toUpperCase();

        // ----------------------------------------------------
        // CREATE
        // ----------------------------------------------------

        const deposit =
            await Transaction.create({
                member: member._id,

                transactionId,

                type: "deposit",

                amount,

                date: new Date(
                    `${date}T00:00:00`
                ),

                note,

                paymentMethod,

                senderNumber,

                referenceNumber,

                proofImage,

                proofImageName,

                // IMPORTANT
                // New deposit is always pending
                status: "pending",

                createdBy:
                    auth.user?.userId,
            });

        const populatedDeposit =
            await Transaction.findById(
                deposit._id
            )
                .populate(
                    "member",
                    "_id name email memberId phone"
                )
                .lean();

        return NextResponse.json(
            {
                success: true,

                message:
                    "Deposit request সফলভাবে জমা হয়েছে। Admin approval-এর অপেক্ষায় আছে।",

                deposit: populatedDeposit,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(
            "POST deposits error:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    "Deposit request তৈরি করা যায়নি",
            },
            {
                status: 500,
            }
        );
    }
}