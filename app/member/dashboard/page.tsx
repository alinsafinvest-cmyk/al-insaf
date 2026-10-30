// app/member/dashboard/profile/page.tsx

import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import MemberDashboardFeatures from "@/app/components/MemberDashboardFeatures";

export default async function MemberProfilePage() {
    const user = await getAuthUser();

    if (!user) {
        redirect("/member/login");
    }

    if (user.role !== "member") {
        redirect("/admin/dashboard");
    }

    return (
        <main className="space-y-6 p-3 sm:p-4 xl:p-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Member Profile
                </h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    View your member information and account details.
                </p>
            </div>

            <MemberDashboardFeatures />
        </main>
    );
}