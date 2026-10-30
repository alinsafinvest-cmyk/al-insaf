
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/sheetsModels";
import {
    DEFAULT_THEME_SETTINGS,
    normalizeThemeSettings,
} from "@/lib/theme-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();

        const config = await SystemConfig.findOne({
            sourceSheet: "SystemConfig",
            recordId: "SYSTEM",
        })
            .select("data")
            .lean();

        const savedData =
            config &&
                typeof config.data === "object" &&
                !Array.isArray(config.data)
                ? config.data
                : {};

        const theme = normalizeThemeSettings({
            ...DEFAULT_THEME_SETTINGS,
            ...savedData,
        });

        return NextResponse.json({
            success: true,
            theme,
        });
    } catch (error) {
        console.error("[GET /api/public/theme]", error);

        return NextResponse.json(
            {
                success: false,
                message: "সাইটের theme লোড করা যায়নি।",
            },
            { status: 500 }
        );
    }
}
