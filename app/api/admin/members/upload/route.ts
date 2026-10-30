// বাংলা: এই API route-এ admin → members → upload সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/lib/require-auth";

export const runtime = "nodejs";

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(
    request: NextRequest
) {
    try {
        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        const formData =
            await request.formData();

        const file =
            formData.get("file") as File | null;

        const memberId =
            String(
                formData.get("memberId") ||
                ""
            ).trim();

        const fileType =
            String(
                formData.get("fileType") ||
                "document"
            ).trim();

        if (!file) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "File নির্বাচন করুন",
                },
                { status: 400 }
            );
        }

        if (!memberId) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "MemberID পাওয়া যায়নি",
                },
                { status: 400 }
            );
        }

        /*
         * File size limit: 10MB
         */

        if (
            file.size >
            10 * 1024 * 1024
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "File সর্বোচ্চ 10MB হতে পারবে",
                },
                { status: 400 }
            );
        }

        const bytes =
            await file.arrayBuffer();

        const base64 =
            Buffer.from(bytes)
                .toString("base64");

        const appsScriptUrl =
            process.env
                .GOOGLE_APPS_SCRIPT_URL;

        if (!appsScriptUrl) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "GOOGLE_APPS_SCRIPT_URL সেট করা হয়নি",
                },
                { status: 500 }
            );
        }

        const response =
            await fetch(
                appsScriptUrl,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        action:
                            "uploadMemberFile",

                        memberId,

                        fileType,

                        fileName:
                            file.name,

                        mimeType:
                            file.type ||
                            "application/octet-stream",

                        base64Data:
                            base64,
                    }),

                    cache: "no-store",
                }
            );

        const result =
            await response.json();

        if (!result.success) {
            return NextResponse.json(
                result,
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,

            message:
                "File Google Drive-এ upload হয়েছে",

            fileId:
                result.fileId,

            fileName:
                result.fileName,

            mimeType:
                result.mimeType,
        });

    } catch (error: any) {
        console.error(
            "UPLOAD ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                message:
                    error?.message ||
                    "File upload করা যায়নি",
            },
            { status: 500 }
        );
    }
}