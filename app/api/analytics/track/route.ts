import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import WebVisit from "@/models/WebVisit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sessionIdPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isExcludedPath(path: string) {
    return ["/admin", "/member", "/api"].some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    );
}

function isDuplicateKeyError(error: unknown) {
    return typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { success: false, message: "Invalid analytics event" },
                { status: 400 }
            );
        }

        const sessionId = String(body.sessionId ?? "");
        const path = String(body.path ?? "");

        if (
            !sessionIdPattern.test(sessionId) ||
            path.length > 200 ||
            !path.startsWith("/") ||
            path.startsWith("//") ||
            path.includes("?") ||
            path.includes("#") ||
            isExcludedPath(path)
        ) {
            return NextResponse.json(
                { success: false, message: "Invalid analytics event" },
                { status: 400 }
            );
        }

        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 32) {
            console.error("Analytics tracking requires a configured JWT_SECRET.");
            return NextResponse.json(
                { success: false, message: "Analytics is unavailable" },
                { status: 503 }
            );
        }

        const sessionKey = createHmac("sha256", secret)
            .update(sessionId)
            .digest("hex");
        const now = new Date();
        const bucketStart = new Date(
            Math.floor(now.getTime() / (30 * 60_000)) * (30 * 60_000)
        );
        const referer = request.headers.get("referer");
        let referrerHost = "";
        if (referer) {
            try {
                referrerHost = new URL(referer).hostname.slice(0, 253);
            } catch {
                referrerHost = "";
            }
        }

        await connectDB();
        await WebVisit.updateOne(
            { sessionKey, path, bucketStart },
            {
                $setOnInsert: {
                    sessionKey,
                    path,
                    bucketStart,
                    referrerHost,
                    createdAt: now,
                },
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return NextResponse.json({ success: true });
        }

        console.error("Web analytics tracking failed:", error);
        return NextResponse.json(
            { success: false, message: "Analytics event could not be recorded" },
            { status: 500 }
        );
    }
}
