// বাংলা: এই script-এ member record-এর অবস্থা database থেকে পরীক্ষা করা হয়।
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

// বাংলা: এই script-এ member record-এর অবস্থা database থেকে পরীক্ষা করা হয়।
async function main() {
  try {
    console.log("");
    console.log("======================================");
    console.log("🔍 INSPECTING MEMBER DOCUMENTS");
    console.log("======================================");
    console.log("");

    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected");
    console.log("");

    const members = await Member.find({})
      .limit(12)
      .lean();

    console.log(
      `Total members found: ${members.length}`
    );

    console.log("");

    members.forEach((member, index) => {
      console.log(
        "======================================"
      );

      console.log(
        `👤 MEMBER ${index + 1}`
      );

      console.log(
        "======================================"
      );

      console.log(
        JSON.stringify(
          member,
          null,
          2
        )
      );

      console.log("");
    });

    console.log(
      "======================================"
    );

    console.log(
      "✅ Inspection completed"
    );

    console.log(
      "======================================"
    );
  } catch (error) {
    console.error("");
    console.error("❌ ERROR:");
    console.error(error);
  } finally {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }

    console.log("");
    console.log(
      "🔌 MongoDB disconnected"
    );
  }
}

main();
