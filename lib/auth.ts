// বাংলা: এই module-এ login token যাচাই করে বর্তমান ব্যবহারকারীর পরিচয় পাওয়া যায়।
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export interface AuthUser {
    userId: string;
    role: "admin" | "member";
    memberId?: string;
}

// বাংলা: cookie-এর token যাচাই করে login করা ব্যবহারকারীর তথ্য ফেরত দেয়।
export async function getAuthUser(): Promise<AuthUser | null> {
    const token = (await cookies()).get("auth_token")?.value;
    const secret = process.env.JWT_SECRET;

    if (!token || !secret) {
        return null;
    }

    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret)
        );

        if (
            typeof payload.userId !== "string" ||
            (payload.role !== "admin" && payload.role !== "member")
        ) {
            return null;
        }

        return {
            userId: payload.userId,
            role: payload.role,
            memberId:
                typeof payload.memberId === "string"
                    ? payload.memberId
                    : undefined,
        };
    } catch {
        return null;
    }
}