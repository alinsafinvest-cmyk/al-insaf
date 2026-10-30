// বাংলা: এই একবার-চালানোর script-এ environment থেকে দেওয়া তথ্য নিয়ে প্রাথমিক admin account তৈরি হয়।
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// .env.local load
dotenv.config({
  path: ".env.local",
});

// বাংলা: প্রাথমিক admin তৈরির আগে configuration যাচাই করে account database-এ সংরক্ষণ করে।
async function createAdmin() {
  const name = process.env.INITIAL_ADMIN_NAME?.trim();
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!name || !email || !password || password.length < 16) {
    throw new Error(
      "Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL and a unique INITIAL_ADMIN_PASSWORD of at least 16 characters in .env.local."
    );
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI missing. Please check your .env.local file."
    );
  }

  console.log("MongoDB-তে connect হচ্ছে...");

  await mongoose.connect(uri);

  console.log("MongoDB connected successfully.");

  // User schema
  const userSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      password: {
        type: String,
        required: true,
        select: false,
      },

      role: {
        type: String,
        enum: ["admin", "member"],
        default: "member",
        required: true,
      },

      memberId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
      },

      phone: {
        type: String,
        trim: true,
        default: "",
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

  const User =
    mongoose.models.User ||
    mongoose.model("User", userSchema);

  // --------------------------------
  // Check existing admin
  // --------------------------------

  const existing = await User.findOne({
    email: email.toLowerCase(),
  });

  if (existing) {
    console.log("");
    console.log("⚠️ এই email দিয়ে User আগে থেকেই আছে।");
    console.log("Email:", email);
    console.log("Role:", existing.role);
    console.log("Active:", existing.isActive);

    return;
  }

  // --------------------------------
  // Password hash
  // --------------------------------

  const hashedPassword = await bcrypt.hash(password, 12);

  // --------------------------------
  // Create admin
  // --------------------------------

  await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: "admin",
    isActive: true,
  });

  console.log("");
  console.log("================================");
  console.log("✅ Admin account তৈরি হয়েছে!");
  console.log("================================");
  console.log("Name:", name);
  console.log("Email:", email);
  console.log("Credentials were read from environment variables; password was not printed.");
  console.log("Role:", "admin");
  console.log("Status:", "Active");
  console.log("================================");
}

createAdmin()
  .catch((error) => {
    console.error("");
    console.error("❌ Admin creation error:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });