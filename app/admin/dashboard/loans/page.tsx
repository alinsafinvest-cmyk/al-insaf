// বাংলা: এই admin পেজে dashboard → loans সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";

import LoansManagement from "@/app/components/admin/LoansManagement";

// বাংলা: এই component-এ admin loan request review করে এবং approval/decision action পরিচালনা করে।
export default async function LoansPage() {
    const user = await getAuthUser();

    if (!user) {
        redirect("/admin/login");
    }

    if (user.role !== "admin") {
        redirect("/member/login");
    }

    return (
        <main className="min-h-screen bg-gray-100">
            <LoansManagement />
        </main>
    );
}