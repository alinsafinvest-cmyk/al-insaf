// বাংলা: এই admin পেজে dashboard → members সংক্রান্ত তথ্য, form এবং প্রয়োজনীয় action দেখানো ও পরিচালিত হয়।
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth";

import MembersManagement
    from "@/app/components/admin/MembersManagement";

// বাংলা: এই component-এ admin member তালিকা, অনুসন্ধান এবং profile management পরিচালনা করে।
export default async function MembersPage() {

    const user =
        await getAuthUser();

    if (!user) {
        redirect("/admin/login");
    }

    if (user.role !== "admin") {
        redirect("/member/login");
    }

    return (
        <MembersManagement />
    );
}