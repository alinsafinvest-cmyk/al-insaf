"use client";

import { useState } from "react";
import Header from "@/app/components/dashboard/Header";
import Sidebar from "@/app/components/dashboard/Sidebar";
import DashboardFooter from "@/app/components/dashboard/DashboardFooter";

export default function MemberDashboardShell({
    children,
}: {
    children: React.ReactNode;
}) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="app-background neon-ui dashboard-shell min-h-screen">
            <Sidebar
                role="member"
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
            />
            <div
                id="main-content"
                tabIndex={-1}
                className="flex min-h-screen flex-col transition-[padding] duration-300 lg:pl-20"
            >
                <Header
                    title="Member Dashboard"
                    role="member"
                    onMenuClick={() => setMobileOpen(true)}
                />
                <main className="min-h-[calc(100vh-64px)] flex-1">
                    {children}
                </main>
                <DashboardFooter />
            </div>
        </div>
    );
}
