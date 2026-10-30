// বাংলা: এই script-এ payment ও member record মিলিয়ে অমিল থাকা payment খোঁজা হয়।
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({
    path: ".env.local",
});
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI পাওয়া যায়নি");
}

/* ================================
   Flexible Sheet Record Schema
================================ */

const sheetRecordSchema = new mongoose.Schema(
    {
        sourceSheet: String,
        recordId: String,
        data: mongoose.Schema.Types.Mixed,
    },
    {
        strict: false,
        collection: "payments",
    }
);

const Payment =
    mongoose.models.AlInsafPayment ||
    mongoose.model("AlInsafPayment", sheetRecordSchema);

/* ================================
   Members Schema
================================ */

const memberSchema = new mongoose.Schema(
    {},
    {
        strict: false,
        collection: "members",
    }
);

const Member =
    mongoose.models.AlInsafMember ||
    mongoose.model("AlInsafMember", memberSchema);

/* ================================
   Bengali Name Normalization
================================ */

function normalizeName(value = "") {
    let name = String(value)
        .normalize("NFKC")
        .toLowerCase()
        .trim();

    // punctuation / brackets remove
    name = name.replace(/[()[\]{}.,،؛;:：\-_/\\|]/g, " ");

    // Bengali spelling normalization
    const replacements = [
        ["য়", "য়"],
        ["ড়", "ড়"],
        ["ঢ়", "ঢ়"],

        ["আহমাদ", "আহমদ"],
        ["হাবীবুর", "হাবিবুর"],
        ["হাবীবার", "হাবিবার"],
        ["আব্দুল", "আবদুল"],
        ["আব্দুর", "আবদুর"],
        ["সাঈদ", "সাইদ"],
        ["মুকসিদুর", "মুকছিদুর"],
        ["মুজাহিদুল", "মুজাহিদ"],
    ];

    for (const [from, to] of replacements) {
        name = name.split(from).join(to);
    }

    // Common titles remove করার জন্য spaces normalize
    name = name.replace(/\s+/g, " ").trim();

    return name;
}

/* ================================
   Remove Titles
================================ */

