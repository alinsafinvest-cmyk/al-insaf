// বাংলা: এই module-এ বাংলাদেশের অনুমোদিত payment method ও account-detail নিয়ম যাচাই করা হয়।
export const BANGLADESH_PAYMENT_METHODS = [
    "bKash",
    "Nagad",
    "Rocket",
    "Upay",
    "Bank Transfer",
    "Cash",
    "Other",
] as const;

export type BangladeshPaymentMethod =
    (typeof BANGLADESH_PAYMENT_METHODS)[number];

// বাংলা: payment method-টি সমর্থিত বাংলাদেশি method কি না যাচাই করে।
export function isBangladeshPaymentMethod(
    value: unknown,
): value is BangladeshPaymentMethod {
    return typeof value === "string" &&
        BANGLADESH_PAYMENT_METHODS.includes(
            value as BangladeshPaymentMethod,
        );
}

// বাংলা: নির্বাচিত payment method-এ account তথ্য প্রয়োজন কি না নির্ধারণ করে।
export function needsPaymentAccount(
    method: BangladeshPaymentMethod,
) {
    return method !== "Cash";
}
