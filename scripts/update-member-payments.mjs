// বাংলা: এই script-এ নির্দিষ্ট member payment record database-এ হালনাগাদ করা হয়।
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({
    path: ".env.local",
});

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI পাওয়া যায়নি");
}

/* =========================================
   SETTINGS
========================================= */

// প্রথমবার অবশ্যই true রাখবে
// এতে database পরিবর্তন হবে না।
const DRY_RUN = false;

/* =========================================
   Verified Name Mapping
========================================= */

const NAME_MAPPING = {
    "মুফতি শুআইব আহমাদ": "M001",
    "মুফতি আবদুল আহাদ": "M002",
    "মুফতি তানভীর আহমাদ": "M003",
    "মাওলানা আমানুল্লাহ": "M004",
    "হাফেজ হাবিবুর রহমান": "M005",
    "মুফতি আবু সাঈদ": "M006",

    "মুফতি রফিকুল ইস.রুম্মান": "M007",
    "মুফতি ইউসুফ ফারাবী": "M008",

    "মাওলানা মাসুম বিল্লাহ": "M012",
};

/* =========================================
   Schema
========================================= */

const sheetRecordSchema = new mongoose.Schema(
    {
        sourceSheet: String,
        recordId: String,
        data: mongoose.Schema.Types.Mixed,
    },
    {
        strict: false,
        collection: "payments",
    }
);

const Payment =
    mongoose.models.AlInsafPayment ||
    mongoose.model(
        "AlInsafPayment",
        sheetRecordSchema,
        "payments"
    );

/* =========================================
   Normalize Name
========================================= */

function normalizeName(value = "") {
    let name = String(value)
        .normalize("NFKC")
        .toLowerCase()
        .trim();

    name = name.replace(/[()[\]{}.,،؛;:：\-_/\\|]/g, " ");

    const replacements = [
        ["য়", "য়"],
        ["ড়", "ড়"],
        ["ঢ়", "ঢ়"],

        ["আহমাদ", "আহমদ"],
        ["হাবীবুর", "হাবিবুর"],
        ["আব্দুল", "আবদুল"],
        ["আব্দুর", "আবদুর"],
        ["সাঈদ", "সাইদ"],
    ];

    for (const [from, to] of replacements) {
        name = name.split(from).join(to);
    }

    name = name.replace(/\s+/g, " ").trim();

    return name;
}

/* =========================================
   Get Payment Name
========================================= */

function getPaymentMemberName(payment) {
    return (
        payment.data?.memberName ||
        payment.data?.MemberName ||
        payment.data?.["নাম"] ||
        payment.data?.name ||
        payment.memberName ||
        payment.MemberName ||
        ""
    );
}

/* =========================================
   Get Payment ID
========================================= */

function getPaymentId(payment) {
    return (
        payment.recordId ||
        payment.data?.paymentId ||
        payment.data?.PaymentID ||
        payment._id?.toString() ||
        ""
    );
}

/* =========================================
   Main
========================================= */

