import { SITE_LOGO } from "@/lib/site-branding";
import Image from "next/image";

export default function RouteLoading({
    label,
    dashboard = false,
}: {
    label: string;
    dashboard?: boolean;
}) {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className={
                dashboard
                    ? "min-h-[calc(100vh-64px)] space-y-6 p-3 sm:p-4 xl:p-6"
                    : "flex min-h-[65vh] flex-col items-center justify-center gap-6 px-5 py-12"
            }
        >
            {!dashboard && (
                <div className="flex items-center gap-3">
                    <Image
                        src={SITE_LOGO}
                        alt=""
                        width={44}
                        height={44}
                        priority
                        className="h-11 w-11 rounded-xl object-contain"
                    />
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950">
                        <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-600" />
                    </div>
                </div>
            )}
            <span className="sr-only">{label}</span>
            {dashboard ? (
                <>
                    <div className="h-24 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {[1, 2, 3, 4].map((item) => (
                            <div
                                key={item}
                                className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
                            />
                        ))}
                    </div>
                    <div className="grid gap-5 xl:grid-cols-2">
                        {[1, 2].map((item) => (
                            <div
                                key={item}
                                className="h-72 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div className="w-full max-w-5xl space-y-4">
                    <div className="mx-auto h-8 w-2/5 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
                    <div className="mx-auto h-3 w-1/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
            )}
        </div>
    );
}
