// বাংলা: এই model-এ ব্যবহারকারীর profile, login তথ্য ও role-এর database schema নির্ধারিত হয়।
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: "admin" | "member";
    memberId?: string;
    phone?: string;
    photoUrl?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
        role: {
            type: String,
            enum: ["admin", "member"],
            default: "member",
            required: true,
        },
        memberId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
            default: "",
        },
        photoUrl: {
            type: String,
            trim: true,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const User: Model<IUser> =
    (mongoose.models.User as Model<IUser>) ||
    mongoose.model<IUser>("User", UserSchema);

export default User;