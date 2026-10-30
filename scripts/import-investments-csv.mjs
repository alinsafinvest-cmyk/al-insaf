// বাংলা: এই script-এ CSV থেকে investment তথ্য যাচাই করে database-এ import করা হয়।
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

// ==========================================
// MongoDB Model
// ==========================================

const investmentSchema = new mongoose.Schema(
    {
        sourceSheet: {
            type: String,
            default: "Investments",
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

const Investment =
    mongoose.models.AlInsafInvestment ||
    mongoose.model(
        "AlInsafInvestment",
        investmentSchema,
        "investments"
    );

// ==========================================
// Helpers
// ==========================================

function clean(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}

function numberValue(value) {
    const cleaned = clean(value)
        .replace(/,/g, "")
        .replace(/[^\d.-]/g, "");

    if (!cleaned) {
        return null;
    }

    const number = Number(cleaned);

    return Number.isFinite(number) ? number : null;
}

function driveFileId(value) {
    const url = clean(value);

    if (!url) {
        return "";
    }

    const match = url.match(/[?&]id=([^&]+)/);

    return match ? match[1] : url;
}

// ==========================================
// CSV Path
// ==========================================

const csvPath = path.join(
    process.cwd(),
    "scripts",
    "investments.csv"
);

if (!fs.existsSync(csvPath)) {
    throw new Error(
        `❌ investments.csv পাওয়া যায়নি:\n${csvPath}`
    );
}

// ==========================================
// Read CSV
// ==========================================

const csvText = fs.readFileSync(csvPath, "utf8");

const rows = parse(csvText, {
    skip_empty_lines: false,
    bom: true,
    relax_column_count: true,
});

// ==========================================
// CSV Structure
//
// Row 0 = title
// Row 1 = total
// Row 2 = actual headers
// Row 3+ = data
// ==========================================

const HEADER_ROW = 2;

const headers = rows[HEADER_ROW].map((header) =>
    clean(header)
);

function getValue(row, headerName) {
    const index = headers.indexOf(headerName);

    if (index === -1) {
        return "";
    }

    return clean(row[index]);
}

// ==========================================
// Main
// ==========================================

// বাংলা: এই script-এ CSV থেকে investment তথ্য যাচাই করে database-এ import করা হয়।
async function main() {
    console.log("🔌 MongoDB connecting...");

    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected");

    let imported = 0;
    let skipped = 0;

    let currentInvestment = null;

    // ------------------------------------------
    // Process rows
    // ------------------------------------------

    for (let i = HEADER_ROW + 1; i < rows.length; i++) {
        const row = rows[i];

        const serial = getValue(
            row,
            "ক্রমিক"
        );

        // ======================================
        // New Investment
        // ======================================

        if (serial) {
            // Save previous investment
            if (currentInvestment) {
                await saveInvestment(currentInvestment);

                imported++;

                console.log(
                    `✅ ${currentInvestment.recordId} - ${currentInvestment.data.investmentReceiver}`
                );
            }

            const investmentId = `INV${String(
                serial
            ).padStart(3, "0")}`;

            currentInvestment = {
                recordId: investmentId,

                data: {
                    investmentId,

                    serial: Number(serial),

                    purchaseDate: getValue(
                        row,
                        "তারিখ"
                    ),

                    purchaseDateRaw: getValue(
                        row,
                        "তারিখ"
                    ),

                    investmentReceiver: getValue(
                        row,
                        "বিনিয়োগ গ্রহণকারী"
                    ),

                    product: getValue(
                        row,
                        "বিনিয়োগকৃত পণ্য"
                    ),

                    purchasePrice: numberValue(
                        getValue(
                            row,
                            "ক্রয় মূল্য"
                        )
                    ),

                    salePrice: numberValue(
                        getValue(
                            row,
                            "বিক্রয় মূল্য"
                        )
                    ),

                    durationMonths: numberValue(
                        getValue(
                            row,
                            "মেয়াদ"
                        )
                    ),

                    monthlyInstallment: numberValue(
                        getValue(
                            row,
                            "মাসিক কিস্তি"
                        )
                    ),

                    reportedPaidInstallment:
                        numberValue(
                            getValue(
                                row,
                                "পরিশোধিত কিস্তি"
                            )
                        ),

                    proof: getValue(
                        row,
                        "প্রমানপত্র"
                    ),

                    dueAmount: numberValue(
                        getValue(
                            row,
                            "বকেয়া পরিমাণ"
                        )
                    ),

                    guarantor: getValue(
                        row,
                        "জামিনদার"
                    ),

                    profit: numberValue(
                        getValue(
                            row,
                            "লাভ"
                        )
                    ),

                    monthlyEndDate: getValue(
                        row,
                        "মাসিক শেষ তারিখ"
                    ),

                    installmentEndDate:
                        getValue(
                            row,
                            "কিস্তি প্রদানের শেষ তারিখ"
                        ),

                    installmentPayments: [],
                },
            };

            continue;
        }

        // ======================================
        // Installment/payment row
        // ======================================

        if (!currentInvestment) {
            continue;
        }

        const installmentAmount =
            numberValue(
                getValue(
                    row,
                    "পরিশোধিত কিস্তি"
                )
            );

        const installmentDate =
            getValue(
                row,
                "তারিখ"
            );

        if (
            installmentAmount !== null ||
            installmentDate
        ) {
            currentInvestment.data.installmentPayments.push(
                {
                    amount: installmentAmount,
                    date: installmentDate,
                    dateRaw: installmentDate,
                }
            );
        }
    }

    // ==========================================
    // Save final investment
    // ==========================================

    if (currentInvestment) {
        await saveInvestment(currentInvestment);

        imported++;

        console.log(
            `✅ ${currentInvestment.recordId} - ${currentInvestment.data.investmentReceiver}`
        );
    }

    console.log("");
    console.log("======================================");
    console.log("🎉 INVESTMENT IMPORT COMPLETE");
    console.log("======================================");
    console.log(`✅ Imported: ${imported}`);
    console.log(`⚠️ Skipped: ${skipped}`);
    console.log("======================================");

    await mongoose.disconnect();
}

// ==========================================
// Save / Update
// ==========================================

async function saveInvestment(investment) {
    await Investment.updateOne(
        {
            recordId: investment.recordId,
        },
        {
            $set: {
                sourceSheet: "Investments",

                recordId: investment.recordId,

                data: investment.data,

                syncedAt: new Date(),
            },
        },
        {
            upsert: true,
        }
    );
}

// ==========================================
// Run
// ==========================================

main().catch(async (error) => {
    console.error("");
    console.error("❌ INVESTMENT IMPORT FAILED");
    console.error(error);

    try {
        await mongoose.disconnect();
    } catch {}

    process.exit(1);
});