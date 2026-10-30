// বাংলা: এই API route-এ dashboard সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { requireRole } from "@/lib/require-auth";

import {
    Member,
    Customer,
    Investment,
    CustomerPayment,
    Payment,
    CashBook,
    Expense,
} from "@/lib/sheetsModels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* =====================================================
   Helpers
===================================================== */

type RecordLike = Record<string, unknown> | null | undefined;

type RecentPayment = {
    id: string;
    memberId: string;
    memberName: string;
    amount: number;
    status: string;
    date: string | null;
};

type RecentInvestment = {
    id: string;
    customerId: string;
    product: string;
    cost: number;
    salePrice: number;
    profit: number;
    status: string;
    date: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object"
        ? (value as Record<string, unknown>)
        : {};
}

function getData(record: unknown): Record<string, unknown> {
    const base = asRecord(record);
    const nested = asRecord(
        (record as RecordLike & { data?: unknown })?.data,
    );

    return { ...base, ...nested };
}

function getValue(
    record: unknown,
    keys: string[],
) {
    const data = getData(record);

    for (const key of keys) {
        const value = data[key];

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            return value;
        }
    }

    return undefined;
}

function toStringValue(value: unknown): string {
    if (value === undefined || value === null) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return String(value);
}

function toNumber(value: unknown): number {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === "string") {
        const cleaned = value
            .replace(/৳/g, "")
            .replace(/,/g, "")
            .trim();

        const number = Number(cleaned);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    return 0;
}

function getAmount(record: unknown) {
    return toNumber(
        getValue(record, [
            "amount",
            "Amount",
            "টাকা",
            "পরিমাণ",
            "paymentAmount",
            "Payment Amount",
            "totalAmount",
            "Total Amount",
            "customerTotalPrice",
            "Customer Total Price",
        ]),
    );
}

function getStatus(record: unknown) {
    return String(
        getValue(record, [
            "status",
            "Status",
            "স্থিতি",
        ]) ?? "",
    )
        .trim()
        .toLowerCase();
}

function getDate(record: unknown) {
    return getValue(record, [
        "date",
        "Date",
        "তারিখ",
        "paymentDate",
        "Payment Date",
        "Purchase Date",
        "purchaseDate",
        "createdAt",
        "Created At",
        "submittedAt",
        "Submitted At",
    ]);
}

function isApproved(record: unknown) {
    const status = getStatus(record);

    return (
        status === "" ||
        status === "approved" ||
        status === "paid" ||
        status === "active" ||
        status === "completed"
    );
}

function isPending(record: unknown) {
    const status = getStatus(record);

    return (
        status === "pending" ||
        status === "submitted"
    );
}

function isSameMonth(
    value: unknown,
    year: number,
    month: number,
) {
    if (!value) return false;

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    return (
        date.getFullYear() === year &&
        date.getMonth() === month
    );
}

