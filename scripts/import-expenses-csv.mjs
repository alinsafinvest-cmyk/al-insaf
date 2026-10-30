// বাংলা: এই script-এ CSV থেকে expense তথ্য যাচাই করে database-এ import করা হয়।
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

// =====================================
// Expense Schema
// =====================================

const expenseSchema = new mongoose.Schema(
  {
    sourceSheet: {
      type: String,
      default: "Expenses",
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

const Expense =
  mongoose.models.AlInsafExpense ||
  mongoose.model(
    "AlInsafExpense",
    expenseSchema,
    "expenses"
  );

// =====================================
// Helpers
// =====================================

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
    return 0;
  }

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : 0;
}

// =====================================
// CSV
// =====================================

const csvPath = path.join(
  process.cwd(),
  "scripts",
  "expenses.csv"
);

if (!fs.existsSync(csvPath)) {
  throw new Error(
    `❌ expenses.csv পাওয়া যায়নি:\n${csvPath}`
  );
}

const csvText = fs.readFileSync(csvPath, "utf8");

const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true,
  bom: true,
  relax_column_count: true,
});

// =====================================
// Import
// =====================================

// বাংলা: এই script-এ CSV থেকে expense তথ্য যাচাই করে database-এ import করা হয়।
async function main() {
  console.log("🔌 MongoDB connecting...");

  await mongoose.connect(MONGODB_URI);

  console.log("✅ MongoDB connected");
  console.log(`📄 CSV rows: ${rows.length}`);

  let imported = 0;
  let skipped = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    const serial = clean(row["ক্রমিক"]);
    const date = clean(row["তারিখ"]);
    const paidBy = clean(row["ব্যায়কারী"]);
    const category = clean(row["ব্যায়ের খাত"]);
    const amount = numberValue(row["টাকা"]);
    const note = clean(row["নোট"]);

    // =================================
    // Empty row check
    // =================================

    if (!date && !paidBy && !category && !amount) {
      skipped++;
      continue;
    }

    // =================================
    // Expense ID
    // =================================

    const expenseId = serial
      ? `EXP${String(serial).padStart(3, "0")}`
      : `EXP${String(index + 1).padStart(3, "0")}`;

    const expenseData = {
      expenseId,

      serial: serial
        ? Number(serial)
        : index + 1,

      date,

      paidBy,

      category,

      amount,

      note,

      status: "Approved",

      importedFrom: "Google Sheets CSV",
    };

    // =================================
    // Upsert
    // =================================

    await Expense.updateOne(
      {
        recordId: expenseId,
      },
      {
        $set: {
          sourceSheet: "Expenses",
          recordId: expenseId,
          data: expenseData,
          syncedAt: new Date(),
        },
      },
      {
        upsert: true,
      }
    );

    imported++;

    console.log(
      `✅ ${expenseId} - ${category} - ${amount}`
    );
  }

  console.log("");
  console.log("======================================");
  console.log("🎉 EXPENSE IMPORT COMPLETE");
  console.log("======================================");
  console.log(`✅ Imported: ${imported}`);
  console.log(`⚠️ Skipped: ${skipped}`);
  console.log("======================================");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("");
  console.error("❌ EXPENSE IMPORT FAILED");
  console.error(error);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
