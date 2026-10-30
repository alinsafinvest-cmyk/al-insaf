// বাংলা: এই admin পেজে dashboard সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";
import AlInsafDashboard from "@/app/components/AlInsafDashboard";

// বাংলা: এই server component session ও admin role যাচাই করে dashboard দেখায়; অননুমোদিত user-কে login page-এ পাঠায়।
export default async function AdminDashboardPage() {
    const user = await getAuthUser();

    if (!user) {
        redirect("/admin/login");
    }

    if (user.role !== "admin") {
        redirect("/member/login");
    }

    return <AlInsafDashboard />;
}