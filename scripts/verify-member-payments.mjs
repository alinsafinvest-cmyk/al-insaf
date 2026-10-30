// বাংলা: এই script-এ database-এর member payment record যাচাই করা হয়।
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI missing");
}

const PaymentSchema = new mongoose.Schema(
    {
        sourceSheet: String,
        recordId: String,
        data: mongoose.Schema.Types.Mixed,
        syncedAt: Date,
    },
    {
        strict: false,
        collection: "payments",
    }
);

const Payment =
    mongoose.models.VerifyPayment ||
    mongoose.model("VerifyPayment", PaymentSchema);

const MemberSchema = new mongoose.Schema(
    {},
    {
        strict: false,
        collection: "members",
    }
);

const Member =
    mongoose.models.VerifyMember ||
    mongoose.model("VerifyMember", MemberSchema);

// বাংলা: এই script-এ database-এর member payment record যাচাই করা হয়।
async function main() {
    await mongoose.connect(MONGODB_URI);

    console.log("\n======================================");
    console.log("🔎 MEMBER PAYMENT VERIFICATION");
    console.log("======================================\n");

    // --------------------------------------------------
    // 1. Total imported payments
    // --------------------------------------------------

    const totalPayments = await Payment.countDocuments({
        sourceSheet: "Member Savings",
    });

    // --------------------------------------------------
    // 2. Matched payments
    // --------------------------------------------------

    const matchedPayments = await Payment.countDocuments({
        sourceSheet: "Member Savings",
        "data.memberId": {
            $exists: true,
            $nin: [null, ""],
        },
    });

    // --------------------------------------------------
    // 3. Unmatched payments
    // --------------------------------------------------

    const unmatchedPayments = await Payment.countDocuments({
        sourceSheet: "Member Savings",
        $or: [
            { "data.memberId": { $exists: false } },
            { "data.memberId": null },
            { "data.memberId": "" },
        ],
    });

    console.log(`📦 Total Payments     : ${totalPayments}`);
    console.log(`✅ Matched Payments   : ${matchedPayments}`);
    console.log(`⚠️ Unmatched Payments : ${unmatchedPayments}`);

    console.log("\n--------------------------------------");
    console.log("📊 CONSISTENCY CHECK");
    console.log("--------------------------------------");

    console.log(
        `Total = Matched + Unmatched → ${matchedPayments + unmatchedPayments}`
    );

    if (matchedPayments + unmatchedPayments === totalPayments) {
        console.log("✅ Payment count is consistent");
    } else {
        console.log("❌ Payment count mismatch!");
    }

    // --------------------------------------------------
    // 4. Member-wise matched payments
    // --------------------------------------------------

    const memberSummary = await Payment.aggregate([
        {
            $match: {
                sourceSheet: "Member Savings",
                "data.memberId": {
                    $exists: true,
                    $nin: [null, ""],
                },
            },
        },
        {
            $group: {
                _id: "$data.memberId",
                paymentCount: { $sum: 1 },
                totalAmount: {
                    $sum: {
                        $convert: {
                            input: "$data.amount",
                            to: "double",
                            onError: 0,
                            onNull: 0,
                        },
                    },
                },
            },
        },
        {
            $sort: {
                _id: 1,
            },
        },
    ]);

    console.log("\n--------------------------------------");
    console.log("👥 MEMBER-WISE PAYMENTS");
    console.log("--------------------------------------");

    for (const item of memberSummary) {
        console.log(
            `${item._id} → ${item.paymentCount} payments → ৳${item.totalAmount.toLocaleString()}`
        );
    }

    // --------------------------------------------------
    // 5. Check duplicate payment IDs
    // --------------------------------------------------

    const duplicatePayments = await Payment.aggregate([
        {
            $match: {
                sourceSheet: "Member Savings",
            },
        },
        {
            $group: {
                _id: "$recordId",
                count: { $sum: 1 },
            },
        },
        {
            $match: {
                count: { $gt: 1 },
            },
        },
        {
            $sort: {
                count: -1,
            },
        },
    ]);

    console.log("\n--------------------------------------");
    console.log("🧾 DUPLICATE PAYMENT IDs");
    console.log("--------------------------------------");

    if (duplicatePayments.length === 0) {
        console.log("✅ No duplicate payment IDs found");
    } else {
        for (const item of duplicatePayments) {
            console.log(
                `❌ ${item._id} → ${item.count} records`
            );
        }
    }

    // --------------------------------------------------
    // 6. Verify member IDs actually exist
    // --------------------------------------------------

    const matchedMemberIds = [
        ...new Set(
            (
                await Payment.find({
                    sourceSheet: "Member Savings",
                    "data.memberId": {
                        $exists: true,
                        $nin: [null, ""],
                    },
                })
                    .select("data.memberId")
                    .lean()
            )
                .map((p) => p.data?.memberId)
                .filter(Boolean)
        ),
    ];

    const existingMembers = await Member.find({
        memberId: { $in: matchedMemberIds },
    })
        .select("memberId name")
        .lean();

    const existingMemberIds = new Set(
        existingMembers.map((m) => m.memberId)
    );

    const invalidMemberIds = matchedMemberIds.filter(
        (id) => !existingMemberIds.has(id)
    );

    console.log("\n--------------------------------------");
    console.log("🔐 MEMBER ID VALIDATION");
    console.log("--------------------------------------");

    console.log(
        `Matched Member IDs : ${matchedMemberIds.length}`
    );
    console.log(
        `Valid Member IDs   : ${existingMemberIds.size}`
    );

    if (invalidMemberIds.length === 0) {
        console.log("✅ All matched Member IDs exist in members collection");
    } else {
        console.log("❌ Invalid Member IDs:");

        for (const id of invalidMemberIds) {
            console.log(`   ${id}`);
        }
    }

    // --------------------------------------------------
    // 7. Unmatched names
    // --------------------------------------------------

    const unmatched = await Payment.find({
        sourceSheet: "Member Savings",
        $or: [
            { "data.memberId": { $exists: false } },
            { "data.memberId": null },
            { "data.memberId": "" },
        ],
    })
        .select("recordId data")
        .lean();

    const unmatchedNames = {};

    for (const payment of unmatched) {
        const name =
            payment.data?.name ||
            payment.data?.memberName ||
            payment.data?.["নাম"] ||
            "Unknown";

        unmatchedNames[name] =
            (unmatchedNames[name] || 0) + 1;
    }

    console.log("\n--------------------------------------");
    console.log("⚠️ REMAINING UNMATCHED NAMES");
    console.log("--------------------------------------");

    const unmatchedNameEntries = Object.entries(unmatchedNames)
        .sort((a, b) => b[1] - a[1]);

    if (unmatchedNameEntries.length === 0) {
        console.log("🎉 No unmatched names!");
    } else {
        for (const [name, count] of unmatchedNameEntries) {
            console.log(`${name} → ${count} payments`);
        }
    }

    // --------------------------------------------------
    // Final result
    // --------------------------------------------------

    console.log("\n======================================");
    console.log("🏁 VERIFICATION RESULT");
    console.log("======================================");

    const allGood =
        totalPayments === matchedPayments + unmatchedPayments &&
        duplicatePayments.length === 0 &&
        invalidMemberIds.length === 0;

    if (allGood) {
        console.log("✅ DATABASE PAYMENT VERIFICATION PASSED");
    } else {
        console.log("⚠️ VERIFICATION NEEDS ATTENTION");
    }

    console.log("\n");

    await mongoose.disconnect();
}

main().catch((error) => {
    console.error("\n❌ Verification Error:");
    console.error(error);
    process.exit(1);
});