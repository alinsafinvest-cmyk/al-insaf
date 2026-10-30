// বাংলা: এই script-এ CSV থেকে member তথ্য যাচাই করে database-এ import করা হয়।
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI পাওয়া যায়নি");
}

// ===============================
// MongoDB Schema
// ===============================

const memberSchema = new mongoose.Schema(
    {
        sourceSheet: {
            type: String,
            default: "Members",
        },

        recordId: {
            type: String,
            required: true,
            unique: true,
        },

        memberId: {
            type: String,
            required: true,
            unique: true,
        },

        name: String,
        email: String,
        profession: String,

        phone: String,
        secondaryPhone: String,

        fatherName: String,
        address: String,

        shareCount: {
            type: Number,
            default: 0,
        },

        photoFileId: String,
        nidNumber: String,
        nidFrontFileId: String,
        nidBackFileId: String,

        nomineeName: String,
        nomineeRelation: String,
        nomineePhone: String,
        nomineeAddress: String,

        nomineePhotoFileId: String,
        nomineeNidFrontFileId: String,
        nomineeNidBackFileId: String,

        referredBy: String,
        declaration: String,

        submittedAt: Date,

        status: {
            type: String,
            default: "Active",
        },

        loginStatus: {
            type: String,
            default: "Active",
        },

        password: {
            type: String,
            select: false,
        },
    },
    {
        timestamps: true,
        strict: false,
    }
);

const Member =
    mongoose.models.AlInsafMember ||
    mongoose.model("AlInsafMember", memberSchema, "members");

// ===============================
// Helper
// ===============================

function clean(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value).trim();
}

function extractDriveFileId(url) {
    const value = clean(url);

    if (!value) {
        return "";
    }

    const match = value.match(/[?&]id=([^&]+)/);

    if (match) {
        return match[1];
    }

    return value;
}

function parseNumber(value) {
    const number = Number(clean(value));

    return Number.isFinite(number) ? number : 0;
}

// ===============================
// CSV
// ===============================

const csvPath = path.join(
    process.cwd(),
    "scripts",
    "members.csv"
);

if (!fs.existsSync(csvPath)) {
    throw new Error(
        `❌ CSV file পাওয়া যায়নি:\n${csvPath}`
    );
}

const csvText = fs.readFileSync(csvPath, "utf8");

const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
});

// ===============================
// Main Import
// ===============================

// বাংলা: এই script-এ CSV থেকে member তথ্য যাচাই করে database-এ import করা হয়।
async function main() {
    console.log("🔌 MongoDB connecting...");

    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected");
    console.log(`📄 CSV rows: ${rows.length}`);

    let imported = 0;
    let skipped = 0;

    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];

        const name = clean(
            row["জাতীয় পরিচয়পত্র অনুযায়ী পূর্ণ নাম লিখুন। (বাংলায়)"]
        );

        const email = clean(
            row["Email/Gmail"]
        ).toLowerCase();

        const phone = clean(
            row["সচল মোবাইল/হোয়াটসঅ্যাপ"]
        );

        const nidNumber = clean(
            row["জাতীয় পরিচয়পত্র নম্বর"]
        );

        // --------------------------------
        // Basic validation
        // --------------------------------

        if (!name || !phone) {
            console.log(
                `⚠️ Row ${index + 2} skipped: name/phone missing`
            );

            skipped++;
            continue;
        }

        // --------------------------------
        // Member ID
        // --------------------------------

        const memberId = `M${String(index + 1).padStart(3, "0")}`;

        // --------------------------------
        // Password = MemberID
        // MongoDB-তে plaintext থাকবে না
        // --------------------------------

        const hashedPassword = await bcrypt.hash(
            memberId,
            12
        );

        // --------------------------------
        // Google Drive File IDs
        // --------------------------------

        const photoFileId = extractDriveFileId(
            row["সদস্যের ছবি"]
        );

        const nidFrontFileId = extractDriveFileId(
            row["জাতীয় পরিচয়পত্রের সামনের ছবি"]
        );

        const nidBackFileId = extractDriveFileId(
            row["জাতীয় পরিচয়পত্রের পেছনের ছবি"]
        );

        const nomineePhotoFileId = extractDriveFileId(
            row["নমিনির  ছবি"]
        );

        const nomineeNidFrontFileId = extractDriveFileId(
            row["নমিনির  জাতীয় পরিচয়পত্রের সামনের ছবি"]
        );

        const nomineeNidBackFileId = extractDriveFileId(
            row["নমিনির  জাতীয় পরিচয়পত্রের পেছনের ছবি"]
        );

        // --------------------------------
        // Date
        // --------------------------------

        const submittedAtValue = clean(
            row["Timestamp"]
        );

        const submittedAt = submittedAtValue
            ? new Date(submittedAtValue)
            : null;

        // --------------------------------
        // Member document
        // --------------------------------

        const memberData = {
            sourceSheet: "Members",

            recordId: memberId,
            memberId,

            name,

            email,

            profession: clean(
                row["আপনার বর্তমাণ পেশা। "]
            ),

            phone,

            secondaryPhone: clean(
                row["দ্বিতীয় মোবাইল"]
            ),

            fatherName: clean(
                row["পিতার নাম (বাংলায়)"]
            ),

            address: clean(
                row["পূর্ণ ঠিকানা "]
            ),

            shareCount: parseNumber(
                row["অংশ সংখ্যা"]
            ),

            photoFileId,

            nidNumber,

            nidFrontFileId,
            nidBackFileId,

            nomineeName: clean(
                row["নমিনির নাম"]
            ),

            nomineeRelation: clean(
                row["নমিনির সাথে সম্পর্ক"]
            ),

            nomineePhone: clean(
                row["নমিনির মোবাইল নাম্বার"]
            ),

            nomineeAddress: clean(
                row["নমিনির ঠিকানা"]
            ),

            nomineePhotoFileId,

            nomineeNidFrontFileId,

            nomineeNidBackFileId,

            referredBy: clean(
                row[
                    "আপনি Al Insaf Investment Society সম্পর্কে কীভাবে জেনেছেন?"
                ]
            ),

            declaration: clean(
                row["তথ্য সঠিকতার ঘোষণা"]
            ),

            submittedAt:
                submittedAt && !Number.isNaN(submittedAt.getTime())
                    ? submittedAt
                    : null,

            status: "Active",

            loginStatus: "Active",

            password: hashedPassword,
        };

        // --------------------------------
        // Upsert
        // --------------------------------

        await Member.updateOne(
            {
                recordId: memberId,
            },
            {
                $set: memberData,
            },
            {
                upsert: true,
            }
        );

        imported++;

        console.log(
            `✅ ${memberId} - ${name}`
        );
    }

    console.log("");
    console.log("=================================");
    console.log("🎉 IMPORT COMPLETE");
    console.log("=================================");
    console.log(`✅ Imported: ${imported}`);
    console.log(`⚠️ Skipped: ${skipped}`);
    console.log("=================================");

    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error("");
    console.error("❌ IMPORT FAILED");
    console.error(error);

    try {
        await mongoose.disconnect();
    } catch {}

    process.exit(1);
});
