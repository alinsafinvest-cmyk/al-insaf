// বাংলা: এই script-এ CSV থেকে member payment তথ্য যাচাই করে database-এ import করা হয়।
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI পাওয়া যায়নি");
}

// ========================================
// Payment Schema
// ========================================

const paymentSchema = new mongoose.Schema(
    {
        sourceSheet: {
            type: String,
            default: "Member Savings",
            index: true,
        },

        recordId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        syncedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        strict: false,
    }
);

const Payment =
    mongoose.models.AlInsafPayment ||
    mongoose.model(
        "AlInsafPayment",
        paymentSchema,
        "payments"
    );

// ========================================
// Member Schema
// Existing members collection
// ========================================

const memberSchema = new mongoose.Schema(
    {
        recordId: String,
        memberId: String,
        name: String,
    },
    {
        collection: "members",
        strict: false,
    }
);

const Member =
    mongoose.models.AlInsafMemberPaymentLookup ||
    mongoose.model(
        "AlInsafMemberPaymentLookup",
        memberSchema,
        "members"
    );

// ========================================
// Helpers
// ========================================

function clean(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value).trim();
}

function amount(value) {
    const cleaned = clean(value)
        .replace(/,/g, "")
        .replace(/[^\d.-]/g, "");

    if (!cleaned) {
        return 0;
    }

    const number = Number(cleaned);

    return Number.isFinite(number)
        ? number
        : 0;
}

