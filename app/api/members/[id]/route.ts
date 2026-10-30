// বাংলা: এই API route-এ members → id সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";;
import User from "@/models/user";
import { requireRole } from "@/lib/require-auth";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ id: string }>;
};

// বাংলা: PATCH অনুরোধে যাচাইকৃত পরিবর্তন বিদ্যমান রেকর্ডে প্রয়োগ করে।
export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireRole(["admin"]);
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { message: "ভুল Member ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      if (!body.name.trim()) {
        return NextResponse.json(
          { message: "নাম খালি রাখা যাবে না" },
          { status: 400 },
        );
      }
      updates.name = body.name.trim();
    }

    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim();
    }

    if (typeof body.isActive === "boolean") {
      updates.isActive = body.isActive;
    }

    if (typeof body.email === "string") {
      const email = body.email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { message: "সঠিক ইমেইল দিন" },
          { status: 400 },
        );
      }

      updates.email = email;
    }

    if (typeof body.memberId === "string") {
      const memberId = body.memberId.trim();

      if (!memberId) {
        return NextResponse.json(
          { message: "Member ID খালি রাখা যাবে না" },
          { status: 400 },
        );
      }

      updates.memberId = memberId;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "পরিবর্তন করার তথ্য পাওয়া যায়নি" },
        { status: 400 },
      );
    }

    await connectDB();

    const duplicate = await User.findOne({
      _id: { $ne: id },
      $or: [
        ...(updates.email ? [{ email: updates.email }] : []),
        ...(updates.memberId ? [{ memberId: updates.memberId }] : []),
      ],
    });

    if (duplicate) {
      return NextResponse.json(
        { message: "ইমেইল অথবা Member ID অন্য সদস্য ব্যবহার করছেন" },
        { status: 409 },
      );
    }

    const member = await User.findOneAndUpdate(
      { _id: id, role: "member" },
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-password");

    if (!member) {
      return NextResponse.json(
        { message: "সদস্য পাওয়া যায়নি" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "সদস্যের তথ্য আপডেট হয়েছে",
      member,
    });
  } catch (error) {
    console.error("Members PATCH:", error);

    return NextResponse.json(
      { message: "সদস্যের তথ্য আপডেট করা যায়নি" },
      { status: 500 },
    );
  }
}

// বাংলা: DELETE অনুরোধে অনুমোদন যাচাই করে নির্দিষ্ট রেকর্ড সরায়।
export async function DELETE(_request: NextRequest, context: Context) {
  const auth = await requireRole(["admin"]);
  if (auth.response) return auth.response;

  try {
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { message: "ভুল Member ID" },
        { status: 400 },
      );
    }

    await connectDB();

    // আর্থিক রেকর্ড সংরক্ষণের জন্য soft delete:
    // সদস্যকে Inactive করা হবে, স্থায়ীভাবে মুছে ফেলা হবে না।
    const member = await User.findOneAndUpdate(
      { _id: id, role: "member" },
      { $set: { isActive: false } },
      { new: true },
    ).select("-password");

    if (!member) {
      return NextResponse.json(
        { message: "সদস্য পাওয়া যায়নি" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "সদস্যকে Inactive করা হয়েছে",
      member,
    });
  } catch (error) {
    console.error("Members DELETE:", error);

    return NextResponse.json(
      { message: "সদস্যের Status পরিবর্তন করা যায়নি" },
      { status: 500 },
    );
  }
}