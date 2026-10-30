// বাংলা: এই model-এ deposit request ও payment metadata-এর database schema নির্ধারিত হয়।
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IDeposit extends Document {
    depositId: string;

    memberId: string;
    memberName: string;
    memberPhone: string;

    amount: number;
    depositDate: Date;

    paymentMethod:
        | "Cash"
        | "Bank"
        | "bKash"
        | "Nagad"
        | "Rocket"
        | "Other";

    transactionId: string;
    description: string;

    proofFileId: string;
    proofFileName: string;

    status: "pending" | "approved" | "rejected";

    submittedBy: string;

    approvedBy: string;
    approvedAt?: Date;

    rejectedBy: string;
    rejectedAt?: Date;
    rejectionReason: string;

    receiptId: string;

    createdAt: Date;
    updatedAt: Date;
}

const DepositSchema = new Schema<IDeposit>(
    {
        depositId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        memberId: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        memberName: {
            type: String,
            required: true,
            trim: true,
        },

        memberPhone: {
            type: String,
            default: "",
            trim: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        depositDate: {
            type: Date,
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: [
                "Cash",
                "Bank",
                "bKash",
                "Nagad",
                "Rocket",
                "Other",
            ],
            default: "Cash",
        },

        transactionId: {
            type: String,
            default: "",
            trim: true,
        },

        description: {
            type: String,
            default: "",
            trim: true,
        },

        proofFileId: {
            type: String,
            default: "",
            trim: true,
        },

        proofFileName: {
            type: String,
            default: "",
            trim: true,
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },

        submittedBy: {
            type: String,
            default: "admin",
        },

        approvedBy: {
            type: String,
            default: "",
        },

        approvedAt: {
            type: Date,
        },

        rejectedBy: {
            type: String,
            default: "",
        },

        rejectedAt: {
            type: Date,
        },

        rejectionReason: {
            type: String,
            default: "",
        },

        receiptId: {
            type: String,
            default: "",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

const Deposit: Model<IDeposit> =
    (mongoose.models.Deposit as Model<IDeposit>) ||
    mongoose.model<IDeposit>("Deposit", DepositSchema);

export default Deposit;