function removeTitles(name = "") {
    let value = normalizeName(name);

    const titles = [
        "মাওলানা",
        "মুফতি",
        "হাফেজ",
        "হাফিয",
        "কারী",
        "ক্বারী",
        "কারি",
        "হাঃ",
        "মাঃ",

        "মোঃ",
        "মো:",
        "মো",
        "মুহাঃ",
        "মুহাঃ",
        "মুহাম্মদ",
        "মোহাম্মদ",
    ];

    for (const title of titles) {
        const regex = new RegExp(
            `(^|\\s)${escapeRegExp(title)}(?=\\s|$)`,
            "g"
        );

        value = value.replace(regex, " ");
    }

    return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ================================
   Tokenization
================================ */

function tokens(name = "") {
    return removeTitles(name)
        .split(/\s+/)
        .map((x) => x.trim())
        .filter(Boolean);
}

/* ================================
   Similarity Score
================================ */

function similarity(paymentName, memberName) {
    const paymentNormalized = normalizeName(paymentName);
    const memberNormalized = normalizeName(memberName);

    const paymentClean = removeTitles(paymentName);
    const memberClean = removeTitles(memberName);

    if (!paymentClean || !memberClean) {
        return 0;
    }

    // Exact normalized match
    if (paymentClean === memberClean) {
        return 100;
    }

    let score = 0;

    // Full string contains
    if (
        paymentClean.includes(memberClean) ||
        memberClean.includes(paymentClean)
    ) {
        score += 40;
    }

    // Original normalized contains
    if (
        paymentNormalized.includes(memberNormalized) ||
        memberNormalized.includes(paymentNormalized)
    ) {
        score += 20;
    }

    const paymentTokens = tokens(paymentName);
    const memberTokens = tokens(memberName);

    if (paymentTokens.length && memberTokens.length) {
        let matchedTokens = 0;

        for (const paymentToken of paymentTokens) {
            for (const memberToken of memberTokens) {
                if (
                    paymentToken === memberToken ||
                    paymentToken.includes(memberToken) ||
                    memberToken.includes(paymentToken)
                ) {
                    matchedTokens++;
                    break;
                }
            }
        }

        const tokenRatio =
            matchedTokens /
            Math.max(paymentTokens.length, memberTokens.length);

        score += tokenRatio * 40;
    }

    return Math.min(100, Math.round(score));
}

/* ================================
   Get Member Name / ID
================================ */

function getMemberName(member) {
    return (
        member.name ||
        member.Name ||
        member["নাম"] ||
        member.data?.name ||
        member.data?.Name ||
        member.data?.["নাম"] ||
        ""
    );
}

function getMemberId(member) {
    return (
        member.memberId ||
        member.MemberID ||
        member["MemberID"] ||
        member.recordId ||
        member.data?.memberId ||
        member.data?.MemberID ||
        ""
    );
}

/* ================================
   Get Payment Member Name
================================ */

function getPaymentMemberName(payment) {
    return (
        payment.data?.memberName ||
        payment.data?.MemberName ||
        payment.data?.["নাম"] ||
        payment.data?.name ||
        payment.memberName ||
        payment.MemberName ||
        ""
    );
}

/* ================================
   Main
================================ */

// বাংলা: এই script-এ payment ও member record মিলিয়ে অমিল থাকা payment খোঁজা হয়।
async function main() {
    console.log("");
    console.log("======================================");
    console.log("🔎 UNMATCHED PAYMENT NAME FINDER");
    console.log("======================================");
    console.log("");

    await mongoose.connect(MONGODB_URI);

    console.log("✅ MongoDB connected");
    console.log("");

    /* ================================
       Load Members
    ================================= */

    const members = await Member.find({}).lean();

    console.log(`👥 Members in database: ${members.length}`);
    console.log("");

    const memberList = members
        .map((member) => ({
            id: getMemberId(member),
            name: getMemberName(member),
        }))
        .filter((member) => member.id && member.name);

    /* ================================
       Load unmatched payments
    ================================= */

    const payments = await Payment.find({
        sourceSheet: "Member Savings",
        $or: [
            { "data.memberId": { $exists: false } },
            { "data.memberId": null },
            { "data.memberId": "" },
        ],
    }).lean();

    console.log(`💰 Unmatched payment records: ${payments.length}`);
    console.log("");

    /* ================================
       Group by name
    ================================= */

    const nameMap = new Map();

    for (const payment of payments) {
        const name = getPaymentMemberName(payment);

        if (!name) continue;

        const normalized = normalizeName(name);

        if (!nameMap.has(normalized)) {
            nameMap.set(normalized, {
                originalName: name,
                count: 0,
            });
        }

        nameMap.get(normalized).count++;
    }

    const unmatchedNames = [...nameMap.values()].sort(
        (a, b) => b.count - a.count
    );

    console.log(`👤 Unique unmatched names: ${unmatchedNames.length}`);
    console.log("");

    console.log("======================================");
    console.log("📋 MATCHING REPORT");
    console.log("======================================");
    console.log("");

    /* ================================
       Find candidates
    ================================= */

    for (let index = 0; index < unmatchedNames.length; index++) {
        const item = unmatchedNames[index];

        const candidates = memberList
            .map((member) => ({
                ...member,
                score: similarity(item.originalName, member.name),
            }))
            .sort((a, b) => b.score - a.score);

        console.log(
            `${index + 1}. ${item.originalName}  (${item.count} payments)`
        );

        console.log("   সম্ভাব্য সদস্য:");

        for (const candidate of candidates.slice(0, 5)) {
            let label = "⚪";

            if (candidate.score >= 85) {
                label = "🟢 STRONG";
            } else if (candidate.score >= 65) {
                label = "🟡 POSSIBLE";
            } else if (candidate.score >= 45) {
                label = "🟠 WEAK";
            }

            console.log(
                `   ${label} ${candidate.id} — ${candidate.name} — Score: ${candidate.score}`
            );
        }

        console.log("");
    }

    /* ================================
       Strong Matches Summary
    ================================= */

    console.log("");
    console.log("======================================");
    console.log("🟢 STRONG MATCHES");
    console.log("======================================");
    console.log("");

    for (const item of unmatchedNames) {
        const candidates = memberList
            .map((member) => ({
                ...member,
                score: similarity(item.originalName, member.name),
            }))
            .sort((a, b) => b.score - a.score);

        const best = candidates[0];

        if (best && best.score >= 85) {
            console.log(
                `${item.originalName} → ${best.id} (${best.name}) [${best.score}]`
            );
        }
    }

    console.log("");
    console.log("======================================");
    console.log("⚠️ IMPORTANT");
    console.log("======================================");
    console.log("");
    console.log("এই script MongoDB-তে কোনো UPDATE করেনি।");
    console.log("শুধু matching candidate দেখানো হয়েছে।");
    console.log("");

    await mongoose.disconnect();

    console.log("✅ MongoDB disconnected");
}

main().catch(async (error) => {
    console.error("");
    console.error("❌ ERROR:");
    console.error(error);
    console.error("");

    try {
        await mongoose.disconnect();
    } catch {}

    process.exit(1);
});
