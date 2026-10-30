// বাংলা: এই API route-এ auth → login সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/user";

export const runtime = "nodejs";

// বাংলা: POST অনুরোধের তথ্য যাচাই করে নির্ধারিত কাজ সম্পন্ন করে।
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const identifier = String(body.email ?? body.memberId ?? body.identifier ?? "")
      .trim();

    const password = String(body.password ?? "");
    const role = body.role;

    // -----------------------------
    // Validation
    // -----------------------------

    if (!identifier || !password || !role) {
      return NextResponse.json(
        {
          message: "Email/Member ID, password and role are required",
        },
        { status: 400 }
      );
    }

    if (role !== "admin" && role !== "member") {
      return NextResponse.json(
        {
          message: "Invalid role",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // MongoDB connection
    // -----------------------------

    await connectDB();

    // -----------------------------
    // Find user
    // -----------------------------

    let user;

    if (role === "admin") {
      // Admin login by email
      user = await User.findOne({
        email: identifier.toLowerCase(),
        role: "admin",
        isActive: true,
      }).select("+password");
    } else {
      // Member login by MemberID OR email
      user = await User.findOne({
        role: "member",
        isActive: true,
        $or: [
          {
            memberId: identifier,
          },
          {
            email: identifier.toLowerCase(),
          },
        ],
      }).select("+password");
    }

    // -----------------------------
    // User not found
    // -----------------------------

    if (!user) {
      return NextResponse.json(
        {
          message: "Invalid email/member ID or password",
        },
        { status: 401 }
      );
    }

    // -----------------------------
    // Password check
    // -----------------------------

    if (!user.password) {
      return NextResponse.json(
        {
          message: "User password is not configured",
        },
        { status: 500 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return NextResponse.json(
        {
          message: "Invalid email/member ID or password",
        },
        { status: 401 }
      );
    }

    // -----------------------------
    // JWT secret
    // -----------------------------

    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
      throw new Error(
        "JWT_SECRET is missing or too short. Configure it in .env.local"
      );
    }

    // -----------------------------
    // Create JWT
    // -----------------------------

    const token = await new SignJWT({
      userId: user._id.toString(),
      role: user.role,
      memberId: user.memberId ?? null,
    })
      .setProtectedHeader({
        alg: "HS256",
      })
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(new TextEncoder().encode(secret));

    // -----------------------------
    // Response
    // -----------------------------

    const response = NextResponse.json({
      success: true,
      message: "Login successful",

      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        memberId: user.memberId ?? null,
        phone: user.phone ?? "",
      },
    });

    // -----------------------------
    // Auth cookie
    // -----------------------------

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("LOGIN API ERROR:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      {
        status: 500,
      }
    );
  }
}
