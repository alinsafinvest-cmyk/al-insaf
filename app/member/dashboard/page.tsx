import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import MemberDashboardWelcome from "@/app/components/dashboard/MemberDashboardWelcome";
import MemberDashboardSummary from "@/app/components/dashboard/MemberDashboardSummary";

export default async function MemberDashboardPage() {
    const user = await getAuthUser();

    if (!user) {
        redirect("/member/login");
    }

    if (user.role !== "member") {
        redirect("/admin/dashboard");
    }

    return (
        <main className="space-y-6 p-3 sm:p-4 xl:p-6">
            <MemberDashboardWelcome />
            <MemberDashboardSummary />
        </main>
    );
}
