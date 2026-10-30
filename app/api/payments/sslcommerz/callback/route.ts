// বাংলা: এই API route-এ payments → sslcommerz → callback সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
    getSslCommerzConfig,
    getSslCommerzReturnUrl,
    validateSslCommerzTransaction,
} from "@/lib/sslcommerz";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(request: NextRequest) {
    const result = new URL(request.url).searchParams.get("result");
    const isIpn = result === "ipn";

    try {
        const config = getSslCommerzConfig();
        const form = await request.formData();
        const transactionId = readFormValue(form, "tran_id");

        if (result === "failed") {
            if (transactionId) {
                await connectDB();
                await Transaction.updateOne(
                    {
                        transactionId,
                        paymentProvider: "sslcommerz",
                        type: "deposit",
                        status: "pending",
                    },
                    { $set: { gatewayStatus: "failed_or_cancelled" } },
                );
            }
            return callbackResponse(config, isIpn, "failed");
        }

        if (result !== "success" && !isIpn) {
            return callbackResponse(config, false, "failed");
        }

        const validationId = readFormValue(form, "val_id");
        if (!transactionId || !validationId) {
            return callbackResponse(config, isIpn, "failed", 400);
        }

        await connectDB();
        const deposit = await Transaction.findOne({
            transactionId,
            paymentProvider: "sslcommerz",
            type: "deposit",
        }).select("_id amount status gatewayValidationId");

        if (!deposit) {
            return callbackResponse(config, isIpn, "failed", 404);
        }

        if (
            deposit.status === "approved" &&
            deposit.gatewayValidationId === validationId
        ) {
            return callbackResponse(config, isIpn, "success");
        }

        if (deposit.status !== "pending") {
            return callbackResponse(config, isIpn, "failed", 409);
        }

        const validation = await validateSslCommerzTransaction(
            config,
            validationId,
        );
        const validationStatus = String(validation.status || "").toUpperCase();
        const validatedTransactionId = String(validation.tran_id || "");
        const validatedAmount = Number(validation.amount);
        const validatedCurrency = String(
            validation.currency || validation.currency_type || "",
        ).toUpperCase();
        const amountMatches =
            Number.isFinite(validatedAmount) &&
            Math.round(validatedAmount * 100) ===
                Math.round(deposit.amount * 100);
        const validStatus =
            validationStatus === "VALID" ||
            validationStatus === "VALIDATED";

        if (
            !validStatus ||
            validatedTransactionId !== transactionId ||
            validatedCurrency !== "BDT" ||
            !amountMatches
        ) {
            await Transaction.updateOne(
                { _id: deposit._id, status: "pending" },
                { $set: { gatewayStatus: "validation_failed" } },
            );
            return callbackResponse(config, isIpn, "failed", 400);
        }

        const update = await Transaction.updateOne(
            {
                _id: deposit._id,
                status: "pending",
                paymentProvider: "sslcommerz",
                amount: deposit.amount,
            },
            {
                $set: {
                    status: "approved",
                    gatewayStatus: "validated",
                    gatewayValidationId: validationId,
                    referenceNumber: String(validation.bank_tran_id || validationId),
                },
            },
        );

        if (update.modifiedCount !== 1) {
            const latest = await Transaction.findById(deposit._id)
                .select("status gatewayValidationId")
                .lean();
            const alreadyProcessed =
                latest?.status === "approved" &&
                latest.gatewayValidationId === validationId;
            return callbackResponse(
                config,
                isIpn,
                alreadyProcessed ? "success" : "failed",
                alreadyProcessed ? 200 : 409,
            );
        }

        return callbackResponse(config, isIpn, "success");
    } catch (error) {
        console.error(
            "SSLCommerz callback processing failed:",
            error instanceof Error ? error.message : "unknown error",
        );

        try {
            const config = getSslCommerzConfig();
            return callbackResponse(config, isIpn, "failed", 502);
        } catch {
            return NextResponse.json(
                { success: false, message: "Payment callback configuration error" },
                { status: 500 },
            );
        }
    }
}

function readFormValue(form: FormData, key: string) {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function callbackResponse(
    config: ReturnType<typeof getSslCommerzConfig>,
    isIpn: boolean,
    outcome: "success" | "failed",
    status = 200,
) {
    if (isIpn) {
        return NextResponse.json(
            { success: outcome === "success" },
            { status },
        );
    }

    return NextResponse.redirect(
        getSslCommerzReturnUrl(config, outcome),
        303,
    );
}
