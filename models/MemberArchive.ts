import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IMemberArchive extends Document {
    memberId: string;
    name: string;
    archivedAt: Date;
    expiresAt: Date;
    snapshot: Record<string, unknown>;
}

const MemberArchiveSchema = new Schema<IMemberArchive>(
    {
        memberId: {
            type: String,
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        archivedAt: {
            type: Date,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        snapshot: {
            type: Schema.Types.Mixed,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

MemberArchiveSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const MemberArchive: Model<IMemberArchive> =
    (mongoose.models.MemberArchive as Model<IMemberArchive>) ||
    mongoose.model<IMemberArchive>(
        "MemberArchive",
        MemberArchiveSchema,
        "memberarchives"
    );

export default MemberArchive;
