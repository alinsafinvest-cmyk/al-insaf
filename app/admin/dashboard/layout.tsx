"use client";
// বাংলা: এই route/component-এ app → admin → dashboard → layout অংশের page layout ও UI পরিচালিত হয়।

import { useState } from "react";

import Header from "@/app/components/dashboard/Header";
import Sidebar from "@/app/components/dashboard/Sidebar";
import DashboardFooter from "@/app/components/dashboard/DashboardFooter";

// বাংলা: এই layout সব admin dashboard পেজে shared sidebar, header, main content ও footer যোগ করে।
export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="app-background neon-ui dashboard-shell min-h-screen">

            <Sidebar
                role="admin"
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
            />

            <div id="main-content" tabIndex={-1} className="flex min-h-screen flex-col transition-[padding] duration-300 lg:pl-20">

                <Header
                    title="Admin Dashboard"
                    role="admin"
                    onMenuClick={() =>
                        setMobileOpen(true)
                    }
                />

                <main className="min-h-[calc(100vh-64px)] flex-1">
                    {children}
                </main>

                <DashboardFooter />
            </div>
        </div>
    );
}