// বাংলা: এই admin পেজে dashboard → transactions সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import TransactionsManagement from "@/app/components/admin/TransactionsManagement";

// বাংলা: এই component admin-এর transaction register ও transaction management UI দেখায়।
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
            <TransactionsManagement />
        </main>
    );
}