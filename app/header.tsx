// বাংলা: এই component-এ পাবলিক ওয়েবসাইটের শীর্ষ navigation ও branding দেখানো হয়।

"use client";

import { useState } from "react";
import Link from "next/link";
import { Sun, Moon, Menu, X } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { SITE_LOGO } from "@/lib/site-branding";


// বাংলা: এই component public site-এর brand, navigation এবং responsive menu controls দেখায়।
export default function Navbar() {
  const { language, setLanguage } = useLanguage();
  const { dark: darkMode, toggleDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const isBangla = language === "bn";

  const navItems = isBangla
    ? [
        { name: "হোম", href: "/" },
        { name: "সেবাসমূহ", href: "/services" },
        { name: "আমাদের সম্পর্কে", href: "/about" },
        { name: "কিভাবে কাজ করে", href: "/how-it-works" },
        { name: "যোগাযোগ", href: "/contact" },
      ]
    : [
        { name: "Home", href: "/" },
        { name: "Services", href: "/services" },
        { name: "About Us", href: "/about" },
        { name: "How It Works", href: "/how-it-works" },
        { name: "Contact", href: "/contact" },
      ];

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-colors duration-300 ${
        darkMode
          ? "border-gray-800 bg-gray-950 text-white"
          : "border-gray-100 bg-white text-gray-700"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-350 items-center justify-between px-4 sm:px-6 lg:px-8">

        
{/* Logo */}
<Link
  href="/"
  className="flex shrink-0 items-center gap-2.5"
>
  <Image
    src={SITE_LOGO}
    alt="আল-ইনসাফ লোগো"
    width={46}
    height={46}
    priority
    className="h-11 w-11 rounded-xl object-contain"
  />
  <span className="text-xl font-extrabold tracking-tight text-green-800 sm:text-2xl">
    {isBangla ? "আল-ইনসাফ" : "Al-Insaf"}
  </span>
</Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-7 lg:flex xl:gap-9">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap text-[16px] font-medium transition-colors hover:text-green-700 ${
                darkMode
                  ? "text-gray-300"
                  : "text-gray-500"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-2.5">

          {/* Language Switcher */}
          <div
            className={`flex items-center rounded-full p-1 ${
              darkMode ? "bg-gray-800" : "bg-gray-100"
            }`}
          >
            <button
              onClick={() => setLanguage("bn")}
              aria-label="বাংলা ভাষা"
              aria-pressed={isBangla}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isBangla
                  ? "bg-green-700 text-white shadow-sm"
                  : darkMode
                  ? "text-gray-300"
                  : "text-gray-500"
              }`}
            >
              বাংলা
            </button>

            <button
              onClick={() => setLanguage("en")}
              aria-label="English language"
              aria-pressed={!isBangla}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                !isBangla
                  ? "bg-green-700 text-white shadow-sm"
                  : darkMode
                  ? "text-gray-300"
                  : "text-gray-500"
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleDark}
            aria-label="Toggle dark mode"
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
              darkMode
                ? "bg-gray-800 text-yellow-300 hover:bg-gray-700"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            {darkMode ? (
              <Moon size={21} />
            ) : (
              <Sun size={21} />
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className={`flex h-10 w-10 items-center justify-center rounded-lg lg:hidden ${
              darkMode ? "hover:bg-gray-800" : "hover:bg-gray-100"
            }`}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div
          className={`border-t px-5 py-3 lg:hidden ${
            darkMode
              ? "border-gray-800 bg-gray-950"
              : "border-gray-100 bg-white"
          }`}
        >
          <div className="mx-auto flex max-w-7xl flex-col">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-3 py-3 font-medium transition-colors hover:bg-green-50 hover:text-green-700 ${
                  darkMode
                    ? "text-gray-200 hover:bg-gray-800 hover:text-green-400"
                    : "text-gray-600"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}