// বাংলা: এই model-এ deposit, withdrawal ও অন্যান্য transaction-এর database schema নির্ধারিত হয়।
import { Schema, models, model } from "mongoose";

const TransactionSchema = new Schema(
    {
        member: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        transactionId: {
            type: String,
            unique: true,
            sparse: true,
        },

        receiptId: {
            type: String,
            trim: true,
            default: "",
        },

        type: {
            type: String,
            enum: [
                "deposit",
                "withdrawal",
                "loan",
                "loan_payment",
            ],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01,
        },

        date: {
            type: Date,
            default: Date.now,
        },

        note: {
            type: String,
            trim: true,
            default: "",
        },

        paymentMethod: {
            type: String,
            trim: true,
            default: "",
        },

        senderNumber: {
            type: String,
            trim: true,
            default: "",
        },

        accountNumber: {
            type: String,
            trim: true,
            default: "",
        },

        referenceNumber: {
            type: String,
            trim: true,
            default: "",
        },

        paymentProvider: {
            type: String,
            trim: true,
            default: "",
        },

        gatewayStatus: {
            type: String,
            trim: true,
            default: "",
        },

        gatewayValidationId: {
            type: String,
            trim: true,
            default: "",
        },

        proofImage: {
            type: String,
            default: "",
        },

        proofImageName: {
            type: String,
            default: "",
        },

        rejectionReason: {
            type: String,
            trim: true,
            default: "",
        },

        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        approvedAt: {
            type: Date,
        },

        rejectedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        status: {
            type: String,
            enum: [
                "pending",
                "approved",
                "rejected",
            ],
            default: "pending",
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

const Transaction =
    models.Transaction ||
    model("Transaction", TransactionSchema);

export default Transaction;