function normalizeName(value) {
    return clean(value)
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

// ========================================
// CSV Path
// ========================================

const csvPath = path.join(
    process.cwd(),
    "scripts",
    "member-savings.csv"
);

if (!fs.existsSync(csvPath)) {
    throw new Error(
        `❌ member-savings.csv পাওয়া যায়নি:\n${csvPath}`
    );
}

// ========================================
// Read CSV WITHOUT header
// ========================================

const csvText = fs.readFileSync(
    csvPath,
    "utf8"
);

const rows = parse(csvText, {
    skip_empty_lines: false,
    bom: true,
    relax_column_count: true,
});

// ========================================
// IMPORTANT
//
// Row 0 = title
// Row 1 = total
// Row 2 = headers
// Row 3+ = members
// ========================================

const HEADER_ROW = 2;

const headers = rows[HEADER_ROW].map(
    (header) => clean(header)
);

// ========================================
// Main
// ========================================

// বাংলা: এই script-এ CSV থেকে member payment তথ্য যাচাই করে database-এ import করা হয়।
async function main() {
    console.log("🔌 MongoDB connecting...");

    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected");

    // ------------------------------------
    // Load existing members
    // ------------------------------------

    const members = await Member.find({})
        .select("memberId name recordId")
        .lean();

    const memberMap = new Map();

    for (const member of members) {
        if (member.name) {
            memberMap.set(
                normalizeName(member.name),
                member.memberId || member.recordId
            );
        }
    }

    console.log(
        `👥 Members found: ${members.length}`
    );

    // ------------------------------------
    // Month columns
    //
    // First 3 columns:
    // ক্রমিক নং
    // নাম
    // সংখ্যা
    //
    // Last 2:
    // এককালীন
    // মন্তব্য
    // ------------------------------------

    const excludedHeaders = new Set([
        "ক্রমিক নং",
        "নাম",
        "সংখ্যা",
        "এককালীন",
        "মন্তব্য",
    ]);

    const monthHeaders = headers.filter(
        (header) =>
            header &&
            !excludedHeaders.has(header)
    );

    let imported = 0;
    let skipped = 0;
    let unmatchedMembers = 0;

    // ====================================
    // Process each member row
    // ====================================

    for (
        let rowIndex = HEADER_ROW + 1;
        rowIndex < rows.length;
        rowIndex++
    ) {
        const row = rows[rowIndex];

        const serial = clean(row[0]);
        const memberName = clean(row[1]);
        const shareCount = amount(row[2]);

        if (!memberName) {
            skipped++;
            continue;
        }

        // --------------------------------
        // Find existing Member
        // --------------------------------

        const memberId =
            memberMap.get(
                normalizeName(memberName)
            ) || null;

        if (!memberId) {
            console.log(
                `⚠️ Member match পাওয়া যায়নি: ${memberName}`
            );

            unmatchedMembers++;
        }

        // =================================
        // Monthly payments
        // =================================

        for (const month of monthHeaders) {
            const columnIndex =
                headers.indexOf(month);

            if (columnIndex === -1) {
                continue;
            }

            const paidAmount = amount(
                row[columnIndex]
            );

            // Empty / zero payment বাদ
            if (paidAmount <= 0) {
                continue;
            }

            // --------------------------------
            // Unique Payment ID
            // --------------------------------

            const safeMonth = month
                .replace(/\s+/g, "-");

            const paymentId =
                `PAY-${String(
                    serial || rowIndex
                ).padStart(3, "0")}-${safeMonth}`;

            const paymentData = {
                paymentId,

                memberId,

                memberName,

                paymentType:
                    "monthly_savings",

                paymentMonth: month,

                amount: paidAmount,

                shareCount,

                status: "Approved",

                method:
                    "Google Sheets Import",

                source: "Member Savings CSV",

                importedRow:
                    rowIndex + 1,

                originalSerial: serial,

                note: "",
            };

            await Payment.updateOne(
                {
                    recordId: paymentId,
                },
                {
                    $set: {
                        sourceSheet:
                            "Member Savings",

                        recordId: paymentId,

                        data: paymentData,

                        syncedAt: new Date(),
                    },
                },
                {
                    upsert: true,
                }
            );

            imported++;

            console.log(
                `✅ ${paymentId} | ${memberName} | ${month} | ৳${paidAmount}`
            );
        }

        // =================================
        // One-time payment
        // =================================

        const oneTimeIndex =
            headers.indexOf("এককালীন");

        if (oneTimeIndex !== -1) {
            const oneTimeAmount =
                amount(
                    row[oneTimeIndex]
                );

            if (oneTimeAmount > 0) {
                const paymentId =
                    `PAY-${String(
                        serial || rowIndex
                    ).padStart(3, "0")}-ONE-TIME`;

                await Payment.updateOne(
                    {
                        recordId: paymentId,
                    },
                    {
                        $set: {
                            sourceSheet:
                                "Member Savings",

                            recordId:
                                paymentId,

                            data: {
                                paymentId,

                                memberId,

                                memberName,

                                paymentType:
                                    "one_time",

                                paymentMonth:
                                    "One Time",

                                amount:
                                    oneTimeAmount,

                                shareCount,

                                status:
                                    "Approved",

                                method:
                                    "Google Sheets Import",

                                source:
                                    "Member Savings CSV",

                                originalSerial:
                                    serial,

                                note: clean(
                                    row[
                                        headers.indexOf(
                                            "মন্তব্য"
                                        )
                                    ]
                                ),
                            },

                            syncedAt:
                                new Date(),
                        },
                    },
                    {
                        upsert: true,
                    }
                );

                imported++;

                console.log(
                    `✅ ${paymentId} | ${memberName} | ৳${oneTimeAmount}`
                );
            }
        }
    }

    console.log("");
    console.log(
        "======================================"
    );
    console.log(
        "🎉 MEMBER PAYMENT IMPORT COMPLETE"
    );
    console.log(
        "======================================"
    );
    console.log(`✅ Payments imported: ${imported}`);
    console.log(`⚠️ Rows skipped: ${skipped}`);
    console.log(
        `⚠️ Member name unmatched: ${unmatchedMembers}`
    );
    console.log(
        "======================================"
    );

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error("");
    console.error(
        "❌ MEMBER PAYMENT IMPORT FAILED"
    );
    console.error(error);

    try {
        await mongoose.disconnect();
    } catch {}

    process.exit(1);
});
