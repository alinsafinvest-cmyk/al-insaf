import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import WebVisit from "@/models/WebVisit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const auth = await requireRole(["admin"]);
    if (auth.response) return auth.response;

    const requestedDays = Number(request.nextUrl.searchParams.get("days") || "7");
    const days = requestedDays === 30 ? 30 : 7;

    try {
        await connectDB();
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [summary, daily, topPages] = await Promise.all([
            WebVisit.aggregate([
                { $match: { createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: null,
                        pageViews: { $sum: 1 },
                        visitorSessions: { $addToSet: "$sessionKey" },
                        paths: { $addToSet: "$path" },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        pageViews: 1,
                        uniqueVisitors: { $size: "$visitorSessions" },
                        pagesTracked: { $size: "$paths" },
                    },
                },
            ]),
            WebVisit.aggregate([
                { $match: { createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                date: "$createdAt",
                                format: "%Y-%m-%d",
                                timezone: "Asia/Dhaka",
                            },
                        },
                        pageViews: { $sum: 1 },
                        visitorSessions: { $addToSet: "$sessionKey" },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        date: "$_id",
                        pageViews: 1,
                        visitors: { $size: "$visitorSessions" },
                    },
                },
                { $sort: { date: 1 } },
            ]),
            WebVisit.aggregate([
                { $match: { createdAt: { $gte: since } } },
                {
                    $group: {
                        _id: "$path",
                        pageViews: { $sum: 1 },
                        visitorSessions: { $addToSet: "$sessionKey" },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        path: "$_id",
                        pageViews: 1,
                        visitors: { $size: "$visitorSessions" },
                    },
                },
                { $sort: { pageViews: -1, path: 1 } },
                { $limit: 8 },
            ]),
        ]);

        return NextResponse.json({
            success: true,
            days,
            summary: summary[0] || {
                pageViews: 0,
                uniqueVisitors: 0,
                pagesTracked: 0,
            },
            daily,
            topPages,
            privacy: {
                visitorDefinition: "Anonymous browser sessions, not verified people",
                retentionDays: 90,
                memberAndAdminPagesExcluded: true,
                ipAddressesStored: false,
            },
        });
    } catch (error) {
        console.error("Admin analytics load failed:", error);
        return NextResponse.json(
            { success: false, message: "ওয়েব ট্রাফিকের তথ্য লোড করা যায়নি" },
            { status: 500 }
        );
    }
}
