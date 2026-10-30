// app/api/member/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import User from "@/models/user";
import { Member, Payment, Notice } from "@/lib/sheetsModels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHEETS = [
    "Payments",
    "Member Savings",
    "Deposits",
    "Withdrawals",
    "Loans",
    "Loan Payments",
    "Loan Repayments",
];

const text = (value: unknown) =>
    String(value ?? "").trim();

const normalize = (value: unknown) =>
    text(value).toLowerCase();

function field(data: any, ...names: string[]) {
    for (const name of names) {
        if (data?.[name] !== undefined && data[name] !== null) {
            if (text(data[name]) !== "") return data[name];
        }
    }
    return "";
}

function getData(doc: any) {
    return doc?.data && typeof doc.data === "object"
        ? doc.data
        : doc ?? {};
}

function getMemberId(data: any) {
    return text(field(
        data,
        "MemberID",
        "Member ID",
        "memberId",
        "Member Id"
    ));
}

function getAmount(data: any) {
    const raw = field(
        data,
        "Amount",
        "amount",
        "টাকা",
        "LoanAmount",
        "DepositAmount"
    );

    const amount = Number(String(raw).replace(/,/g, ""));
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getStatus(data: any) {
    return text(field(data, "Status", "status")) || "Unknown";
}

function isApproved(data: any) {
    return ["approved", "paid", "completed", "success", "successful"]
        .includes(normalize(getStatus(data)));
}

function getType(doc: any, data: any) {
    const source = normalize(doc?.sourceSheet);
    const value = normalize(field(
        data,
        "Type",
        "type",
        "Payment Type",
        "Transaction Type"
    ));

    // Loan repayment-কে নতুন loan হিসেবে গণনা করা যাবে না।
    if (
        source.includes("repayment") ||
        source.includes("loan payment") ||
        value.includes("repayment") ||
        value.includes("installment") ||
        value.includes("loan payment")
    ) {
        return "loan_payment";
    }

    if (source.includes("withdraw") || value.includes("withdraw")) {
        return "withdrawal";
    }

    if (source.includes("loan") || value.includes("loan")) {
        return "loan";
    }

    return "deposit";
}

function safeProfile(data: any) {
    // NID, password বা সংবেদনশীল তথ্য ফেরত দেওয়া হয় না।
    return {
        memberId: field(data, "MemberID", "Member ID"),
        name: field(data, "নাম", "Name"),
        whatsapp: field(data, "WhatsApp"),
        otherMobile: field(data, "অন্য মোবাইল", "মোবাইল", "Mobile"),
        email: field(data, "Gmail", "Email"),
        address: field(data, "ঠিকানা", "Address"),
        joinDate: field(data, "যোগদানের তারিখ", "Join Date"),
        status: field(data, "Status"),
        shares: field(data, "অংশ সংখ্যা", "Shares"),
        monthlyDeposit: field(data, "মাসিক জমা", "Monthly Deposit"),
        nomineeName: field(data, "Nominee নাম"),
        nomineeMobile: field(data, "Nominee মোবাইল"),
        nomineeRelation: field(data, "Nominee সম্পর্ক"),
    };
}

async function getContext() {
    const session = await getAuthUser();

    if (!session) {
        return { error: "প্রথমে লগইন করুন", status: 401 } as const;
    }

    if (session.role !== "member") {
        return { error: "এই কাজের অনুমতি নেই", status: 403 } as const;
    }

    await connectDB();

    const account: any = await User.findOne({
        _id: session.userId,
        role: "member",
        isActive: true,
    })
        .select("name email memberId phone photoUrl")
        .lean();

    if (!account) {
        return { error: "সদস্যের account পাওয়া যায়নি", status: 404 } as const;
    }

    const accountMemberId = text(account.memberId);
    const accountEmail = normalize(account.email);

    // প্রথমে account-এর MemberID; না থাকলে email দিয়ে member খোঁজা।
    let memberDoc: any = null;

    if (accountMemberId) {
        memberDoc = await Member.findOne({
            sourceSheet: "Members",
            $or: [
                { recordId: accountMemberId },
                { "data.MemberID": accountMemberId },
                { "data.Member ID": accountMemberId },
                { MemberID: accountMemberId },
            ],
        }).lean();
    }

    if (!memberDoc && accountEmail) {
        memberDoc = await Member.findOne({
            sourceSheet: "Members",
            $or: [
                { "data.Gmail": account.email },
                { "data.Email": account.email },
                { "data.email": account.email },
                { Gmail: account.email },
                { Email: account.email },
            ],
        }).lean();
    }

    const sheetData = getData(memberDoc);
    const resolvedMemberId =
        accountMemberId || getMemberId(sheetData);

    return {
        account,
        sheetData,
        memberDoc,
        memberId: resolvedMemberId,
        email: accountEmail,
    } as const;
}

export async function GET() {
    try {
        const context = await getContext();

        if ("error" in context) {
            return NextResponse.json(
                { success: false, message: context.error },
                { status: context.status }
            );
        }

        const { account, sheetData, memberId, email } = context;

        // MemberID না থাকলে আর্থিক record ফেরত দেওয়া হবে না।
        const docs: any[] = memberId
            ? await Payment.find({
                sourceSheet: { $in: SHEETS },
            })
                .sort({ createdAt: -1 })
                .limit(5000)
                .lean()
            : [];

        const ownPayments = docs.filter((doc) => {
            const data = getData(doc);
            return normalize(getMemberId(data)) === normalize(memberId);
        });

        const transactions = ownPayments.map((doc) => {
            const data = getData(doc);
            const type = getType(doc, data);

            return {
                id: text(field(
                    data,
                    "Transaction ID",
                    "TransactionID",
                    "PaymentID",
                    "DepositID",
                    "WithdrawalID",
                    "LoanID"
                )) || text(doc.recordId),
                type,
                amount: getAmount(data),
                date: field(
                    data,
                    "Payment Date",
                    "PaymentDate",
                    "Date",
                    "depositDate",
                    "withdrawalDate",
                    "LoanDate"
                ) || doc.createdAt || "",
                status: getStatus(data),
                description: field(
                    data,
                    "Description",
                    "description",
                    "Note",
                    "নোট",
                    "Payment Type",
                    "Type"
                ),
                method: field(data, "Method", "method", "PaymentMethod"),
                sourceSheet: text(doc.sourceSheet),
            };
        });

        const savings = transactions.filter((item) => {
            const source = normalize(item.sourceSheet);
            return (
                ["member savings", "deposits", "payments"].includes(source) &&
                item.type === "deposit"
            );
        });

        const loans = transactions.filter((item) => item.type === "loan");
        const repayments = transactions.filter(
            (item) => item.type === "loan_payment"
        );

        const approvedTotal = (items: any[]) =>
            items.reduce((sum, item) => {
                return ["approved", "paid", "completed", "success", "successful"]
                    .includes(normalize(item.status))
                    ? sum + Number(item.amount || 0)
                    : sum;
            }, 0);

        const noticeDocs: any[] = await Notice.find({
            sourceSheet: "Notices",
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const notices = noticeDocs
            .map((doc) => {
                const data = getData(doc);
                return {
                    id: text(field(data, "NoticeID", "Notice ID")) ||
                        text(doc.recordId),
                    title: field(data, "Title", "শিরোনাম", "নোটিশ"),
                    description: field(data, "Description", "বিবরণ", "Details"),
                    publishDate: field(data, "Publish Date", "PublishDate", "Date"),
                    priority: field(data, "Priority"),
                    status: getStatus(data),
                };
            })
            .filter((item) => {
                const status = normalize(item.status);
                return (
                    item.title &&
                    ["unknown", "active", "published", "approved"].includes(status)
                );
            });

        return NextResponse.json({
            success: true,
            profile: {
                ...safeProfile(sheetData),
                memberId: memberId || "",
                name: text(account.name) || text(safeProfile(sheetData).name),
                email: text(account.email) || text(safeProfile(sheetData).email),
                phone: text(account.phone) || text(safeProfile(sheetData).otherMobile),
                photoUrl: text(account.photoUrl),
                sheetLinked: Boolean(context.memberDoc),
            },
            transactions,
            savings: {
                total: approvedTotal(savings),
                records: savings,
            },
            loans: {
                totalLoan: approvedTotal(loans),
                totalRepaid: approvedTotal(repayments),
                outstanding: Math.max(
                    0,
                    approvedTotal(loans) - approvedTotal(repayments)
                ),
                records: loans,
                repayments,
            },
            notices,
        });
    } catch (error) {
        console.error("Member portal GET error:", error);
        return NextResponse.json(
            { success: false, message: "ড্যাশবোর্ডের তথ্য লোড করা যায়নি" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const context = await getContext();

        if ("error" in context) {
            return NextResponse.json(
                { success: false, message: context.error },
                { status: context.status }
            );
        }

        const body = await request.json();

        const name = text(body.name);
        const phone = text(body.phone);

        if (name.length < 2 || name.length > 100) {
            return NextResponse.json(
                { success: false, message: "নাম ২ থেকে ১০০ অক্ষরের মধ্যে দিন" },
                { status: 400 }
            );
        }

        if (phone.length > 25) {
            return NextResponse.json(
                { success: false, message: "ফোন নম্বরটি সঠিক নয়" },
                { status: 400 }
            );
        }

        const updated: any = await User.findOneAndUpdate(
            {
                _id: context.account._id,
                role: "member",
                isActive: true,
            },
            {
                $set: { name, phone },
            },
            {
                new: true,
                runValidators: true,
            }
        )
            .select("name email memberId phone photoUrl")
            .lean();

        if (!updated) {
            return NextResponse.json(
                { success: false, message: "Account আপডেট করা যায়নি" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Profile settings আপডেট হয়েছে",
            account: {
                name: updated.name,
                email: updated.email,
                memberId: updated.memberId || "",
                phone: updated.phone || "",
                photoUrl: updated.photoUrl || "",
            },
        });
    } catch (error) {
        console.error("Member portal PATCH error:", error);
        return NextResponse.json(
            { success: false, message: "Settings আপডেট করা যায়নি" },
            { status: 500 }
        );
    }
}