// বাংলা: বাংলা-ইংরেজি ভাষাসহ নিরাপদ, প্রিন্ট-উপযোগী লেনদেনের রসিদ তৈরি করে।

export type ReceiptLanguage = "bn" | "en";
export type ReceiptKind = "deposit" | "withdrawal" | "transaction";

export interface OfficialReceiptData {
    kind: ReceiptKind;
    receiptId: string;
    transactionId: string;
    referenceId: string;
    memberId?: string;
    memberName?: string;
    memberPhone?: string;
    date: string;
    paymentMethod?: string;
    paymentReference?: string;
    amount: number;
    description?: string;
    approvedBy?: string;
    approvedAt?: string;
}

const receiptText = {
    en: {
        organization: "Al-Insaf Investment Society",
        subtitle: "Official payment record",
        deposit: "DEPOSIT RECEIPT",
        withdrawal: "WITHDRAWAL RECEIPT",
        transaction: "TRANSACTION RECEIPT",
        receiptId: "Receipt number",
        transactionId: "Transaction ID",
        referenceId: "Reference ID",
        memberId: "Member ID",
        memberName: "Member name",
        memberPhone: "Phone",
        date: "Transaction date",
        paymentMethod: "Payment method",
        paymentReference: "Payment reference",
        amount: "Amount received",
        paid: "Amount paid",
        description: "Description",
        approvedBy: "Approved by",
        approvedAt: "Approval date",
        generated: "Generated",
        disclaimer: "This is a computer-generated receipt.",
        signature: "Authorized signature",
        thankYou: "Thank you for your trust and support.",
        print: "Print receipt",
    },
    bn: {
        organization: "আল-ইনসাফ ইনভেস্টমেন্ট সোসাইটি",
        subtitle: "অনুমোদিত লেনদেনের রসিদ",
        deposit: "জমার রসিদ",
        withdrawal: "উত্তোলনের রসিদ",
        transaction: "লেনদেনের রসিদ",
        receiptId: "রসিদ নম্বর",
        transactionId: "লেনদেন আইডি",
        referenceId: "রেফারেন্স আইডি",
        memberId: "সদস্য আইডি",
        memberName: "সদস্যের নাম",
        memberPhone: "ফোন",
        date: "লেনদেনের তারিখ",
        paymentMethod: "পেমেন্ট মাধ্যম",
        paymentReference: "পেমেন্ট রেফারেন্স",
        amount: "জমার পরিমাণ",
        paid: "উত্তোলনের পরিমাণ",
        description: "বিবরণ",
        approvedBy: "অনুমোদন করেছেন",
        approvedAt: "অনুমোদনের তারিখ",
        generated: "তৈরির সময়",
        disclaimer: "এটি কম্পিউটার-তৈরি একটি রসিদ।",
        signature: "অনুমোদিত স্বাক্ষর",
        thankYou: "আপনার আস্থা ও সহযোগিতার জন্য ধন্যবাদ।",
        print: "রসিদ প্রিন্ট করুন",
    },
} satisfies Record<ReceiptLanguage, Record<string, string>>;

function escapeHtml(value: string | number): string {
    return String(value).replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };
        return entities[character];
    });
}

