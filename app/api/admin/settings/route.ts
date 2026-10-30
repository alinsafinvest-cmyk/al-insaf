// বাংলা: এই API route-এ admin → settings সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";
import { SystemConfig } from "@/lib/sheetsModels";
import {
    DEFAULT_THEME_SETTINGS,
    normalizeThemeSettings,
} from "@/lib/theme-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
    organizationName: "AL-INSAF INVESTMENT LTD.",
    organizationShortName: "AL-INSAF",
    foundedAt: "",
    ...DEFAULT_THEME_SETTINGS,
    tagline: "Investment & Financial Services",

    email: "alinsaf@gmail.com",
    phone: "",
    whatsapp: "",

    address: "",

    currency: "BDT",
    currencySymbol: "৳",

    receiptPrefix: "RCT",
    depositReceiptPrefix: "DR",
    withdrawalReceiptPrefix: "WR",
    loanReceiptPrefix: "LR",

    logoFileName:
        "WhatsApp Image 2026-10-01 at 8.09.06 PM.jpeg",

    logoUrl:
        "/WhatsApp Image 2026-10-01 at 8.09.06 PM.jpeg",

    receiptFooter:
        "This is a computer-generated receipt.",

    receiptWatermark: true,

    allowMemberRegistration: true,
    allowMemberLogin: true,

    maintenanceMode: false,

    notificationsEnabled: true,

    autoCashBookSync: true,

    updatedAt: null,
    updatedBy: "",
};

function getSettingsData(record: any) {
    return {
        ...DEFAULT_SETTINGS,
        ...(record?.data || {}),
    };
}

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const record = await SystemConfig.findOne({
            sourceSheet: "SystemConfig",
            recordId: "SYSTEM",
        }).lean();

        if (!record) {
            return NextResponse.json({
                success: true,
                settings: DEFAULT_SETTINGS,
            });
        }

        return NextResponse.json({
            success: true,
            settings: getSettingsData(record),
        });
    } catch (error: any) {
        console.error("Settings GET Error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Settings load failed",
            },
            { status: 500 },
        );
    }
}

// বাংলা: PUT অনুরোধে যাচাইকৃত তথ্য দিয়ে বিদ্যমান রেকর্ড হালনাগাদ করে।
export async function PUT(request: Request) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        const body = await request.json();

        await connectDB();

        const existing =
            await SystemConfig.findOne({
                sourceSheet: "SystemConfig",
                recordId: "SYSTEM",
            });

        const currentData = existing
            ? getSettingsData(existing)
            : DEFAULT_SETTINGS;

        const updatedData = {
            ...currentData,
            ...normalizeThemeSettings({
                themePreset: body.themePreset ?? currentData.themePreset,
                themeMode: body.themeMode ?? currentData.themeMode,
                primaryColor: body.primaryColor ?? currentData.primaryColor,
            }),

            organizationName:
                body.organizationName ??
                currentData.organizationName,

            organizationShortName:
                body.organizationShortName ??
                currentData.organizationShortName,

            foundedAt:
                body.foundedAt ??
                currentData.foundedAt,

            tagline:
                body.tagline ??
                currentData.tagline,

            email:
                body.email ??
                currentData.email,

            phone:
                body.phone ??
                currentData.phone,

            whatsapp:
                body.whatsapp ??
                currentData.whatsapp,

            address:
                body.address ??
                currentData.address,

            currency:
                body.currency ??
                currentData.currency,

            currencySymbol:
                body.currencySymbol ??
                currentData.currencySymbol,

            receiptPrefix:
                body.receiptPrefix ??
                currentData.receiptPrefix,

            depositReceiptPrefix:
                body.depositReceiptPrefix ??
                currentData.depositReceiptPrefix,

            withdrawalReceiptPrefix:
                body.withdrawalReceiptPrefix ??
                currentData.withdrawalReceiptPrefix,

            loanReceiptPrefix:
                body.loanReceiptPrefix ??
                currentData.loanReceiptPrefix,

            logoFileName:
                body.logoFileName ??
                currentData.logoFileName,

            logoUrl:
                body.logoUrl ??
                currentData.logoUrl,

            receiptFooter:
                body.receiptFooter ??
                currentData.receiptFooter,

            receiptWatermark:
                body.receiptWatermark ??
                currentData.receiptWatermark,

            allowMemberRegistration:
                body.allowMemberRegistration ??
                currentData.allowMemberRegistration,

            allowMemberLogin:
                body.allowMemberLogin ??
                currentData.allowMemberLogin,

            maintenanceMode:
                body.maintenanceMode ??
                currentData.maintenanceMode,

            notificationsEnabled:
                body.notificationsEnabled ??
                currentData.notificationsEnabled,

            autoCashBookSync:
                body.autoCashBookSync ??
                currentData.autoCashBookSync,

            updatedAt: new Date(),

            updatedBy: auth.user?.userId || "admin",
        };

        const saved =
            await SystemConfig.findOneAndUpdate(
                {
                    sourceSheet: "SystemConfig",
                    recordId: "SYSTEM",
                },
                {
                    $set: {
                        sourceSheet:
                            "SystemConfig",

                        recordId: "SYSTEM",

                        data: updatedData,

                        syncedAt: new Date(),
                    },
                },
                {
                    upsert: true,
                    new: true,
                },
            );

        return NextResponse.json({
            success: true,
            message: "Settings saved successfully",
            settings: getSettingsData(saved),
        });
    } catch (error: any) {
        console.error("Settings PUT Error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "Settings save failed",
            },
            { status: 500 },
        );
    }
}