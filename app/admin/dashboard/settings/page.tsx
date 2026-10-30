// বাংলা: এই admin পেজে dashboard → settings সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";
import SettingsManagement from "@/app/components/admin/SettingsManagement";

// বাংলা: এই component admin-এর site ও account settings দেখায় এবং settings management UI যুক্ত করে।
export default async function Page() {
    const user = await getAuthUser();

    if (!user) {
        redirect("/admin/login");
    }

    if (user.role !== "admin") {
        redirect("/member/login");
    }

    return (
        <main className="min-h-screen bg-gray-100">
            <SettingsManagement />
        </main>
    );
}