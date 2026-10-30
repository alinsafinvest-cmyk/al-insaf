"use client";
// বাংলা: এই shared UI component-এ LogoutButton অংশের display ও interaction পরিচালিত হয়।

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, LoaderCircle } from "lucide-react";

interface LogoutButtonProps {
  redirectTo?: string;
}

// বাংলা: নিরাপদে logout করে login পেজে নিয়ে যায়।
export default function LogoutButton({
  redirectTo = "/admin/login",
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout করা যায়নি। আবার চেষ্টা করুন।");
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950"
    >
      {loading ? (
        <LoaderCircle size={19} className="animate-spin" />
      ) : (
        <LogOut size={19} />
      )}

      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}