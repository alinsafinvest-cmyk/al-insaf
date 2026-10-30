// বাংলা: এই API route-এ payments → sslcommerz → init সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import {
    getSslCommerzConfig,
    requestSslCommerzSession,
} from "@/lib/sslcommerz";
import Transaction from "@/models/Transaction";
import User from "@/models/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(request: NextRequest) {
    const { user, response } = await requireRole(["member"]);
    if (response) return response;

    let transactionId = "";
    try {
        const config = getSslCommerzConfig();
        const body = await request.json();
        const amount = Number(body.amount);

        if (!Number.isFinite(amount) || amount < 10 || amount > 500_000) {
            return NextResponse.json(
                { message: "SSLCommerz-এ জমার পরিমাণ ৳১০ থেকে ৳৫,০০,০০০ হতে হবে" },
                { status: 400 },
            );
        }

        await connectDB();
        const member = await User.findOne({
            _id: user!.userId,
            role: "member",
            isActive: true,
        }).select("name email phone memberId");

        if (!member) {
            return NextResponse.json(
                { message: "সক্রিয় সদস্য অ্যাকাউন্ট পাওয়া যায়নি" },
                { status: 404 },
            );
        }

        if (!member.phone?.trim()) {
            return NextResponse.json(
                { message: "অনলাইন পেমেন্টের আগে আপনার প্রোফাইলে একটি যোগাযোগ নম্বর যোগ করুন" },
                { status: 400 },
            );
        }

        transactionId = `DEP${randomUUID().replaceAll("-", "").slice(0, 24)}`;
        const deposit = await Transaction.create({
            member: member._id,
            transactionId,
            type: "deposit",
            amount,
            date: new Date(),
            note: "SSLCommerz online deposit",
            paymentMethod: "SSLCommerz",
            paymentProvider: "sslcommerz",
            gatewayStatus: "initiated",
            status: "pending",
            createdBy: member._id,
        });

        const callbackUrl = new URL(
            "api/payments/sslcommerz/callback",
            config.appUrl,
        );
        const fields = new URLSearchParams({
            store_id: config.storeId,
            store_passwd: config.storePassword,
            total_amount: amount.toFixed(2),
            currency: "BDT",
            tran_id: transactionId,
            success_url: `${callbackUrl}?result=success`,
            fail_url: `${callbackUrl}?result=failed`,
            cancel_url: `${callbackUrl}?result=failed`,
            ipn_url: `${callbackUrl}?result=ipn`,
            shipping_method: "NO",
            product_name: "Member deposit",
            product_category: "Financial service",
            product_profile: "general",
            cus_name: member.name,
            cus_email: member.email,
            cus_add1: "Bangladesh",
            cus_city: "Dhaka",
            cus_country: "Bangladesh",
            cus_phone: member.phone,
            value_a: String(deposit._id),
        });

        const gatewayResponse = await requestSslCommerzSession(
            config,
            fields,
        );
        const gatewayUrl = gatewayResponse.GatewayPageURL;
        const redirect = typeof gatewayUrl === "string"
            ? new URL(gatewayUrl)
            : null;

        if (
            gatewayResponse.status !== "SUCCESS" ||
            !redirect ||
            redirect.protocol !== "https:" ||
            ![
                "sandbox.sslcommerz.com",
                "securepay.sslcommerz.com",
            ].includes(redirect.hostname)
        ) {
            await Transaction.updateOne(
                { _id: deposit._id, status: "pending" },
                {
                    $set: {
                        status: "rejected",
                        gatewayStatus: "initialization_failed",
                    },
                },
            );
            return NextResponse.json(
                { message: "পেমেন্ট সেশন তৈরি করা যায়নি। পরে আবার চেষ্টা করুন।" },
                { status: 502 },
            );
        }

        return NextResponse.json({ redirectUrl: redirect.toString() });
    } catch (error) {
        if (transactionId) {
            await Transaction.updateOne(
                {
                    transactionId,
                    paymentProvider: "sslcommerz",
                    status: "pending",
                },
                {
                    $set: {
                        gatewayStatus: "initialization_uncertain",
                    },
                },
            ).catch((updateError: unknown) => {
                console.error(
                    "Failed to update SSLCommerz deposit after session initialization error:",
                    updateError instanceof Error
                        ? updateError.message
                        : "unknown error",
                );
            });
        }
        console.error(
            "SSLCommerz session initialization failed:",
            error instanceof Error ? error.message : "unknown error",
        );

        const unconfigured =
            error instanceof Error &&
            (
                error.message.includes("must be set") ||
                error.message.includes("must be configured") ||
                error.message.includes("APP_URL")
            );

        return NextResponse.json(
            {
                message: unconfigured
                    ? "SSLCommerz এখনো কনফিগার করা হয়নি। সার্ভারের payment credentials সেট করুন।"
                    : "পেমেন্ট সেশন তৈরি করা যায়নি। পরে আবার চেষ্টা করুন।",
            },
            { status: unconfigured ? 503 : 502 },
        );
    }
}
