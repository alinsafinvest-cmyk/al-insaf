import nodemailer from "nodemailer";

export function isMemberPasswordEmailConfigured() {
    return Boolean(
        process.env.SMTP_HOST?.trim() &&
        process.env.SMTP_USER?.trim() &&
        process.env.SMTP_PASSWORD &&
        process.env.SMTP_FROM?.trim()
    );
}

async function sendVerificationCode({
    email,
    name,
    code,
    subject,
    action,
}: {
    email: string;
    name: string;
    code: string;
    subject: string;
    action: string;
}) {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const password = process.env.SMTP_PASSWORD;
    const from = process.env.SMTP_FROM?.trim();
    const port = Number(process.env.SMTP_PORT || 587);

    if (!host || !user || !password || !from) {
        throw new Error("Member password email is not configured.");
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("SMTP_PORT must be a valid port number.");
    }

    const safeName = name.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character] || character);

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: password },
    });

    await transporter.sendMail({
        from,
        to: email,
        subject,
        text: `Hello ${name}, your ${action} verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
        html: `<p>Hello ${safeName},</p><p>Your Al-Insaf ${action} verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request it, ignore this email.</p>`,
    });
}

export function sendMemberPasswordCode({
    email,
    name,
    code,
}: {
    email: string;
    name: string;
    code: string;
}) {
    return sendVerificationCode({
        email,
        name,
        code,
        subject: "Your Al-Insaf password change code",
        action: "password change",
    });
}

export function sendMemberEmailChangeCode({
    email,
    name,
    code,
}: {
    email: string;
    name: string;
    code: string;
}) {
    return sendVerificationCode({
        email,
        name,
        code,
        subject: "Verify your new Al-Insaf email",
        action: "email change",
    });
}
