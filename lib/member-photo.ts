const driveFileIdPattern = /^[A-Za-z0-9_-]{10,}$/;

export function getMemberPhotoUrl(value: unknown, size = 512): string {
    const stored = String(value ?? "").trim();

    if (!stored) {
        return "";
    }

    if (driveFileIdPattern.test(stored)) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(stored)}&sz=w${size}`;
    }

    if (stored.startsWith("/") && !stored.startsWith("//")) {
        return stored;
    }

    let url: URL;
    try {
        url = new URL(stored);
    } catch {
        return "";
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "";
    }

    if (url.hostname === "drive.google.com" || url.hostname === "docs.google.com") {
        const pathFileId = url.pathname.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([^/]+)/)?.[1];
        const fileId = url.searchParams.get("id") || pathFileId;

        if (fileId && driveFileIdPattern.test(fileId)) {
            return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${size}`;
        }
    }

    return url.toString();
}
