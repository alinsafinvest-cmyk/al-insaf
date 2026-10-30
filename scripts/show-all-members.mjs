// বাংলা: এই script-এ database-এর member record পরিদর্শনের জন্য তালিকাভুক্ত করা হয়।
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({
  path: ".env.local",
});

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "❌ MONGODB_URI পাওয়া যায়নি। .env.local check করুন।"
  );
}

const sheetRecordSchema = new mongoose.Schema(
  {
    sourceSheet: String,
    recordId: String,
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    syncedAt: Date,
  },
  {
    timestamps: true,
    strict: false,
  }
);

const Member =
  mongoose.models.AlInsafMember ||
  mongoose.model(
    "AlInsafMember",
    sheetRecordSchema,
    "members"
  );

// বাংলা: এই script-এ database-এর member record পরিদর্শনের জন্য তালিকাভুক্ত করা হয়।
async function main() {
  try {
    console.log("");
    console.log("======================================");
    console.log("👥 ALL MEMBERS");
    console.log("======================================");
    console.log("");

    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected");
    console.log("");

    const members = await Member.find({}).lean();

    console.log(`Total members: ${members.length}`);
    console.log("");

    members.forEach((member, index) => {
      const memberId =
        member.recordId ||
        member.data?.memberId ||
        member.data?.MemberID ||
        "NO-ID";

      const name =
        member.data?.["নাম"] ||
        member.data?.name ||
        member.data?.Name ||
        "NO-NAME";

      const phone =
        member.data?.["WhatsApp"] ||
        member.data?.phone ||
        member.data?.["মোবাইল"] ||
        "";

      console.log(
        `${index + 1}. ${memberId} → ${name}${
          phone ? ` → ${phone}` : ""
        }`
      );
    });

    console.log("");
    console.log("======================================");
    console.log("✅ Completed");
    console.log("======================================");
  } catch (error) {
    console.error("");
    console.error("❌ ERROR:");
    console.error(error);
  } finally {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }

    console.log("");
    console.log("🔌 MongoDB disconnected");
  }
}

main();
