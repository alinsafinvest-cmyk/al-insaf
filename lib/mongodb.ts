
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

const globalForMongoose = globalThis as typeof globalThis & {
    mongoose?: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    };
};

if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
}

const cached =
    globalForMongoose.mongoose ?? {
        conn: null,
        promise: null,
    };

globalForMongoose.mongoose = cached;

export async function connectDB() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(MONGODB_URI, {
                bufferCommands: false,
                serverSelectionTimeoutMS: 10000,
            })
            .catch((error) => {
                cached.promise = null;
                cached.conn = null;
                throw error;
            });
    }

    cached.conn = await cached.promise;

    return cached.conn;
}
