"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SESSION_STORAGE_KEY = "alinsaf-analytics-session";

function isExcludedPath(pathname: string) {
    return ["/admin", "/member"].some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

function getSessionId() {
    try {
        const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;

        const sessionId = window.crypto.randomUUID();
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        return sessionId;
    } catch (error) {
        console.warn("Web analytics session could not be initialized:", error);
        return "";
    }
}

export default function AnalyticsTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname || isExcludedPath(pathname)) {
            return;
        }

        const sessionId = getSessionId();
        if (!sessionId) return;

        void fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, path: pathname }),
            keepalive: true,
        }).then((response) => {
            if (!response.ok) {
                console.warn("Web analytics event was not recorded.");
            }
        }).catch((error: unknown) => {
            console.warn("Web analytics request failed:", error);
        });
    }, [pathname]);

    return null;
}
