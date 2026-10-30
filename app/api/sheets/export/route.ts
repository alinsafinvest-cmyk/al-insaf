// বাংলা: নির্দিষ্ট সিঙ্ক টোকেন দিয়ে MongoDB collection-গুলো paginated ভাবে export করে।
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 500;
const MAX_PAGE_SIZE = 1000;
const SENSITIVE_FIELD = /(password|token|secret|credential|api.?key|private.?key)/i;

function removeSecrets(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(removeSecrets);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).flatMap(([key, nestedValue]) =>
                SENSITIVE_FIELD.test(key)
                    ? []
                    : [[key, removeSecrets(nestedValue)]],
            ),
        );
    }

    return value;
}

function parseInteger(value: string | null, fallback: number, max: number) {
    if (value === null || !/^\d+$/.test(value)) {
        return fallback;
    }
    return Math.min(Number(value), max);
}

export async function GET(request: Request) {
    const expectedToken = process.env.GOOGLE_SHEETS_SYNC_SECRET;
    const authorization = request.headers.get("authorization");

    if (!expectedToken) {
        return NextResponse.json(
            { success: false, message: "Sheets export is not configured" },
            { status: 503 },
        );
    }

    if (authorization !== `Bearer ${expectedToken}`) {
        return NextResponse.json(
            { success: false, message: "Unauthorized" },
            { status: 401 },
        );
    }

    try {
        await connectDB();
        const db = mongoose.connection.db;
        if (!db) {
            throw new Error("MongoDB connection is unavailable");
        }

        const url = new URL(request.url);
        const collectionName = url.searchParams.get("collection");
        const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
            .map(({ name }) => name)
            .filter((name) => !name.startsWith("system."))
            .sort();

        if (!collectionName) {
            return NextResponse.json({
                success: true,
                collections,
            });
        }

        if (!collections.includes(collectionName)) {
            return NextResponse.json(
                { success: false, message: "Unknown database collection" },
                { status: 404 },
            );
        }

        const skip = parseInteger(url.searchParams.get("skip"), 0, Number.MAX_SAFE_INTEGER);
        const limit = Math.max(
            1,
            parseInteger(
                url.searchParams.get("limit"),
                DEFAULT_PAGE_SIZE,
                MAX_PAGE_SIZE,
            ),
        );
        const rows = await db
            .collection(collectionName)
            .find({})
            .sort({ _id: 1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        return NextResponse.json({
            success: true,
            collection: collectionName,
            rows: rows.map((row) =>
                removeSecrets(JSON.parse(JSON.stringify(row))),
            ),
            nextSkip: skip + rows.length,
            done: rows.length < limit,
        });
    } catch (error) {
        console.error("Google Sheets database export failed:", error);
        return NextResponse.json(
            { success: false, message: "Database export failed" },
            { status: 500 },
        );
    }
}
