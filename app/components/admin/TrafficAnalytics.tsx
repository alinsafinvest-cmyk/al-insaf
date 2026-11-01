"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Eye, RefreshCw, Users, type LucideIcon } from "lucide-react";

type TrafficData = {
    success: boolean;
    message?: string;
    days: number;
    summary: {
        pageViews: number;
        uniqueVisitors: number;
        pagesTracked: number;
    };
    daily: Array<{
        date: string;
        pageViews: number;
        visitors: number;
    }>;
    topPages: Array<{
        path: string;
        pageViews: number;
        visitors: number;
    }>;
};

function formatNumber(value: number, language: string) {
    return Number(value || 0).toLocaleString(language === "bn" ? "bn-BD" : "en-US");
}

export default function TrafficAnalytics({
    compact = false,
}: {
    compact?: boolean;
}) {
    const [days, setDays] = useState<7 | 30>(7);
    const [data, setData] = useState<TrafficData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadTraffic = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch(`/api/admin/analytics?days=${days}`, {
                cache: "no-store",
                headers: { Accept: "application/json" },
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "ট্রাফিকের তথ্য লোড করা যায়নি");
            }

            setData(result);
        } catch (loadError) {
            console.error("Traffic analytics load failed:", loadError);
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "ট্রাফিকের তথ্য লোড করা যায়নি"
            );
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadTraffic();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [loadTraffic]);

    const maxPageViews = Math.max(
        1,
        ...(data?.daily.map((day) => day.pageViews) || [])
    );

    return (
        <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {!compact && (
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Website Traffic / ওয়েব ট্রাফিক
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Public pages only; admin and member areas are excluded.
                        </p>
                    </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                    <label className="sr-only" htmlFor={compact ? "dashboard-traffic-range" : "traffic-range"}>
                        Date range
                    </label>
                    <select
                        id={compact ? "dashboard-traffic-range" : "traffic-range"}
                        value={days}
                        onChange={(event) => setDays(event.target.value === "30" ? 30 : 7)}
                        className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <option value={7}>Last 7 days / গত ৭ দিন</option>
                        <option value={30}>Last 30 days / গত ৩০ দিন</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => void loadTraffic()}
                        disabled={loading}
                        aria-label="Refresh website traffic"
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                    <button type="button" onClick={() => void loadTraffic()} className="ml-3 font-semibold underline">
                        Retry
                    </button>
                </div>
            )}

            {loading && !data ? (
                <div className="grid gap-4 sm:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    ))}
                </div>
            ) : data ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Metric
                            title="Page views / পেজ ভিউ"
                            value={formatNumber(data.summary.pageViews, "bn")}
                            icon={Eye}
                        />
                        <Metric
                            title="Visitor sessions / ভিজিটর সেশন"
                            value={formatNumber(data.summary.uniqueVisitors, "bn")}
                            icon={Users}
                        />
                        <Metric
                            title="Pages visited / দেখা পেজ"
                            value={formatNumber(data.summary.pagesTracked, "bn")}
                            icon={Activity}
                        />
                    </div>

                    <div className={`grid gap-5 ${compact ? "" : "xl:grid-cols-2"}`}>
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <h2 className="font-bold text-slate-900 dark:text-white">
                                Daily visits / দৈনিক ভিজিট
                            </h2>
                            {data.daily.length ? (
                                <div className="mt-4 space-y-3">
                                    {data.daily.slice(compact ? -7 : 0).map((day) => (
                                        <div key={day.date} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-xs">
                                            <span className="text-slate-500 dark:text-slate-400">{day.date.slice(5)}</span>
                                            <div
                                                className="h-2.5 rounded-full bg-emerald-500"
                                                role="meter"
                                                aria-label={`${day.date} page views`}
                                                aria-valuemin={0}
                                                aria-valuemax={maxPageViews}
                                                aria-valuenow={day.pageViews}
                                                style={{ width: `${Math.max(4, (day.pageViews / maxPageViews) * 100)}%` }}
                                            />
                                            <span className="text-right font-semibold text-slate-700 dark:text-slate-200">
                                                {formatNumber(day.pageViews, "en")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                    No public page visits have been recorded yet.
                                </p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="font-bold text-slate-900 dark:text-white">
                                    Popular pages / জনপ্রিয় পেজ
                                </h2>
                                {compact && (
                                    <Link
                                        href="/admin/dashboard/traffic"
                                        className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                                    >
                                        Details
                                    </Link>
                                )}
                            </div>
                            {data.topPages.length ? (
                                <ol className="mt-4 space-y-3">
                                    {data.topPages.slice(0, compact ? 4 : 8).map((page) => (
                                        <li key={page.path} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                                            <span className="truncate text-sm text-slate-600 dark:text-slate-300" title={page.path}>
                                                {page.path}
                                            </span>
                                            <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-white">
                                                {formatNumber(page.pageViews, "en")}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                                    No visits recorded yet.
                                </p>
                            )}
                        </div>
                    </div>

                    <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                        Visitor counts are anonymous browser-session estimates, not verified people. Member/admin pages and IP addresses are not tracked; repeat visits to the same page within 30 minutes count once. Records are removed after 90 days.
                    </p>
                </>
            ) : null}
        </section>
    );
}

function Metric({
    title,
    value,
    icon: Icon,
}: {
    title: string;
    value: string;
    icon: LucideIcon;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Icon size={20} />
            </span>
        </div>
    );
}
