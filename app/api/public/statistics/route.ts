// বাংলা: এই API route-এ public → statistics সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { Member, Payment, SystemConfig } from "@/lib/sheetsModels";
import Transaction from "@/models/Transaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getData(record: any) {
    return { ...(record?.data || {}), ...record };
}

function toNumber(value: unknown) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (value === undefined || value === null || value === "") return 0;

    const parsed = Number(String(value).replace(/,/g, "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
}

function isApproved(record: Record<string, any>) {
    const status = String(record.Status ?? record.status ?? "").trim().toLowerCase();
    return !["pending", "processing", "submitted", "rejected", "reject", "failed", "cancelled"].includes(status);
}

function getTransactionType(record: Record<string, any>) {
    const source = String(record.sourceSheet || "").trim().toLowerCase();
    const type = String(
        record.Type ??
        record.type ??
        record["Payment Type"] ??
        record["Transaction Type"] ??
        "",
    ).trim().toLowerCase();

    if (source.includes("withdraw")) return null;
    if (source.includes("loan") || type.includes("loan") || record.LoanID || record.loanId) {
        return "loan";
    }
    if (
        source.includes("deposit") ||
        source.includes("saving") ||
        type.includes("deposit") ||
        type.includes("saving") ||
        type.includes("payment") ||
        record.DepositID ||
        record.depositId
    ) {
        return "deposit";
    }
    return null;
}

function yearsSince(value: unknown) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const foundedAt = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(foundedAt.getTime()) || foundedAt > new Date()) return null;

    const now = new Date();
    let years = now.getUTCFullYear() - foundedAt.getUTCFullYear();
    if (
        now.getUTCMonth() < foundedAt.getUTCMonth() ||
        (now.getUTCMonth() === foundedAt.getUTCMonth() && now.getUTCDate() < foundedAt.getUTCDate())
    ) {
        years -= 1;
    }
    return years;
}

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        await connectDB();

        const [members, payments, transactions, config] = await Promise.all([
            Member.find({ sourceSheet: "Members" }).lean(),
            Payment.find({}).lean(),
            Transaction.find({
                type: { $in: ["deposit", "loan"] },
                status: "approved",
            }).select("type amount").lean(),
            SystemConfig.findOne({
                sourceSheet: "SystemConfig",
                recordId: "SYSTEM",
            }).lean(),
        ]);

        const activeMembers = members.filter((member: any) => {
            const data = getData(member);
            const status = String(
                data.Status ?? data.status ?? data.LoginStatus ?? data.loginStatus ?? "",
            ).trim().toLowerCase();
            return !status || status === "active" || status === "সক্রিয়";
        }).length;

        let loansDistributed = 0;
        let savingsCollected = 0;

        for (const payment of payments as any[]) {
            const data = getData(payment);
            if (!isApproved(data)) continue;

            const transactionType = getTransactionType(data);
            const amount = toNumber(
                data.Amount ??
                data.amount ??
                data.DepositAmount ??
                data.depositAmount ??
                data.LoanAmount ??
                data.loanAmount ??
                data["টাকা"],
            );

            if (transactionType === "loan") loansDistributed += amount;
            if (transactionType === "deposit") savingsCollected += amount;
        }

        for (const transaction of transactions as any[]) {
            const amount = toNumber(transaction.amount);
            if (transaction.type === "loan") loansDistributed += amount;
            if (transaction.type === "deposit") savingsCollected += amount;
        }

        const settings = (config as any)?.data || {};

        return NextResponse.json({
            success: true,
            statistics: {
                activeMembers,
                loansDistributed,
                savingsCollected,
                yearsOfExperience: yearsSince(settings.foundedAt),
            },
        });
    } catch (error) {
        console.error("GET PUBLIC STATISTICS ERROR:", error);
        return NextResponse.json(
            {
                success: false,
                message: "পরিসংখ্যান লোড করা যায়নি।",
            },
            { status: 500 },
        );
    }
}
