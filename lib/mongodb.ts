import mongoose from "mongoose";

type MongooseCache = {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
    mongoose?: MongooseCache;
};

// Global MongoDB connection cache
const cached: MongooseCache =
    globalForMongoose.mongoose ?? {
        conn: null,
        promise: null,
    };

globalForMongoose.mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {

    // আগে থেকে Connection থাকলে সেটি ব্যবহার করবে
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    // MongoDB Environment Variable সংগ্রহ
    const mongodbUri = process.env.MONGODB_URI;

    // URI না থাকলে পরিষ্কার Error দেখাবে
    if (
        typeof mongodbUri !== "string" ||
        mongodbUri.trim() === ""
    ) {
        throw new Error(
            "MONGODB_URI is missing. Please configure it in Environment Variables."
        );
    }

    // নতুন Connection তৈরি
    if (!cached.promise) {
        cached.promise = mongoose
            .connect(mongodbUri, {
                bufferCommands: false,
                serverSelectionTimeoutMS: 10000,
            })
            .then((instance) => {
                return instance;
            })
            .catch((error) => {
                cached.promise = null;
                cached.conn = null;

                throw error;
            });
    }

    // Connection সম্পন্ন হওয়া পর্যন্ত অপেক্ষা
    cached.conn = await cached.promise;

    return cached.conn;
}