/* =====================================================
   API
===================================================== */

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET() {
    try {
        /* ---------------------------------------------
           Admin Authentication
        --------------------------------------------- */

        const auth = await requireRole(["admin"]);

        if (auth.response) {
            return auth.response;
        }

        await connectDB();

        const now = new Date();

        const currentYear =
            now.getFullYear();

        const currentMonth =
            now.getMonth();

        /* ---------------------------------------------
           Fetch Data
        --------------------------------------------- */

        const [
            members,
            customers,
            payments,
            customerPayments,
            investments,
            expenses,
            cashBooks,
        ] = await Promise.all([
            Member.find({}).lean(),

            Customer.find({}).lean(),

            Payment.find({
                sourceSheet: "Member Savings",
            })
                .sort({ createdAt: -1 })
                .lean(),

            CustomerPayment.find({})
                .sort({ createdAt: -1 })
                .lean(),

            Investment.find({})
                .sort({ createdAt: -1 })
                .lean(),

            Expense.find({})
                .sort({ createdAt: -1 })
                .lean(),

            CashBook.find({})
                .sort({ createdAt: -1 })
                .lean(),
        ]);

        /* =================================================
           MEMBERS
        ================================================= */

        const totalMembers =
            members.length;

        const activeMembers =
            members.filter((member) => {
                const status =
                    String(
                        getValue(member, [
                            "Status",
                            "status",
                            "LoginStatus",
                            "loginStatus",
                        ]) ?? "",
                    )
                        .trim()
                        .toLowerCase();

                return (
                    status === "" ||
                    status === "active"
                );
            }).length;

        /* =================================================
           CUSTOMERS
        ================================================= */

        const totalCustomers =
            customers.length;

        /* =================================================
           MEMBER PAYMENTS
        ================================================= */

        let memberCollection = 0;

        let currentMonthMemberCollection =
            0;

        let memberPending = 0;

        let memberApproved = 0;

        const recentPayments: RecentPayment[] = [];

        for (const payment of payments) {
            const amount =
                getAmount(payment);

            if (isApproved(payment)) {
                memberCollection += amount;

                memberApproved++;

                if (
                    isSameMonth(
                        getDate(payment),
                        currentYear,
                        currentMonth,
                    )
                ) {
                    currentMonthMemberCollection +=
                        amount;
                }
            }

            if (isPending(payment)) {
                memberPending++;
            }

            if (recentPayments.length < 10) {
                recentPayments.push({
                    id:
                        getValue(
                            payment,
                            [
                                "paymentId",
                                "PaymentID",
                                "Payment Id",
                                "Transaction ID",
                            ],
                        ) ??
                        payment._id.toString(),

                    memberId:
                        toStringValue(
                            getValue(
                                payment,
                                [
                                    "memberId",
                                    "MemberID",
                                ],
                            ),
                        ),

                    memberName:
                        toStringValue(
                            getValue(
                                payment,
                                [
                                    "memberMatchedName",
                                    "memberName",
                                    "Member Name",
                                    "নাম",
                                ],
                            ),
                        ),

                    amount,

                    status:
                        toStringValue(
                            getStatus(payment) ||
                                "approved",
                        ),

                    date:
                        getDate(payment) ===
                        undefined ||
                        getDate(payment) ===
                        null
                            ? null
                            : String(
                                  getDate(payment),
                              ),
                });
            }
        }

        /* =================================================
           CUSTOMER PAYMENTS
        ================================================= */

        let customerCollection = 0;

        let currentMonthCustomerCollection =
            0;

        let customerPending = 0;

        for (const payment of customerPayments) {
            const amount =
                getAmount(payment);

            if (isApproved(payment)) {
                customerCollection +=
                    amount;

                if (
                    isSameMonth(
                        getDate(payment),
                        currentYear,
                        currentMonth,
                    )
                ) {
                    currentMonthCustomerCollection +=
                        amount;
                }
            }

            if (isPending(payment)) {
                customerPending++;
            }
        }

        /* =================================================
           TOTAL COLLECTION
        ================================================= */

        const totalCollection =
            memberCollection +
            customerCollection;

        const currentMonthCollection =
            currentMonthMemberCollection +
            currentMonthCustomerCollection;

        /* =================================================
           INVESTMENTS
        ================================================= */

        let investmentCost = 0;

        let sales = 0;

        let profit = 0;

        const recentInvestments: RecentInvestment[] =
            [];

        for (const investment of investments) {
            const purchasePrice =
                toNumber(
                    getValue(
                        investment,
                        [
                            "purchasePrice",
                            "Purchase Price",
                            "PurchasePrice",
                            "ক্রয় মূল্য",
                            "ক্রয় মূল্য",
                        ],
                    ),
                );

            const totalCost =
                toNumber(
                    getValue(
                        investment,
                        [
                            "totalCost",
                            "Total Cost",
                            "TotalCost",
                        ],
                    ),
                );

            const salePrice =
                toNumber(
                    getValue(
                        investment,
                        [
                            "salePrice",
                            "Sale Price",
                            "customerTotalPrice",
                            "Customer Total Price",
                            "CustomerTotalPrice",
                            "বিক্রয় মূল্য",
                            "বিক্রয় মূল্য",
                        ],
                    ),
                );

            const investmentProfit =
                toNumber(
                    getValue(
                        investment,
                        [
                            "profit",
                            "Profit",
                            "লাভ",
                        ],
                    ),
                );

            investmentCost +=
                totalCost > 0
                    ? totalCost
                    : purchasePrice;

            sales += salePrice;

            profit += investmentProfit;

            if (
                recentInvestments.length <
                10
            ) {
                recentInvestments.push({
                    id:
                        getValue(
                            investment,
                            [
                                "investmentId",
                                "InvestmentID",
                            ],
                        ) ??
                        investment._id.toString(),

                    customerId:
                        toStringValue(
                            getValue(
                                investment,
                                [
                                    "customerId",
                                    "CustomerID",
                                ],
                            ),
                        ),

                    product:
                        toStringValue(
                            getValue(
                                investment,
                                [
                                    "product",
                                    "পণ্যের নাম",
                                    "Product",
                                ],
                            ),
                        ),

                    cost:
                        totalCost > 0
                            ? totalCost
                            : purchasePrice,

                    salePrice,

                    profit:
                        investmentProfit,

                    status:
                        toStringValue(
                            getValue(
                                investment,
                                [
                                    "status",
                                    "Status",
                                ],
                            ),
                        ),

                    date:
                        getValue(
                            investment,
                            [
                                "purchaseDate",
                                "Purchase Date",
                            ],
                        ) === undefined ||
                        getValue(
                            investment,
                            [
                                "purchaseDate",
                                "Purchase Date",
                            ],
                        ) === null
                            ? null
                            : String(
                                  getValue(
                                      investment,
                                      [
                                          "purchaseDate",
                                          "Purchase Date",
                                      ],
                                  ),
                              ),
                });
            }
        }

        /* =================================================
           EXPENSES
        ================================================= */

        let totalExpenses = 0;

        let currentMonthExpenses =
            0;

        for (const expense of expenses) {
            const status =
                getStatus(expense);

            const approved =
                status === "" ||
                status === "approved" ||
                status === "paid" ||
                status === "active";

            if (!approved) {
                continue;
            }

            const amount =
                getAmount(expense);

            totalExpenses += amount;

            if (
                isSameMonth(
                    getDate(expense),
                    currentYear,
                    currentMonth,
                )
            ) {
                currentMonthExpenses +=
                    amount;
            }
        }

        /* =================================================
           CASHBOOK
        ================================================= */

        let cashIn = 0;

        let cashOut = 0;

        for (const entry of cashBooks) {
            const moneyIn =
                toNumber(
                    getValue(entry, [
                        "moneyIn",
                        "Money In",
                        "MoneyIn",
                        "জমা",
                    ]),
                );

            const moneyOut =
                toNumber(
                    getValue(entry, [
                        "moneyOut",
                        "Money Out",
                        "MoneyOut",
                        "খরচ",
                    ]),
                );

            cashIn += moneyIn;

            cashOut += moneyOut;
        }

        /* ---------------------------------------------
           Cash fallback
        --------------------------------------------- */

        const calculatedCash =
            totalCollection -
            investmentCost -
            totalExpenses;

        const cashBalance =
            cashBooks.length > 0
                ? cashIn - cashOut
                : calculatedCash;

        /* =================================================
           FINAL RESPONSE
        ================================================= */

        return NextResponse.json({
            success: true,

            dashboard: {
                members: {
                    total: totalMembers,
                    active: activeMembers,
                },

                customers: {
                    total: totalCustomers,
                },

                collections: {
                    total: totalCollection,

                    member: memberCollection,

                    customer:
                        customerCollection,

                    currentMonth:
                        currentMonthCollection,

                    currentMonthMember:
                        currentMonthMemberCollection,

                    currentMonthCustomer:
                        currentMonthCustomerCollection,
                },

                investments: {
                    total:
                        investments.length,

                    cost:
                        investmentCost,

                    sales,

                    profit,
                },

                expenses: {
                    total:
                        totalExpenses,

                    currentMonth:
                        currentMonthExpenses,
                },

                cash: {
                    in: cashIn,

                    out: cashOut,

                    balance: cashBalance,
                },

                payments: {
                    total:
                        payments.length +
                        customerPayments.length,

                    member:
                        payments.length,

                    customer:
                        customerPayments.length,

                    approved:
                        memberApproved,

                    pending:
                        memberPending +
                        customerPending,
                },

                recentPayments,

                recentInvestments,

                month: {
                    year:
                        currentYear,

                    month:
                        currentMonth + 1,

                    collection:
                        currentMonthCollection,
                },
            },
        });
    } catch (error) {
        console.error(
            "AL-INSAF DASHBOARD ERROR:",
            error,
        );

        return NextResponse.json(
            {
                success: false,

                message:
                    "Dashboard data load failed",

                error:
                    process.env.NODE_ENV ===
                    "development"
                        ? error instanceof Error
                            ? error.message
                            : String(error)
                        : undefined,
            },
            {
                status: 500,
            },
        );
    }
}
