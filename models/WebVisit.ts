import { model, models, Schema } from "mongoose";

const WebVisitSchema = new Schema(
    {
        sessionKey: {
            type: String,
            required: true,
        },
        path: {
            type: String,
            required: true,
            maxlength: 200,
        },
        bucketStart: {
            type: Date,
            required: true,
        },
        referrerHost: {
            type: String,
            default: "",
            maxlength: 253,
        },
        createdAt: {
            type: Date,
            required: true,
            expires: 60 * 60 * 24 * 90,
        },
    },
    {
        versionKey: false,
    }
);

WebVisitSchema.index(
    { sessionKey: 1, path: 1, bucketStart: 1 },
    { unique: true }
);
WebVisitSchema.index({ createdAt: -1 });

const WebVisit = models.WebVisit || model("WebVisit", WebVisitSchema);

export default WebVisit;
