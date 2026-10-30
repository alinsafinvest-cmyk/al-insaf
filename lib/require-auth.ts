// বাংলা: এই module-এ API route-এর login এবং role-ভিত্তিক access control করা হয়।
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";

// বাংলা: login এবং প্রয়োজনীয় user role যাচাই করে অনুমোদিত request context দেয়।
export async function requireRole(
  allowedRoles: Array<"admin" | "member">,
) {
  const user = await getAuthUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "প্রথমে লগইন করুন" },
        { status: 401 },
      ),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      user: null,
      response: NextResponse.json(
        { message: "এই কাজের অনুমতি নেই" },
        { status: 403 },
      ),
    };
  }

  return { user, response: null };
}