"use client";
// বাংলা: এই shared UI component-এ MemberSidebar অংশের display ও interaction পরিচালিত হয়।

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  LayoutDashboard,
  Wallet,
  ArrowDownToLine,
  HandCoins,
  History,
  UserRound,
  Menu,
  X,
  ShieldCheck,
  CircleDollarSign,
} from "lucide-react";

import LogoutButton from "@/app/components/LogoutButton";

const navItems = [
  {
    name: "Dashboard",
    href: "/member/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Deposits",
    href: "/member/dashboard/deposits",
    icon: Wallet,
  },
  {
    name: "My Withdrawals",
    href: "/member/dashboard/withdrawals",
    icon: ArrowDownToLine,
  },
  {
    name: "My Loans",
    href: "/member/dashboard/loans",
    icon: HandCoins,
  },
  {
    name: "Transaction History",
    href: "/member/dashboard/transactions",
    icon: History,
  },
  {
    name: "My Profile",
    href: "/member/dashboard/profile",
    icon: UserRound,
  },
];

// বাংলা: member panel-এর navigation menu দেখায়।
export default function MemberSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/member/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-5 dark:border-gray-800">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <ShieldCheck size={25} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Al-Insaf
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Investment Society
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
          className="ml-auto rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden dark:hover:bg-gray-800"
        >
          <X size={20} />
        </button>
      </div>

      {/* Member information */}
      <div className="mx-4 mt-5 flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/70">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
          <UserRound size={21} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            Member Account
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Society Member
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Member Menu
        </p>

        {navItems.map(({ name, href, icon: Icon }) => {
          const active = isActive(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-gray-600 hover:bg-gray-100 hover:text-emerald-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-emerald-400"
              }`}
            >
              <Icon size={20} className="shrink-0" />

              <span>{name}</span>

              {active && (
                <span className="ml-auto h-2 w-2 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Savings information */}
      <div className="mx-4 mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
        <div className="mb-1 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
          <CircleDollarSign size={18} />
          <span className="text-sm font-semibold">My Savings</span>
        </div>
        <p className="text-xs leading-5 text-gray-600 dark:text-gray-400">
          আপনার জমা ও লেনদেনের হিসাব Dashboard থেকে দেখুন।
        </p>
      </div>

      {/* Logout */}
      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <LogoutButton redirectTo="/member/login" />
      </div>

      <div className="px-5 pb-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Al-Insaf Investment Society
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open member menu"
        className="fixed left-4 top-4 z-40 rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-md md:hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-gray-200 bg-white md:block dark:border-gray-800 dark:bg-gray-950">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-gray-200 bg-white transition-transform duration-300 md:hidden dark:border-gray-800 dark:bg-gray-950 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}