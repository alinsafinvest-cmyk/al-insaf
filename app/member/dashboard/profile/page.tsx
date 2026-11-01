import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import MemberDashboardFeatures from "@/app/components/MemberDashboardFeatures";

export default async function MemberProfilePage() {
    const user = await getAuthUser();

    // User login না থাকলে Login Page-এ পাঠাবে
    if (!user) {
        redirect("/member/login");
    }

    // Admin হলে Admin Dashboard-এ পাঠাবে
    if (user.role !== "member") {
        redirect("/admin/dashboard");
    }

    return (
        <main className="p-3 sm:p-4 xl:p-6">
            <MemberDashboardFeatures section="profile" />
        </main>
    );
}