function formatDate(value: string, language: ReceiptLanguage): string {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

export function openOfficialReceipt(
    data: OfficialReceiptData,
    language: ReceiptLanguage,
    logoUrl: string,
): boolean {
    const receiptWindow = window.open("", "_blank", "popup,width=900,height=900");
    if (!receiptWindow) return false;

    const text = receiptText[language];
    const heading = text[data.kind];
    const amountLabel = data.kind === "withdrawal" ? text.paid : text.amount;
    const amount = new Intl.NumberFormat(language === "bn" ? "bn-BD" : "en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 2,
    }).format(Number(data.amount) || 0);

    const row = (label: string, value: string | number | undefined) => `
        <div class="detail">
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value || "—")}</dd>
        </div>`;

    const detailRows: Array<[string, string | undefined]> = [
        [text.receiptId, data.receiptId],
        [text.referenceId, data.referenceId],
        [text.transactionId, data.transactionId],
        [text.memberId, data.memberId],
        [text.memberName, data.memberName],
        [text.memberPhone, data.memberPhone],
        [text.date, formatDate(data.date, language)],
        [text.paymentMethod, data.paymentMethod],
        [text.paymentReference, data.paymentReference],
    ];
    if (data.approvedBy) detailRows.push([text.approvedBy, data.approvedBy]);
    if (data.approvedAt) detailRows.push([text.approvedAt, formatDate(data.approvedAt, language)]);
    const details = detailRows.map(([label, value]) => row(label, value)).join("");

    const html = `<!doctype html>
<html lang="${language}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(heading)} · ${escapeHtml(data.receiptId)}</title>
    <style>
        :root { color-scheme: light; font-family: "Noto Sans Bengali", "Hind Siliguri", Arial, sans-serif; color: #17231f; background: #eef3f0; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 32px 16px; }
        .toolbar { width: min(820px, 100%); margin: 0 auto 14px; display: flex; justify-content: flex-end; }
        .print-button { border: 0; border-radius: 10px; padding: 11px 18px; color: white; background: #047857; font: inherit; font-weight: 700; cursor: pointer; box-shadow: 0 5px 16px #04785730; }
        .receipt { position: relative; isolation: isolate; overflow: hidden; width: min(820px, 100%); margin: auto; padding: 42px 48px 32px; border: 1px solid #d9e4df; border-radius: 20px; background: #fff; box-shadow: 0 22px 70px #10281b18; }
        .receipt::before { position: absolute; z-index: -1; inset: 0 0 auto; height: 8px; content: ""; background: linear-gradient(90deg, #047857, #19b884 56%, #67d7b3); }
        .watermark { position: absolute; z-index: -1; inset: 28% 0 auto; display: grid; place-items: center; opacity: .045; pointer-events: none; }
        .watermark img { width: min(380px, 72vw); aspect-ratio: 1; object-fit: contain; }
        .header { display: grid; grid-template-columns: 76px 1fr auto; gap: 18px; align-items: center; padding-bottom: 24px; border-bottom: 1px solid #dce8e2; }
        .logo { width: 76px; height: 76px; object-fit: contain; }
        .organization { margin: 0; color: #075b43; font-size: clamp(19px, 3vw, 27px); font-weight: 800; letter-spacing: -.02em; }
        .subtitle { margin: 5px 0 0; color: #64756d; font-size: 13px; }
        .receipt-type { padding: 9px 12px; border: 1px solid #b7e4d1; border-radius: 999px; color: #066647; background: #effaf5; font-size: 11px; font-weight: 800; letter-spacing: .07em; text-align: center; }
        .receipt-number { display: flex; justify-content: space-between; gap: 12px; margin: 22px 0 18px; color: #52665c; font-size: 13px; }
        .receipt-number strong { color: #14251d; overflow-wrap: anywhere; }
        .details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 0; }
        .detail { min-width: 0; padding: 12px 14px; border: 1px solid #e4ece8; border-radius: 11px; background: #fbfdfc; }
        dt { margin-bottom: 5px; color: #728078; font-size: 11px; font-weight: 600; }
        dd { margin: 0; color: #1c2e25; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
        .amount { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 18px; padding: 17px 20px; border: 1px solid #b6e3d0; border-radius: 13px; background: linear-gradient(110deg, #effaf5, #f5fcf9); }
        .amount span { color: #176c50; font-size: 14px; font-weight: 700; }
        .amount strong { color: #075b43; font-size: clamp(23px, 4vw, 31px); font-weight: 850; white-space: nowrap; }
        .description { margin-top: 12px; padding: 13px 15px; border-left: 3px solid #18a779; border-radius: 4px 10px 10px 4px; background: #f7faf8; }
        .description dt { margin-bottom: 5px; }
        .description dd { white-space: pre-wrap; font-weight: 500; }
        .footer { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-top: 34px; padding-top: 18px; border-top: 1px solid #dce8e2; }
        .footnote { color: #728078; font-size: 11px; line-height: 1.7; }
        .signature { width: 190px; padding-top: 31px; border-bottom: 1px solid #43544b; color: #53645b; font-size: 11px; text-align: center; }
        .thank-you { margin: 20px 0 0; color: #26785d; font-size: 12px; text-align: center; }
        @media (max-width: 580px) { body { padding: 12px 8px; } .receipt { padding: 28px 18px 22px; border-radius: 14px; } .header { grid-template-columns: 52px 1fr; gap: 12px; } .logo { width: 52px; height: 52px; } .receipt-type { grid-column: 1 / -1; justify-self: start; } .details { grid-template-columns: 1fr; gap: 8px; } .detail { padding: 10px 12px; } .footer { align-items: stretch; flex-direction: column; } .signature { align-self: flex-end; min-height: 58px; } }
        @page { size: A4; margin: 14mm; }
        @media print { :root, body { background: #fff; } body { padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; } .toolbar { display: none; } .receipt { width: 100%; max-width: none; min-height: 0; padding: 16px 10px; border: 0; border-radius: 0; box-shadow: none; } .detail, .amount, .description, .header, .footer { break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="toolbar"><button class="print-button" onclick="window.print()">${escapeHtml(text.print)}</button></div>
    <main class="receipt">
        <div class="watermark"><img src="${escapeHtml(logoUrl)}" alt=""></div>
        <header class="header">
            <img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(text.organization)}">
            <div><h1 class="organization">${escapeHtml(text.organization)}</h1><p class="subtitle">${escapeHtml(text.subtitle)}</p></div>
            <div class="receipt-type">${escapeHtml(heading)}</div>
        </header>
        <div class="receipt-number"><span>${escapeHtml(text.receiptId)}</span><strong>${escapeHtml(data.receiptId)}</strong></div>
        <dl class="details">${details}</dl>
        <section class="amount"><span>${escapeHtml(amountLabel)}</span><strong>${escapeHtml(amount)}</strong></section>
        ${data.description ? `<dl class="description"><dt>${escapeHtml(text.description)}</dt><dd>${escapeHtml(data.description)}</dd></dl>` : ""}
        <footer class="footer">
            <div class="footnote">${escapeHtml(text.generated)}: ${escapeHtml(formatDate(new Date().toISOString(), language))}<br>${escapeHtml(text.disclaimer)}</div>
            <div class="signature">${escapeHtml(text.signature)}</div>
        </footer>
        <p class="thank-you">${escapeHtml(text.thankYou)}</p>
    </main>
    <script>window.addEventListener("load",()=>{window.focus();window.setTimeout(()=>window.print(),250)});</script>
</body>
</html>`;

    receiptWindow.document.open();
    receiptWindow.document.write(html);
    receiptWindow.document.close();
    return true;
}
