// বাংলা: এই module-এ Google Sheets collection-গুলোর জন্য database model তৈরি করা হয়।
import mongoose from "mongoose";

const sheetRecordSchema = new mongoose.Schema(
  {
    sourceSheet: {
      type: String,
      required: true,
      index: true,
    },

    recordId: {
      type: String,
      required: true,
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

function createModel(name, collectionName) {
  return (
    mongoose.models[name] ||
    mongoose.model(name, sheetRecordSchema, collectionName)
  );
}

export const Member = createModel(
  "AlInsafMember",
  "members"
);

export const Customer = createModel(
  "AlInsafCustomer",
  "customers"
);

export const Investment = createModel(
  "AlInsafInvestment",
  "investments"
);

export const CustomerPayment = createModel(
  "AlInsafCustomerPayment",
  "customerpayments"
);

export const Payment = createModel(
  "AlInsafPayment",
  "payments"
);

export const CashBook = createModel(
  "AlInsafCashBook",
  "cashbooks"
);

export const Expense = createModel(
  "AlInsafExpense",
  "expenses"
);

export const Notice = createModel(
  "AlInsafNotice",
  "notices"
);

export const MemberRequest = createModel(
    "AlInsafMemberRequest",
    "memberrequests"
);

export const SystemConfig = createModel(
    "AlInsafSystemConfig",
    "systemconfigs"
);