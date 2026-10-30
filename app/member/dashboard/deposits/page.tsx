"use client";
// বাংলা: এই member পেজে dashboard → deposits সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";
import { BANGLADESH_PAYMENT_METHODS } from "@/lib/payment-methods";
import { openOfficialReceipt } from "@/lib/transaction-receipt";
import { SITE_LOGO } from "@/lib/site-branding";
import {
  Wallet,
  History,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  LoaderCircle,
  Printer,
} from "lucide-react";

interface Deposit {
  _id: string;
  amount: number;
  date: string;
  note?: string;
  paymentMethod?: string;
  senderNumber?: string;
  referenceNumber?: string;
  transactionId?: string;
  receiptId?: string;
  memberId?: string;
  memberName?: string;
  memberPhone?: string;
  approvedBy?: string;
  approvedAt?: string;
  status: "approved" | "pending" | "rejected";
}

interface DepositData {
  deposits: Deposit[];
  totalDeposit: number;
  totalTransactions: number;
}

const money = (amount: number, language: "bn" | "en") =>
  new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(amount);

// বাংলা: এই component member-এর deposit form, payment option ও deposit history দেখায়।
export default function MyDepositsPage() {
  const { language } = useLanguage();
  const t = (value: string) => translate(language, value);
  const printReceipt = (deposit: Deposit) => {
    if (deposit.status !== "approved") return;

    const opened = openOfficialReceipt({
      kind: "deposit",
      receiptId: deposit.receiptId || `RCT-${deposit.transactionId || deposit._id}`,
      transactionId: deposit.transactionId || "-",
      referenceId: deposit.transactionId || deposit._id,
      memberId: deposit.memberId,
      memberName: deposit.memberName,
      memberPhone: deposit.memberPhone,
      date: deposit.date,
      paymentMethod: deposit.paymentMethod,
      paymentReference: deposit.referenceNumber,
      amount: deposit.amount,
      description: deposit.note,
      approvedBy: deposit.approvedBy,
      approvedAt: deposit.approvedAt,
    }, language, SITE_LOGO);

    if (!opened) {
      window.alert(t("Popup blocked. Please allow popups in your browser."));
    }
  };
  const [data, setData] = useState<DepositData>({
    deposits: [],
    totalDeposit: 0,
    totalTransactions: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("SSLCommerz");
  const [senderNumber, setSenderNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/member/deposits", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || (language === "bn" ? "তথ্য লোড করা যায়নি" : "Unable to load data"));
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : language === "bn" ? "জমার ইতিহাস লোড করা যায়নি" : "Unable to load deposit history"
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (paymentMethod === "SSLCommerz") {
        const response = await fetch("/api/payments/sslcommerz/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Number(amount) }),
        });
        const result = await response.json();
        if (!response.ok || typeof result.redirectUrl !== "string") {
          throw new Error(result.message || (language === "bn" ? "পেমেন্ট শুরু করা যায়নি" : "Unable to start payment"));
        }
        window.location.assign(result.redirectUrl);
        return;
      }

      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          date: new Date().toISOString().slice(0, 10),
          paymentMethod,
          senderNumber,
          referenceNumber,
          note,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || (language === "bn" ? "অনুরোধ জমা দেওয়া যায়নি" : "Unable to submit request"));
      }

      setSuccess(result.message || (language === "bn" ? "অনুরোধ জমা হয়েছে" : "Request submitted"));
      setAmount("");
      setSenderNumber("");
      setReferenceNumber("");
      setNote("");
      await loadDeposits();
    } catch (err) {
      setError(err instanceof Error ? err.message : (language === "bn" ? "একটি সমস্যা হয়েছে" : "An error occurred"));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDeposits();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadDeposits]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("payment");
    if (result === "success") {
      setSuccess(
        language === "bn"
          ? "পেমেন্ট যাচাই হয়েছে এবং জমা অনুমোদিত হয়েছে।"
          : "Payment verified and deposit approved.",
      );
    } else if (result === "failed") {
      setError(
        language === "bn"
          ? "পেমেন্ট সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।"
          : "Payment was not completed. Please try again.",
      );
    }
  }, [language]);

  const statusInfo = {
    approved: {
      label: t("Approved"),
      icon: CheckCircle2,
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    },
    pending: {
      label: t("Pending"),
      icon: Clock,
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    },
    rejected: {
      label: t("Rejected"),
      icon: XCircle,
      className:
        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    },
  };

  return (
    <main className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("My Deposits")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("Your complete deposit and savings history")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDeposits()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
        >
          <RefreshCw size={16} />
          {t("Refresh")}
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900">
              <Wallet
                size={23}
                className="text-emerald-700 dark:text-emerald-300"
              />
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("Total Approved Deposit")}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {money(data.totalDeposit, language)}
              </h2>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900">
              <History
                size={23}
                className="text-blue-700 dark:text-blue-300"
              />
            </div>

            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t("Total Deposit Transactions")}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                {data.totalTransactions}
              </h2>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
          {t("New deposit request")}
        </h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          {t("Pay online through SSLCommerz checkout or choose a method for a manual deposit request.")}
        </p>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {t("Amount (৳) *")}
            <input
              type="number"
              min={paymentMethod === "SSLCommerz" ? "10" : "1"}
              max={paymentMethod === "SSLCommerz" ? "500000" : undefined}
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </label>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {t("Payment method *")}
            <select
              required
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="SSLCommerz">
                {t("SSLCommerz online payment")}
              </option>
              {BANGLADESH_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>
          {paymentMethod !== "SSLCommerz" && paymentMethod !== "Cash" && (
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("Sender phone/account")}
              <input
                required
                value={senderNumber}
                onChange={(event) => setSenderNumber(event.target.value)}
                maxLength={80}
                autoComplete="off"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
          )}
          {paymentMethod !== "SSLCommerz" && ["bKash", "Nagad", "Rocket", "Upay"].includes(paymentMethod) && (
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t("Transaction ID *")}
              <input
                required
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                maxLength={120}
                autoComplete="off"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
          )}
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200 md:col-span-2">
            {t("Note (optional)")}
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </label>
          {error && <p role="alert" className="text-sm text-red-600 md:col-span-2">{t(error)}</p>}
          {success && <p role="status" className="text-sm text-emerald-600 md:col-span-2">{t(success)}</p>}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving
                ? t("Processing...")
                : paymentMethod === "SSLCommerz"
                  ? t("Continue to secure payment")
                  : t("Submit deposit request")}
            </button>
          </div>
        </form>
        <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">
          {t("Verified SSLCommerz payments are credited automatically. Manual payment requests are credited after admin approval.")}
        </p>
      </section>

      {/* History */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-5 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("Deposit History")}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("All your deposit records are shown here.")}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-gray-500">
            <LoaderCircle size={20} className="animate-spin" />
            {t("Loading data...")}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p role="alert" className="mb-4 text-sm text-red-600">
              {t(error)}
            </p>
            <button
              type="button"
              onClick={() => void loadDeposits()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
            >
              {t("Try again")}
            </button>
          </div>
        ) : data.deposits.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet
              size={40}
              className="mx-auto mb-3 text-gray-300"
            />
            <p className="font-medium text-gray-700 dark:text-gray-200">
              {t("No deposit records yet")}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {t("Your deposit records will appear here.")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="whitespace-nowrap px-5 py-4">{t("Date")}</th>
                  <th className="whitespace-nowrap px-5 py-4">{t("Description")}</th>
                  <th className="whitespace-nowrap px-5 py-4">{t("Payment method")}</th>
                  <th className="whitespace-nowrap px-5 py-4">{t("Transaction ID")}</th>
                  <th className="whitespace-nowrap px-5 py-4">{t("Amount")}</th>
                  <th className="whitespace-nowrap px-5 py-4">{t("Status")}</th>
                  <th className="whitespace-nowrap px-5 py-4">{t("Action")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.deposits.map((deposit) => {
                  const status = statusInfo[deposit.status];
                  const StatusIcon = status.icon;

                  return (
                    <tr key={deposit._id}>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                        {new Date(deposit.date).toLocaleDateString(language === "bn" ? "bn-BD" : "en-GB")}
                      </td>

                      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                        {deposit.note || t("Savings deposit")}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                        {deposit.paymentMethod || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600 dark:text-gray-300">
                        {deposit.referenceNumber || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-emerald-600">
                        +{money(deposit.amount, language)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon size={14} />
                          {status.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {deposit.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => printReceipt(deposit)}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                            aria-label={t("Print Receipt")}
                          >
                            <Printer size={14} />
                            {t("Receipt")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}