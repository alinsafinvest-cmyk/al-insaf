// বাংলা: এই API route-এ sheets → sync সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import {
  Member,
  Customer,
  Investment,
  CustomerPayment,
  Payment,
  CashBook,
  Expense,
  Notice,
} from "@/lib/sheetsModels";

const SHEET_CONFIG = {
  Members: {
    model: Member,
    idField: "MemberID",
  },

  Customers: {
    model: Customer,
    idField: "CustomerID",
  },

  Investments: {
    model: Investment,
    idField: "InvestmentID",
  },

  CustomerPayments: {
    model: CustomerPayment,
    idField: "CustomerPaymentID",
  },

  Payments: {
    model: Payment,
    idField: "PaymentID",
  },

  CashBook: {
    model: CashBook,
    idField: "EntryID",
  },

  Expenses: {
    model: Expense,
    idField: "ExpenseID",
  },

  Notices: {
    model: Notice,
    idField: "NoticeID",
  },
};

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(request) {
  try {
    /* =========================
       SECURITY
    ========================= */

    const authHeader = request.headers.get("authorization");

    const expectedToken = process.env.GOOGLE_SHEETS_SYNC_SECRET;

    if (!expectedToken) {
      console.error("Google Sheets sync endpoint is not configured.");
      return NextResponse.json(
        {
          success: false,
          message: "Sync endpoint is not configured",
        },
        {
          status: 503,
        }
      );
    }

    if (!authHeader || authHeader !== expectedToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    /* =========================
       BODY
    ========================= */

    const body = await request.json();

    const {
      sheetName,
      rows = [],
    } = body;

    if (!sheetName) {
      return NextResponse.json(
        {
          success: false,
          message: "sheetName is required",
        },
        {
          status: 400,
        }
      );
    }

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        {
          success: false,
          message: "rows must be an array",
        },
        {
          status: 400,
        }
      );
    }

    /* =========================
       CHECK SHEET
    ========================= */

    const config = SHEET_CONFIG[sheetName];

    if (!config) {
      return NextResponse.json(
        {
          success: false,
          message: `Unsupported sheet: ${sheetName}`,
        },
        {
          status: 400,
        }
      );
    }

    const { model, idField } = config;

    /* =========================
       DATABASE
    ========================= */

    await connectDB();

    /* =========================
       UPSERT
    ========================= */

    const operations = [];

    for (const row of rows) {
      if (!row || typeof row !== "object") {
        continue;
      }

      const recordId = String(
        row[idField] ?? ""
      ).trim();

      if (!recordId) {
        continue;
      }

      operations.push({
        updateOne: {
          filter: {
            recordId,
          },

          update: {
            $set: {
              sourceSheet: sheetName,
              recordId,
              data: row,
              syncedAt: new Date(),
            },
          },

          upsert: true,
        },
      });
    }

    if (!operations.length) {
      return NextResponse.json({
        success: true,
        sheetName,
        received: rows.length,
        processed: 0,
        message: "No valid records found",
      });
    }

    const result = await model.bulkWrite(
      operations,
      {
        ordered: false,
      }
    );

    /* =========================
       RESPONSE
    ========================= */

    return NextResponse.json({
      success: true,
      sheetName,

      received: rows.length,

      processed: operations.length,

      inserted:
        result.upsertedCount || 0,

      modified:
        result.modifiedCount || 0,

      matched:
        result.matchedCount || 0,

      message:
        `${sheetName} successfully synced`,
    });
  } catch (error) {
    console.error(
      "Google Sheets Sync Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Sync failed",
      },
      {
        status: 500,
      }
    );
  }
}