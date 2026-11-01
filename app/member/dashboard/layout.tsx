import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import MemberDashboardShell from "./MemberDashboardShell";

export default async function MemberDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getAuthUser();

    if (!user) {
        redirect("/member/login");
    }

    if (user.role !== "member") {
        redirect("/admin/dashboard");
    }

    return <MemberDashboardShell>{children}</MemberDashboardShell>;
}