// বাংলা: এই script-এ নির্দিষ্ট member payment record database-এ হালনাগাদ করা হয়।
async function main() {
    console.log("");
    console.log("======================================");
    console.log("💰 MEMBER PAYMENT MAPPING");
    console.log("======================================");
    console.log("");

    if (DRY_RUN) {
        console.log("🟡 DRY RUN MODE");
        console.log("⚠️ MongoDB-তে কোনো পরিবর্তন হবে না");
    } else {
        console.log("🔴 LIVE UPDATE MODE");
        console.log("⚠️ MongoDB payment records update হবে");
    }

    console.log("");

    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected");
    console.log("");

    /* =========================================
       Load all unmatched payments
    ========================================= */

    const payments = await Payment.find({
        sourceSheet: "Member Savings",
        $or: [
            { "data.memberId": { $exists: false } },
            { "data.memberId": null },
            { "data.memberId": "" },
        ],
    }).lean();

    console.log(
        `📦 Unmatched payment records: ${payments.length}`
    );

    console.log("");

    /* =========================================
       Prepare Updates
    ========================================= */

    const updates = [];

    const summary = {};

    for (const payment of payments) {
        const originalName = getPaymentMemberName(payment);

        if (!originalName) {
            continue;
        }

        const normalizedName = normalizeName(originalName);

        let memberId = null;

        for (const [mappingName, mappedMemberId] of Object.entries(
            NAME_MAPPING
        )) {
            if (
                normalizeName(mappingName) === normalizedName
            ) {
                memberId = mappedMemberId;
                break;
            }
        }

        if (!memberId) {
            continue;
        }

        updates.push({
            paymentId: getPaymentId(payment),
            mongoId: payment._id,
            memberName: originalName,
            memberId,
        });

        if (!summary[memberId]) {
            summary[memberId] = {
                count: 0,
                names: new Set(),
            };
        }

        summary[memberId].count++;
        summary[memberId].names.add(originalName);
    }

    /* =========================================
       Preview
    ========================================= */

    console.log("======================================");
    console.log("📋 UPDATE PREVIEW");
    console.log("======================================");
    console.log("");

    if (updates.length === 0) {
        console.log("⚠️ কোনো matching payment পাওয়া যায়নি।");
        await mongoose.disconnect();
        return;
    }

    for (const [memberId, info] of Object.entries(summary)) {
        console.log(
            `👤 ${memberId} → ${info.count} payments`
        );

        console.log(
            `   Names: ${[...info.names].join(", ")}`
        );

        console.log("");
    }

    console.log(
        `📊 মোট update করার সম্ভাব্য records: ${updates.length}`
    );

    console.log("");

    /* =========================================
       Detailed Records
    ========================================= */

    console.log("======================================");
    console.log("🔎 PAYMENT DETAILS");
    console.log("======================================");
    console.log("");

    for (const item of updates) {
        console.log(
            `${item.paymentId} | ${item.memberName} → ${item.memberId}`
        );
    }

    console.log("");

    /* =========================================
       DRY RUN
    ========================================= */

    if (DRY_RUN) {
        console.log("======================================");
        console.log("🟡 DRY RUN COMPLETE");
        console.log("======================================");
        console.log("");
        console.log(
            "কোনো MongoDB record পরিবর্তন করা হয়নি।"
        );
        console.log("");
        console.log(
            "সবকিছু ঠিক থাকলে DRY_RUN = false করে আবার চালাবে।"
        );

        await mongoose.disconnect();

        console.log("✅ MongoDB disconnected");

        return;
    }

    /* =========================================
       LIVE UPDATE
    ========================================= */

    console.log("======================================");
    console.log("🔴 STARTING LIVE UPDATE");
    console.log("======================================");
    console.log("");

    let updatedCount = 0;

    for (const item of updates) {
        const result = await Payment.updateOne(
            {
                _id: item.mongoId,
                sourceSheet: "Member Savings",

                // নিরাপত্তার জন্য শুধু এখনও empty memberId
                // থাকলেই update করবে
                $or: [
                    {
                        "data.memberId": {
                            $exists: false,
                        },
                    },
                    {
                        "data.memberId": null,
                    },
                    {
                        "data.memberId": "",
                    },
                ],
            },
            {
                $set: {
                    "data.memberId": item.memberId,
                    "data.memberMatchedName": item.memberName,
                    "data.memberMatchSource":
                        "Manual Verified Mapping",
                    "data.memberMatchedAt": new Date(),
                    syncedAt: new Date(),
                },
            }
        );

        if (result.modifiedCount === 1) {
            updatedCount++;

            console.log(
                `✅ ${item.paymentId} → ${item.memberId}`
            );
        }
    }

    console.log("");
    console.log("======================================");
    console.log("✅ UPDATE COMPLETE");
    console.log("======================================");
    console.log("");
    console.log(
        `Updated payments: ${updatedCount}`
    );

    await mongoose.disconnect();

    console.log("✅ MongoDB disconnected");
}

main().catch(async (error) => {
    console.error("");
    console.error("❌ ERROR:");
    console.error(error);
    console.error("");

    try {
        await mongoose.disconnect();
    } catch {}

    process.exit(1);
});
