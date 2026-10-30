"use client";
// বাংলা: এই পেজে প্রতিষ্ঠানের public home page ও তার interactive sections দেখানো হয়।



import { useEffect, useMemo, useState, type FormEvent } from "react";

import Image from "next/image";

import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { SITE_LOGO } from "@/lib/site-branding";

import {

    Sun,

    Moon,

    Menu,

    X,

    ArrowRight,

    ShieldCheck,

    HandCoins,

    Wallet,

    Users,

    Landmark,

    HeartHandshake,

    CheckCircle2,

    Phone,

    Mail,

    MapPin,

    ChevronRight,
    ChevronDown,

    Eye,

    Sparkles,

    Clock,

    Search,

    UserRound,

    LogIn,
    Bell,
    LogOut,
    LayoutDashboard,
    type LucideIcon,

} from "lucide-react";



type SectionHeadingProps = {

    eyebrow: string;

    title: string;

    description?: string;

    dark: boolean;

    centered?: boolean;

};



function SectionHeading({

    eyebrow,

    title,

    description,

    dark,

    centered = true,

}: SectionHeadingProps) {

    return (

        <div

            className={`mb-12 max-w-3xl ${centered ? "mx-auto text-center" : ""

                }`}

        >

            <span className="section-label">{eyebrow}</span>

            <h2

                className={`mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[42px] ${dark ? "text-white" : "text-gray-900"

                    }`}

            >

                {title}

            </h2>

            {description && (

                <p

                    className={`mt-4 text-base leading-8 sm:text-lg ${dark ? "text-gray-300" : "text-gray-600"

                        }`}

                >

                    {description}

                </p>

            )}

        </div>

    );

}



type InfoCardProps = {

    icon: LucideIcon;

    title: string;

    description: string;

    dark: boolean;

};



function InfoCard({ icon: Icon, title, description, dark }: InfoCardProps) {

    return (

        <article

            className={`group flex gap-5 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-7 ${dark

                ? "border-gray-800 bg-gray-900 hover:border-green-800"

                : "border-gray-200 bg-gray-50 hover:border-green-200 hover:bg-white"

                }`}

        >

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 transition-colors group-hover:bg-green-700 group-hover:text-white">

                <Icon size={24} />

            </div>



            <div>

                <h3

                    className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"

                        }`}

                >

                    {title}

                </h3>

                <p

                    className={`mt-2 text-sm leading-7 ${dark ? "text-gray-300" : "text-gray-600"

                        }`}

                >

                    {description}

                </p>

            </div>

        </article>

    );

}



type PublicMember = {
    id: string;
    name: string;
    nameEn: string;
    role: string;
    roleEn: string;
};

type PublicStatistics = {
    activeMembers: number;
    loansDistributed: number;
    savingsCollected: number;
    yearsOfExperience: number | null;
};

type AuthProfile = {
    name: string;
    photoUrl: string;
};

type MembershipFormData = {
    name: string;
    fatherName: string;
    phone: string;
    email: string;
    address: string;
    occupation: string;
    monthlyDeposit: string;
    message: string;
};

const emptyMembershipForm: MembershipFormData = {
    name: "",
    fatherName: "",
    phone: "",
    email: "",
    address: "",
    occupation: "",
    monthlyDeposit: "",
    message: "",
};

async function readApiResponse(response: Response) {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error(
            `The server returned an unexpected response (HTTP ${response.status}). Please try again later.`,
        );
    }
    return response.json();
}

// বাংলা: এই page প্রতিষ্ঠানের public landing content ও home-page interaction দেখায়।
export default function Home() {

    const { language, setLanguage } = useLanguage();

    const { dark, toggleDark } = useTheme();

    const [menuOpen, setMenuOpen] = useState(false);

    const [activeSection, setActiveSection] = useState("home");

    const [showLoginOptions, setShowLoginOptions] = useState(false);
    const [showLoginRoles, setShowLoginRoles] = useState(false);
    const [showMobileLoginRoles, setShowMobileLoginRoles] = useState(false);
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [authRole, setAuthRole] = useState<"admin" | "member" | null>(null);
    const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showMembershipForm, setShowMembershipForm] = useState(false);
    const [membershipForm, setMembershipForm] = useState<MembershipFormData>(emptyMembershipForm);
    const [membershipSubmitting, setMembershipSubmitting] = useState(false);
    const [membershipError, setMembershipError] = useState("");
    const [membershipSuccess, setMembershipSuccess] = useState("");
    const [members, setMembers] = useState<PublicMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(true);
    const [membersError, setMembersError] = useState("");
    const [publicStatistics, setPublicStatistics] = useState<PublicStatistics | null>(null);
    const [statisticsError, setStatisticsError] = useState("");



    const bn = language === "bn";

    useEffect(() => {
        let cancelled = false;

        async function loadSession() {
            try {
                const response = await fetch("/api/auth/session", {
                    cache: "no-store",
                });
                const session = await readApiResponse(response);
                if (!response.ok) {
                    throw new Error(session.message || "Unable to check login status.");
                }
                if (!cancelled) {
                    setAuthRole(
                        session.role === "admin" || session.role === "member"
                            ? session.role
                            : null,
                    );
                    setAuthProfile(session.profile || null);
                }
            } catch (error) {
                console.error("Session status check failed:", error);
                if (!cancelled) {
                    setAuthRole(null);
                    setAuthProfile(null);
                }
            } finally {
                if (!cancelled) setAuthLoading(false);
            }
        }

        void loadSession();
        return () => {
            cancelled = true;
        };
    }, []);

    async function logout() {
        try {
            const response = await fetch("/api/auth/logout", { method: "POST" });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || "Logout failed.");
            }
            setAuthRole(null);
            setAuthProfile(null);
            setShowAccountMenu(false);
            setShowNotifications(false);
            setMenuOpen(false);
        } catch (error) {
            console.error("Logout failed:", error);
            window.alert(
                bn ? "লগআউট করা যায়নি। আবার চেষ্টা করুন।" : "Logout failed. Please try again.",
            );
        }
    }



    const navItems = useMemo(

        () => [

            { label: bn ? "হোম" : "Home", href: "#home", id: "home" },

            { label: bn ? "সেবাসমূহ" : "Services", href: "#services", id: "services" },

            {

                label: bn ? "সদস্যদের তালিকা" : "Members",

                href: "#members",

                id: "members",

            },

            { label: bn ? "আমাদের সম্পর্কে" : "About Us", href: "#about", id: "about" },

            {

                label: bn ? "কিভাবে কাজ করে" : "How It Works",

                href: "#process",

                id: "process",

            },

            { label: bn ? "যোগাযোগ" : "Contact", href: "#contact", id: "contact" },

        ],

        [bn]

    );



    const services = [

        {

            icon: HandCoins,

            title: bn ? "সহজ শর্তে অর্থায়ন" : "Accessible Financing",

            description: bn

                ? "প্রয়োজন ও যোগ্যতা অনুযায়ী অর্থায়ন সুবিধা, শর্ত ও প্রক্রিয়া সম্পর্কে জানুন।"

                : "Explore financing options, eligibility and terms according to your needs.",

        },

        {

            icon: Wallet,

            title: bn ? "সঞ্চয় সেবা" : "Savings Services",

            description: bn

                ? "পরিকল্পিত সঞ্চয়ের মাধ্যমে ভবিষ্যতের আর্থিক লক্ষ্য পূরণে এগিয়ে যান।"

                : "Work towards your financial goals through planned savings.",

        },

        {

            icon: Landmark,

            title: bn ? "বিনিয়োগ-সংক্রান্ত তথ্য" : "Investment Information",

            description: bn

                ? "বিনিয়োগের সুযোগ, প্রযোজ্য শর্ত এবং সম্ভাব্য ঝুঁকি সম্পর্কে বিস্তারিত জানুন।"

                : "Learn about investment opportunities, applicable terms and potential risks.",

        },

        {

            icon: HeartHandshake,

            title: bn ? "সামাজিক সহযোগিতা" : "Community Support",

            description: bn

                ? "পারস্পরিক সহযোগিতা ও আর্থিক সচেতনতা বৃদ্ধিতে একসঙ্গে কাজ করি।"

                : "Promote financial awareness and mutual support within the community.",

        },

    ];



    const formatStatistic = (value: number | null | undefined) =>
        value === null || value === undefined
            ? "—"
            : new Intl.NumberFormat(bn ? "bn-BD" : "en-US", {
                maximumFractionDigits: 0,
            }).format(value);

    const statistics = [
        {
            value: formatStatistic(publicStatistics?.activeMembers),
            label: "সক্রিয় সদস্য",
            englishLabel: "Active Members",
            icon: Users,
        },
        {
            value: formatStatistic(publicStatistics?.loansDistributed),
            label: "বিতরণকৃত ঋণ (টাকা)",
            englishLabel: "Loans Distributed (BDT)",
            icon: HandCoins,
        },
        {
            value: formatStatistic(publicStatistics?.savingsCollected),
            label: "সঞ্চয় সংগ্রহ (টাকা)",
            englishLabel: "Savings Collected (BDT)",
            icon: Wallet,
        },
        {
            value: publicStatistics?.yearsOfExperience === null || publicStatistics?.yearsOfExperience === undefined
                ? "—"
                : `${formatStatistic(publicStatistics.yearsOfExperience)}+`,
            label: "বছরের অভিজ্ঞতা",
            englishLabel: "Years of Experience",
            icon: Clock,
        },
    ];



    const features = [

        {

            icon: ShieldCheck,

            title: bn ? "নিরাপদ ও বিশ্বস্ত" : "Security & Trust",

            description: bn

                ? "সদস্যদের তথ্যের গোপনীয়তা এবং আর্থিক তথ্যের নিরাপত্তাকে গুরুত্ব দেওয়া হয়।"

                : "We value the privacy of members and the security of financial information.",

        },

        {

            icon: Eye,

            title: bn ? "সম্পূর্ণ স্বচ্ছতা" : "Transparency",

            description: bn

                ? "লেনদেন, হিসাব ও প্রযোজ্য শর্ত সম্পর্কে পরিষ্কার তথ্য প্রদান আমাদের অগ্রাধিকার।"

                : "Clear information about transactions, accounts and applicable terms matters.",

        },

        {

            icon: Users,

            title: bn ? "সম্প্রদায়কেন্দ্রিক" : "Community Focus",

            description: bn

                ? "সদস্যদের পারস্পরিক সহযোগিতা, সচেতনতা ও সম্মিলিত উন্নয়নে গুরুত্ব দিই।"

                : "We value mutual support, awareness and collective development.",

        },

    ];



    const steps = [

        {

            number: "01",

            title: bn ? "যোগাযোগ করুন" : "Get in Touch",

            description: bn

                ? "আমাদের সঙ্গে যোগাযোগ করে আপনার প্রয়োজন ও আগ্রহ জানান।"

                : "Contact us and explain your needs and interests.",

        },

        {

            number: "02",

            title: bn ? "তথ্য ও কাগজপত্র" : "Submit Information",

            description: bn

                ? "প্রয়োজনীয় তথ্য ও কাগজপত্র সম্পর্কে নির্দেশনা নিন।"

                : "Receive guidance about the required information and documents.",

        },

        {

            number: "03",

            title: bn ? "যাচাই ও আলোচনা" : "Review & Discuss",

            description: bn

                ? "যোগ্যতা, শর্তাবলি ও প্রযোজ্য নিয়ম সম্পর্কে আলোচনা করুন।"

                : "Discuss eligibility, terms and applicable requirements.",

        },

        {

            number: "04",

            title: bn ? "পরবর্তী পদক্ষেপ" : "Next Steps",

            description: bn

                ? "প্রযোজ্য শর্ত ও অনুমোদন সাপেক্ষে পরবর্তী পদক্ষেপ নিন।"

                : "Proceed subject to applicable requirements and approval.",

        },

    ];



    const contactItems = [

        {

            icon: Phone,

            title: bn ? "ফোন" : "Phone",

            detail: bn ? "আপনার ফোন নম্বর যোগ করুন" : "Add your phone number",

        },

        {

            icon: Mail,

            title: bn ? "ইমেইল" : "Email",

            detail: "your-email\@example.com",

        },

        {

            icon: MapPin,

            title: bn ? "ঠিকানা" : "Address",

            detail: bn ? "আপনার অফিসের ঠিকানা যোগ করুন" : "Add your office address",

        },

    ];



    useEffect(() => {

        const sections = navItems

            .map((item) => document.getElementById(item.id))

            .filter((section): section is HTMLElement => section !== null);



        const observer = new IntersectionObserver(

            (entries) => {

                const visible = entries

                    .filter((entry) => entry.isIntersecting)

                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);



                if (visible[0]) {

                    setActiveSection(visible[0].target.id);

                }

            },

            {

                rootMargin: "-20% 0px -60% 0px",

                threshold: [0, 0.15, 0.3, 0.5],

            }

        );



        sections.forEach((section) => observer.observe(section));



        return () => observer.disconnect();

    }, [navItems]);



    const closeMenu = () => {
        setMenuOpen(false);
        setShowMobileLoginRoles(false);
    };

    useEffect(() => {
        if (!menuOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuOpen(false);
        };
        window.addEventListener("keydown", closeOnEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", closeOnEscape);
        };
    }, [menuOpen]);



    const sectionBg = dark ? "bg-gray-950" : "bg-white";

    const mutedBg = dark ? "bg-gray-900" : "bg-gray-50";

    const headingColor = dark ? "text-white" : "text-gray-900";

    const bodyColor = dark ? "text-gray-300" : "text-gray-600";



    const [memberSearch, setMemberSearch] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadMembers() {
            try {
                setMembersLoading(true);
                setMembersError("");
                const response = await fetch("/api/public/members", { cache: "no-store" });
                const result = await readApiResponse(response);
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "সদস্যদের তথ্য লোড করা যায়নি।");
                }
                if (!cancelled) setMembers(Array.isArray(result.members) ? result.members : []);
            } catch (error) {
                if (!cancelled) {
                    setMembersError(error instanceof Error ? error.message : "সদস্যদের তথ্য লোড করা যায়নি।");
                }
            } finally {
                if (!cancelled) setMembersLoading(false);
            }
        }

        loadMembers();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadStatistics() {
            try {
                setStatisticsError("");
                const response = await fetch("/api/public/statistics", { cache: "no-store" });
                const result = await readApiResponse(response);
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "পরিসংখ্যান লোড করা যায়নি।");
                }
                if (!cancelled) setPublicStatistics(result.statistics);
            } catch (error) {
                if (!cancelled) {
                    setStatisticsError(error instanceof Error ? error.message : "পরিসংখ্যান লোড করা যায়নি।");
                }
            }
        }

        loadStatistics();
        return () => { cancelled = true; };
    }, []);

    const openMembershipForm = () => {
        setMembershipError("");
        setMembershipSuccess("");
        setShowMembershipForm(true);
    };

    const closeMembershipForm = () => {
        if (membershipSubmitting) return;
        setShowMembershipForm(false);
    };

    const handleMembershipSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMembershipError("");
        setMembershipSuccess("");
        setMembershipSubmitting(true);

        try {
            const response = await fetch("/api/admin/member-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: membershipForm.name,
                    whatsapp: membershipForm.phone,
                    mobile: membershipForm.phone,
                    email: membershipForm.email,
                    address: membershipForm.address,
                    monthlyDeposit: membershipForm.monthlyDeposit,
                    note: [
                        membershipForm.fatherName && `Father's name: ${membershipForm.fatherName}`,
                        membershipForm.occupation && `Occupation: ${membershipForm.occupation}`,
                        membershipForm.message,
                    ].filter(Boolean).join("\n"),
                }),
            });
            const result = await readApiResponse(response);
            if (!response.ok || !result.success) {
                throw new Error(result.message || (bn ? "ফর্ম জমা দেওয়া যায়নি।" : "Could not submit the form."));
            }
            setMembershipSuccess(bn
                ? "আপনার আবেদন সফলভাবে জমা হয়েছে। যাচাইয়ের পর কর্তৃপক্ষ যোগাযোগ করবে।"
                : "Your application has been submitted. The team will contact you after review.");
            setMembershipForm(emptyMembershipForm);
        } catch (error) {
            setMembershipError(error instanceof Error ? error.message : (bn ? "একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Something went wrong. Please try again."));
        } finally {
            setMembershipSubmitting(false);
        }
    };

    const filteredMembers = members.filter((member) => {
        const search = memberSearch.toLowerCase().trim();
        return (
            member.name.toLowerCase().includes(search) ||
            member.nameEn.toLowerCase().includes(search) ||
            member.id.toLowerCase().includes(search) ||
            member.role.toLowerCase().includes(search) ||
            member.roleEn.toLowerCase().includes(search)
        );
    });

    return (

        <main

            id="main-content"
            tabIndex={-1}
            className={`app-background neon-ui min-h-screen flex flex-col overflow-x-clip transition-colors duration-300 ${headingColor}`}

        >

            {/* NAVBAR */}

            <header

                className={`fixed inset-x-0 top-0 z-50 border-b shadow-sm transition-colors ${dark

                    ? "border-gray-800 bg-gray-950/95"

                    : "border-gray-100 bg-white/95"

                    }`}

            >

                <nav className="mx-auto flex min-h-20 max-w-350 items-center justify-between gap-3 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">

                    <a

                        href="#home"

                        onClick={closeMenu}

                        className="group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3"

                    >

                        <span                         className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm transition-transform group-hover:scale-[1.03] sm:h-12 sm:w-12">

                            <Image

                                src={SITE_LOGO}

                                alt="আল ইনসাফ ইনভেস্টমেন্ট সোসাইটি"

                                fill

                                priority

                                sizes="48px"

                                className="object-contain"

                            />

                        </span>



                        <span className="min-w-0">

                            <span className="block truncate text-lg font-extrabold leading-tight tracking-tight text-green-800 sm:text-xl">

                                {bn ? "আল ইনসাফ" : "Al-Insaf"}

                            </span>

                            <span

                                className={`hidden text-xs font-medium sm:block ${dark ? "text-gray-400" : "text-gray-500"

                                    }`}

                            >

                                {bn ? "ইনভেস্টমেন্ট সোসাইটি" : "Investment Society"}

                            </span>

                        </span>

                    </a>



                    {/* Desktop Navigation */}

                    <div className={`hidden items-center gap-1 rounded-2xl p-1 xl:flex ${dark ? "bg-white/5" : "bg-gray-50"}`}>

                        {navItems.map((item) => (

                            <a

                                key={item.id}

                                href={item.href}

                                onClick={closeMenu}

                                aria-current={

                                    activeSection === item.id ? "location" : undefined

                                }

                                className={`relative whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${activeSection === item.id
                                    ? "bg-green-700/10 text-green-800 dark:text-green-300"
                                    : dark
                                        ? "text-gray-300 hover:bg-white/5 hover:text-green-300"
                                        : "text-gray-600 hover:bg-white hover:text-green-800 hover:shadow-sm"
                                    }`}

                            >

                                {item.label}

                            </a>

                        ))}

                    </div>



                    {/* Actions */}

                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">

                        <div

                            className={`hidden rounded-full p-1 xl:flex ${dark ? "bg-gray-800" : "bg-gray-100"

                                }`}

                            aria-label="Language selector"

                        >

                            <button

                                type="button"

                                onClick={() => setLanguage("bn")}

                                aria-pressed={bn}

                                className={`rounded-full px-3 py-2 text-xs font-bold transition-all ${bn

                                    ? "bg-green-700 text-white shadow-sm"

                                    : dark

                                        ? "text-gray-300 hover:text-white"

                                        : "text-gray-600 hover:text-green-800"

                                    }`}

                            >

                                বাংলা

                            </button>

                            <button

                                type="button"

                                onClick={() => setLanguage("en")}

                                aria-pressed={!bn}

                                className={`rounded-full px-3 py-2 text-xs font-bold transition-all ${!bn

                                    ? "bg-green-700 text-white shadow-sm"

                                    : dark

                                        ? "text-gray-300 hover:text-white"

                                        : "text-gray-600 hover:text-green-800"

                                    }`}

                            >

                                EN

                            </button>

                        </div>



                        <button
                            type="button"
                            onClick={toggleDark}

                            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}

                            className={`hidden h-10 w-10 items-center justify-center rounded-xl transition-colors xl:flex ${dark

                                ? "bg-gray-800 text-amber-300 hover:bg-gray-700"

                                : "bg-gray-100 text-gray-800 hover:bg-gray-200"

                                }`}

                        >

                            {dark ? <Moon size={19} /> : <Sun size={19} />}

                        </button>

                        <div className="relative hidden xl:block">
                            <button
                                type="button"
                                onClick={() => setShowNotifications((open) => !open)}
                                aria-label={bn ? "বিজ্ঞপ্তি" : "Notifications"}
                                aria-expanded={showNotifications}
                                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${dark
                                    ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                            >
                                <Bell size={19} />
                            </button>
                            {showNotifications && (
                                <div className={`absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border p-4 shadow-xl ${dark
                                    ? "border-gray-800 bg-gray-900 text-white"
                                    : "border-gray-100 bg-white text-gray-900"
                                    }`}>
                                    <p className="font-bold">{bn ? "বিজ্ঞপ্তি" : "Notifications"}</p>
                                    <p className={`mt-2 text-sm ${dark ? "text-gray-400" : "text-gray-500"}`}>
                                        {bn ? "নতুন বিজ্ঞপ্তি এখানে দেখা যাবে।" : "New notifications will appear here."}
                                    </p>
                                </div>
                            )}
                        </div>



                        <button

                            type="button"

                            onClick={() => setMenuOpen((value) => !value)}

                            aria-label={menuOpen ? (bn ? "মেনু বন্ধ করুন" : "Close navigation") : (bn ? "নেভিগেশন মেনু খুলুন" : "Open navigation")}

                            aria-expanded={menuOpen}

                            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors xl:hidden ${dark
                                ? "border-gray-700 text-white hover:bg-gray-800"
                                : "border-gray-200 text-gray-700 hover:bg-gray-100"
                                }`}

                        >

                            {menuOpen ? <X size={20} /> : <Menu size={20} />}

                        </button>

                    </div>



                    {/* LOGIN OPTIONS */}

                    <div className="relative hidden xl:block">

                        <button

                            type="button"

                            onClick={() => {
                                if (authRole) {
                                    setShowAccountMenu((open) => !open);
                                } else {
                                    setShowLoginOptions((open) => !open);
                                    setShowLoginRoles(false);
                                }
                            }}
                            aria-expanded={authRole ? showAccountMenu : showLoginOptions}

                            className={`flex items-center gap-2 rounded-xl px-3 py-2 font-semibold text-sm shadow-sm transition-all hover:-translate-y-px hover:shadow-md ${dark
                                ? "bg-green-600 text-white hover:bg-green-500"
                                : "bg-green-700 text-white hover:bg-green-800"
                                }`}

                        >

                            {authRole && authProfile?.photoUrl ? (
                                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/40 bg-white/20">
                                    <Image
                                        src={authProfile.photoUrl}
                                        alt={authProfile.name || (bn ? "প্রোফাইল ছবি" : "Profile photo")}
                                        fill
                                        unoptimized
                                        sizes="32px"
                                        className="object-cover"
                                    />
                                </span>
                            ) : authRole ? (
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                                    {authProfile?.name?.charAt(0).toUpperCase() || <UserRound size={16} />}
                                </span>
                            ) : <LogIn size={18} />}

                            <span className="max-w-32 truncate">
                                {authLoading
                                    ? (bn ? "লোড হচ্ছে..." : "Loading...")
                                    : authRole
                                        ? (authProfile?.name || (bn ? "আমার অ্যাকাউন্ট" : "My account"))
                                        : (bn ? "লগইন" : "Login")}
                            </span>

                            <ChevronDown

                                size={16}

                                className={`transition-transform ${(authRole ? showAccountMenu : showLoginOptions) ? "rotate-180" : ""

                                    }`}

                            />

                        </button>



                        {!authRole && showLoginOptions && (

                            <div

                                className={`absolute right-0 top-full mt-3 w-64 rounded-2xl border shadow-xl p-2 z-50 ${dark

                                    ? "bg-gray-900 border-gray-800 text-white"

                                    : "bg-white border-gray-100 text-gray-900"

                                    }`}

                            >

                                {!showLoginRoles ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowLoginOptions(false);
                                                openMembershipForm();
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-gray-900 transition-colors hover:bg-emerald-500/10 dark:text-white"
                                        >
                                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                                                <UserRound size={22} />
                                            </span>
                                            <span>
                                                <span className="block font-semibold">{bn ? "অ্যাকাউন্ট তৈরি" : "Create account"}</span>
                                                <span className="mt-1 block text-xs opacity-60">{bn ? "সদস্য হওয়ার আবেদন" : "Apply for membership"}</span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginRoles(true)}
                                            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-emerald-500/10"
                                        >
                                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                                                <LogIn size={22} />
                                            </span>
                                            <span className="flex-1">
                                                <span className="block font-semibold">{bn ? "লগইন" : "Login"}</span>
                                                <span className="mt-1 block text-xs opacity-60">{bn ? "অ্যাকাউন্টের ধরন বেছে নিন" : "Choose account type"}</span>
                                            </span>
                                            <ChevronRight size={17} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setShowLoginRoles(false)}
                                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-emerald-600 hover:bg-emerald-500/10"
                                        >
                                            {bn ? "← লগইন অপশনে ফিরুন" : "← Back to options"}
                                        </button>
                                        <Link
                                            href="/member/login"
                                            onClick={() => setShowLoginOptions(false)}
                                            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-emerald-500/10"
                                        >
                                            <UserRound size={21} className="text-blue-500" />
                                            <span className="font-semibold">{bn ? "সদস্য লগইন" : "Member login"}</span>
                                        </Link>
                                        <Link
                                            href="/admin/login"
                                            onClick={() => setShowLoginOptions(false)}
                                            className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-emerald-500/10"
                                        >
                                            <ShieldCheck size={21} className="text-emerald-500" />
                                            <span className="font-semibold">{bn ? "অ্যাডমিন লগইন" : "Admin login"}</span>
                                        </Link>
                                    </>
                                )}

                            </div>

                        )}

                        {authRole && showAccountMenu && (
                            <div className={`absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border p-2 shadow-xl ${dark
                                ? "border-gray-800 bg-gray-900 text-white"
                                : "border-gray-100 bg-white text-gray-900"
                                }`}>
                                <Link
                                    href={authRole === "admin" ? "/admin/dashboard" : "/member/dashboard"}
                                    onClick={() => setShowAccountMenu(false)}
                                    className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-emerald-500/10"
                                >
                                    <LayoutDashboard size={20} />
                                    <span>{bn ? "ড্যাশবোর্ডে যান" : "Open dashboard"}</span>
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => void logout()}
                                    className="flex w-full items-center gap-3 rounded-xl p-3 text-left text-red-600 transition-colors hover:bg-red-500/10"
                                >
                                    <LogOut size={20} />
                                    <span>{bn ? "লগআউট" : "Log out"}</span>
                                </button>
                            </div>
                        )}

                    </div>

                </nav>



                {/* Mobile Side Navigation */}
                {menuOpen && (
                    <div className="fixed inset-0 z-[70] xl:hidden">
                        <button
                            type="button"
                            aria-label={bn ? " বন্ধ করুন" : "Close menu"}
                            onClick={closeMenu}
                            className="absolute inset-0 h-full w-full bg-slate-950/55 backdrop-blur-[2px]"
                        />
                        <aside
                            id="mobile-site-navigation"
                            role="dialog"
                            aria-modal="true"
                            aria-label={bn ? "প্রধান নেভিগেশন" : "Main navigation"}
                            className={`site-nav-drawer absolute inset-y-0 right-0 flex w-[min(33.333vw,24rem)] min-w-[280px] max-w-[400px] flex-col border-l shadow-2xl ${dark
                                ? "border-slate-800 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-900"
                                }`}
                        >
                            <div className={`flex items-center justify-between border-b px-5 py-4 ${dark ? "border-slate-800 bg-slate-900/70" : "border-slate-100 bg-white/90"}`}>
                                <a href="#home" onClick={closeMenu} className="flex items-center gap-3">
                                    <span className="relative h-11 w-11 overflow-hidden rounded-xl bg-white">
                                        <Image src={SITE_LOGO} alt="Al-Insaf" fill sizes="44px" className="object-contain" />
                                    </span>
                                    <span>
                                        <span className="block font-extrabold text-green-700">{bn ? "আল ইনসাফ" : "Al-Insaf"}</span>
                                        <span className={`block text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                                            {bn ? "ইনভেস্টমেন্ট সোসাইটি" : "Investment Society"}
                                        </span>
                                    </span>
                                </a>
                                <button
                                    type="button"
                                    onClick={closeMenu}
                                    aria-label={bn ? "মেনু বন্ধ করুন" : "Close menu"}
                                    className={`rounded-xl p-2.5 transition-colors ${dark ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
                                >
                                    <X size={21} />
                                </button>
                            </div>

                            {authRole && (
                                <div className={`space-y-3 border-b px-5 py-4 ${dark ? "border-slate-800 bg-slate-900/40" : "border-slate-100 bg-slate-50/80"}`}>
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-emerald-600 text-sm font-bold text-white shadow-sm dark:border-slate-700">
                                            {authProfile?.photoUrl ? (
                                                <Image
                                                    src={authProfile.photoUrl}
                                                    alt={authProfile.name || (bn ? "প্রোফাইল ছবি" : "Profile photo")}
                                                    fill
                                                    unoptimized
                                                    sizes="44px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                authProfile?.name?.charAt(0).toUpperCase() || <UserRound size={19} />
                                            )}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-bold">
                                                {authProfile?.name || (bn ? "আমার অ্যাকাউন্ট" : "My account")}
                                            </span>
                                            <span className={`block text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                                                {authRole === "admin" ? (bn ? "অ্যাডমিন" : "Admin") : (bn ? "সদস্য" : "Member")}
                                            </span>
                                        </span>
                                    </div>
                                    <Link
                                        href={authRole === "admin" ? "/admin/dashboard" : "/member/dashboard"}
                                        onClick={closeMenu}
                                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-emerald-700 hover:shadow-md"
                                    >
                                        <LayoutDashboard size={18} />
                                        {bn ? "ড্যাশবোর্ডে যান" : "Open dashboard"}
                                    </Link>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto px-4 py-5">
                                <nav className="space-y-1.5" aria-label={bn ? "প্রধান নেভিগেশন" : "Main navigation"}>
                                    {navItems.map((item, index) => (
                                        <a
                                            key={item.id}
                                            href={item.href}
                                            onClick={closeMenu}
                                            aria-current={activeSection === item.id ? "location" : undefined}
                                            className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold transition-all ${activeSection === item.id
                                                ? "bg-emerald-600/10 text-slate-900 ring-1 ring-emerald-600/15 dark:text-white"
                                                : dark
                                                    ? "text-slate-200 hover:bg-slate-800"
                                                    : "text-slate-700 hover:bg-white hover:shadow-sm"
                                                }`}
                                        >
                                            <span className="flex items-center gap-3">
                                                <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${activeSection === item.id ? "bg-emerald-600 text-white" : dark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                                                    {String(index + 1).padStart(2, "0")}
                                                </span>
                                                {item.label}
                                            </span>
                                            <ChevronRight size={17} />
                                        </a>
                                    ))}
                                </nav>

                                <div className={`mt-6 space-y-4 border-t pt-5 ${dark ? "border-slate-800" : "border-slate-100"}`}>
                                    <div className="flex items-center justify-between px-3">
                                        <span className={`text-sm font-semibold ${dark ? "text-slate-300" : "text-slate-600"}`}>
                                            {bn ? "ভাষা" : "Language"}
                                        </span>
                                        <div role="group" aria-label={bn ? "ভাষা নির্বাচন" : "Select language"} className={`flex rounded-full p-1 ${dark ? "bg-slate-800" : "bg-slate-100"}`}>
                                            <button type="button" onClick={() => setLanguage("bn")} aria-pressed={bn} className={`rounded-full px-3 py-1.5 text-xs font-bold ${bn ? "bg-green-700 text-white" : dark ? "text-slate-300" : "text-slate-600"}`}>বাংলা</button>
                                            <button type="button" onClick={() => setLanguage("en")} aria-pressed={!bn} className={`rounded-full px-3 py-1.5 text-xs font-bold ${!bn ? "bg-green-700 text-white" : dark ? "text-slate-300" : "text-slate-600"}`}>EN</button>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setShowNotifications((open) => !open)}
                                        aria-expanded={showNotifications}
                                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
                                    >
                                        <Bell size={18} />
                                        {bn ? "বিজ্ঞপ্তি" : "Notifications"}
                                        <ChevronDown size={16} className={`ml-auto transition-transform ${showNotifications ? "rotate-180" : ""}`} />
                                    </button>
                                    {showNotifications && (
                                        <p className={`rounded-xl px-4 text-sm leading-6 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                                            {bn ? "নতুন বিজ্ঞপ্তি এখানে দেখা যাবে।" : "New notifications will appear here."}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={toggleDark}
                                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${dark ? "text-slate-200 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-100"}`}
                                    >
                                        {dark ? <Sun size={18} /> : <Moon size={18} />}
                                        {dark
                                            ? (bn ? "লাইট মোড চালু করুন" : "Switch to light mode")
                                            : (bn ? "ডার্ক মোড চালু করুন" : "Switch to dark mode")}
                                    </button>
                                </div>
                            </div>

                            <div className={`space-y-2 border-t p-4 ${dark ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50"}`}>
                                {authRole ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => void logout()}
                                            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${dark ? "border-slate-700 text-red-300 hover:bg-red-950/30" : "border-slate-200 text-red-600 hover:bg-red-50"}`}
                                        >
                                            <LogOut size={17} />
                                            {bn ? "লগআউট" : "Log out"}
                                        </button>
                                    </>
                                ) : authLoading ? (
                                    <p className={`py-2 text-center text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                                        {bn ? "লগইন অবস্থা যাচাই হচ্ছে..." : "Checking login status..."}
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeMenu();
                                                openMembershipForm();
                                            }}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                                        >
                                            <UserRound size={17} />
                                            {bn ? "অ্যাকাউন্ট তৈরি" : "Create account"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowMobileLoginRoles((open) => !open)}
                                            aria-expanded={showMobileLoginRoles}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
                                        >
                                            <LogIn size={17} />
                                            {bn ? "লগইন" : "Login"}
                                            <ChevronDown size={16} className={`transition-transform ${showMobileLoginRoles ? "rotate-180" : ""}`} />
                                        </button>
                                        {showMobileLoginRoles && (
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <Link href="/member/login" onClick={closeMenu} className="rounded-xl bg-blue-600 px-3 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-blue-700">
                                                    {bn ? "সদস্য" : "Member"}
                                                </Link>
                                                <Link href="/admin/login" onClick={closeMenu} className="rounded-xl bg-emerald-700 px-3 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-emerald-800">
                                                    {bn ? "অ্যাডমিন" : "Admin"}
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>
                )}

            </header>

            <div aria-hidden="true" className="h-19 shrink-0" />

            {/* HERO */}

            <section

                id="home"

                className="hero-pattern relative isolate scroll-mt-20 overflow-hidden bg-[#3e81b1] text-white"

            >

                <div className="pointer-events-none absolute -left-32 top-10 -z-10 h-80 w-80 rounded-full bg-green-300/10 blur-3xl" />

                <div className="pointer-events-none absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />



                <div className="mx-auto flex min-h-135 max-w-7xl flex-col items-center justify-center px-5 py-20 text-center sm:min-h-147.5 sm:py-24">

                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-semibold text-green-50 backdrop-blur">

                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />

                        {bn

                            ? "বিশ্বাস ও স্বচ্ছতার অঙ্গীকার"

                            : "Committed to Trust & Transparency"}

                    </div>



                    <h1 className="max-w-5xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">

                        {bn

                            ? "আল ইনসাফ ইনভেস্টমেন্ট সোসাইটি"

                            : "Al-Insaf Investment Society"}

                    </h1>



                    <h2 className="mt-6 text-xl font-bold text-green-100 sm:text-2xl md:text-3xl">

                        {bn

                            ? "বিশ্বাসে বিনিয়োগ, ইনসাফে সমৃদ্ধি"

                            : "Invest with Trust, Grow with Integrity"}

                    </h2>



                    <p className="mt-5 max-w-3xl text-base leading-8 text-green-100/85 sm:text-lg">

                        {bn

                            ? "পারস্পরিক বিশ্বাস, স্বচ্ছতা ও ন্যায়নীতির ভিত্তিতে আর্থিক সচেতনতা এবং সদস্যদের উন্নয়নে আমরা কাজ করতে আগ্রহী। আমাদের সেবা ও কার্যক্রম সম্পর্কে বিস্তারিত জানুন।"

                            : "We aim to encourage financial awareness and member development through mutual trust, transparency and fairness. Discover our services and activities."}

                    </p>



                    <div className="mt-9 flex w-full flex-col justify-center gap-4 sm:w-auto sm:flex-row">

                        <button
                            type="button"
                            onClick={openMembershipForm}
                            className="inline-flex items-center justify-center gap-3 rounded-xl bg-amber-400 px-7 py-4 font-bold text-green-950 shadow-lg shadow-black/10 transition-all duration-300 hover:-translate-y-1 hover:bg-amber-300 sm:px-8"
                        >
                            {bn ? "সদস্য হোন" : "Become a Member"}
                            <ArrowRight size={19} />
                        </button>



                        <a

                            href="#about"

                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-7 py-4 font-bold text-white transition-all hover:bg-white/10 sm:px-8"

                        >

                            {bn ? "আরও জানুন" : "Learn More"}

                            <ChevronRight size={19} />

                        </a>

                    </div>



                    <div className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-3 text-sm text-green-100">

                        <span className="flex items-center gap-2">

                            <ShieldCheck size={18} className="text-amber-400" />

                            {bn ? "স্বচ্ছতার অঙ্গীকার" : "Commitment to Transparency"}

                        </span>

                        <span className="flex items-center gap-2">

                            <HeartHandshake size={18} className="text-amber-400" />

                            {bn ? "পারস্পরিক সহযোগিতা" : "Mutual Support"}

                        </span>

                    </div>

                </div>

            </section>



            {/* STATISTICS */}

            <section

                className={`relative z-10 px-4 pb-12 sm:px-6 ${mutedBg}`}

                aria-label={bn ? "প্রতিষ্ঠানের পরিসংখ্যান" : "Organization statistics"}

            >

                {statisticsError && (
                    <p role="alert" className="mx-auto mb-3 max-w-7xl rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
                        {statisticsError}
                    </p>
                )}

                <div className="mx-auto -mt-7 grid max-w-7xl grid-cols-2 gap-4 rounded-3xl border border-gray-200/70 bg-white px-4 py-7 shadow-[0_15px_35px_rgba(0,0,0,0.10)] sm:-mt-9 sm:grid-cols-4 sm:gap-6 sm:px-8 sm:py-9">

                    {statistics.map((stat) => {

                        const Icon = stat.icon;



                        return (

                            <div key={stat.label} className="group text-center">

                                <div className="mx-auto mb-2 hidden h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700 sm:flex">

                                    <Icon size={19} />

                                </div>

                                <h3 className="text-2xl font-extrabold tracking-tight text-green-800 sm:text-3xl lg:text-4xl">

                                    {stat.value}

                                </h3>

                                <p className="mt-2 text-xs font-medium leading-6 text-gray-500 sm:text-sm">

                                    {bn ? stat.label : stat.englishLabel}

                                </p>

                            </div>

                        );

                    })}

                </div>

            </section>



            {/* ABOUT */}

            <section

                id="about"

                className={`scroll-mt-20 px-5 py-20 sm:py-24 ${sectionBg}`}

            >

                <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2 lg:gap-16">

                    <div>

                        <span className="section-label">

                            {bn ? "আমাদের পরিচিতি" : "Who We Are"}

                        </span>



                        <h2

                            className={`mt-5 text-3xl font-extrabold leading-snug sm:text-4xl ${dark ? "text-white" : "text-gray-900"

                                }`}

                        >

                            {bn

                                ? "বিশ্বাস, সততা ও ইনসাফের পথে একসঙ্গে"

                                : "Together Through Trust, Honesty and Fairness"}

                        </h2>



                        <p className={`mt-5 leading-8 ${bodyColor}`}>

                            {bn

                                ? "আল ইনসাফ ইনভেস্টমেন্ট সোসাইটির লক্ষ্য হলো সদস্যদের মধ্যে সঞ্চয়ের অভ্যাস, আর্থিক সচেতনতা ও পারস্পরিক সহযোগিতা উৎসাহিত করা। আমরা স্বচ্ছ প্রক্রিয়া, স্পষ্ট শর্ত এবং দায়িত্বশীল কার্যক্রমের মাধ্যমে সদস্যদের আর্থিক পরিকল্পনায় সহায়তা করতে আগ্রহী।"

                                : "Al-Insaf Investment Society aims to encourage savings, financial awareness and mutual support among its members. We seek to support financial planning through transparent processes, clear terms and responsible activities."}

                        </p>



                        <div className="mt-7 space-y-4">

                            {[

                                bn

                                    ? "স্বচ্ছ নীতিমালা ও পরিষ্কার শর্ত"

                                    : "Transparent policies and clear terms",

                                bn

                                    ? "সদস্যদের প্রতি দায়বদ্ধতা"

                                    : "Accountability to members",

                                bn

                                    ? "দীর্ঘমেয়াদি আর্থিক পরিকল্পনা"

                                    : "Long-term financial planning",

                            ].map((item) => (

                                <div key={item} className="flex items-start gap-3">

                                    <CheckCircle2

                                        className="mt-0.5 shrink-0 text-green-600"

                                        size={21}

                                    />

                                    <span className={bodyColor}>{item}</span>

                                </div>

                            ))}

                        </div>



                        <a

                            href="#services"

                            className="mt-8 inline-flex items-center gap-2 font-bold text-green-700 transition-all hover:gap-3"

                        >

                            {bn ? "আমাদের সেবাগুলো দেখুন" : "Explore Our Services"}

                            <ArrowRight size={19} />

                        </a>

                    </div>



                    <div className="relative mx-auto w-full max-w-lg">

                        <div className="absolute -inset-3 rounded-4xl bg-green-100/70" />

                        <div

                            className={`relative flex min-h-85 flex-col items-center justify-center overflow-hidden rounded-3xl border p-6 sm:min-h-105 ${dark

                                ? "border-gray-800 bg-gray-900"

                                : "border-green-100 bg-white"

                                }`}

                        >

                            <div className="relative h-65 w-full sm:h-80">

                                <Image

                                    src={SITE_LOGO}

                                    alt="আল ইনসাফ ইনভেস্টমেন্ট সোসাইটির লোগো"

                                    fill

                                    sizes="(max-width: 768px) 90vw, 500px"

                                    className="object-contain"

                                />

                            </div>



                            <p className="mt-4 text-center text-sm font-bold text-green-800">

                                {bn

                                    ? "বিশ্বাসে বিনিয়োগ, ইনসাফে সমৃদ্ধি"

                                    : "Invest with Trust, Grow with Integrity"}

                            </p>

                        </div>

                    </div>

                </div>

            </section>



            {/* SERVICES */}

            <section

                id="services"

                className={`scroll-mt-20 px-5 py-20 sm:py-24 ${mutedBg}`}

            >

                <div className="mx-auto max-w-7xl">

                    <SectionHeading

                        eyebrow={bn ? "আমাদের সেবাসমূহ" : "Our Services"}

                        title={

                            bn

                                ? "আপনার প্রয়োজন, আমাদের সহযোগিতা"

                                : "Support for Your Needs"

                        }

                        description={

                            bn

                                ? "প্রতিটি সেবার যোগ্যতা, শর্ত ও প্রযোজ্য নিয়ম জেনে সিদ্ধান্ত নিন।"

                                : "Understand eligibility, terms and applicable rules before making a decision."

                        }

                        dark={dark}

                    />



                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

                        {services.map((service) => {

                            const Icon = service.icon;



                            return (

                                <article

                                    key={service.title}

                                    className={`group flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl sm:p-7 ${dark

                                        ? "border-gray-800 bg-gray-950 hover:border-green-800"

                                        : "border-gray-100 bg-white hover:border-green-200"

                                        }`}

                                >

                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-700 transition-colors group-hover:bg-green-700 group-hover:text-white">

                                        <Icon size={26} />

                                    </div>



                                    <h3

                                        className={`mt-6 text-xl font-bold ${dark ? "text-white" : "text-gray-900"

                                            }`}

                                    >

                                        {service.title}

                                    </h3>



                                    <p className={`mt-3 flex-1 text-sm leading-7 ${bodyColor}`}>

                                        {service.description}

                                    </p>



                                    <a

                                        href="#contact"

                                        className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-green-700 transition-all hover:gap-3"

                                    >

                                        {bn ? "বিস্তারিত জানুন" : "Learn More"}

                                        <ArrowRight size={16} />

                                    </a>

                                </article>

                            );

                        })}

                    </div>

                </div>

            </section>





            {/* MEMBERS DIRECTORY */}

            <section

                id="members"

                className={`scroll-mt-24 py-20 px-4 sm:px-6 lg:px-8 ${dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"

                    }`}

            >

                <div className="max-w-7xl mx-auto">

                    {/* Section Heading */}

                    <div className="text-center max-w-2xl mx-auto mb-12">

                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-emerald-500/10 text-emerald-500 mb-4">

                            <Users size={16} />

                            {bn ? "আমাদের পরিবার" : "Our Community"}

                        </span>



                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-5">

                            {bn ? "সদস্যদের তালিকা" : "Members Directory"}

                        </h2>



                        <p

                            className={`text-base sm:text-lg leading-8 ${dark ? "text-gray-400" : "text-gray-600"

                                }`}

                        >

                            {bn

                                ? "আল-ইনসাফ ইনভেস্টমেন্ট সোসাইটির সদস্য ও তাঁদের দায়িত্ব সম্পর্কে জানুন।"

                                : "Meet the members of Al-Insaf Investment Society and learn about their roles."}

                        </p>

                    </div>



                    {/* Search */}

                    <div className="max-w-xl mx-auto mb-10">

                        <div

                            className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all focus-within:ring-2 focus-within:ring-emerald-500 ${dark

                                ? "bg-gray-900 border-gray-800"

                                : "bg-white border-gray-200 shadow-sm"

                                }`}

                        >

                            <Search className="text-emerald-500 shrink-0" size={21} />



                            <input

                                type="text"

                                value={memberSearch}

                                onChange={(e) => setMemberSearch(e.target.value)}

                                placeholder={

                                    bn

                                        ? "নাম, পদবি বা Member ID দিয়ে খুঁজুন..."

                                        : "Search by name, position or Member ID..."

                                }

                                className={`w-full bg-transparent outline-none text-sm sm:text-base ${dark

                                    ? "text-white placeholder:text-gray-500"

                                    : "text-gray-900 placeholder:text-gray-400"

                                    }`}

                            />



                            {memberSearch && (

                                <button

                                    type="button"

                                    onClick={() => setMemberSearch("")}

                                    className="text-sm text-emerald-500 hover:text-emerald-400 font-medium shrink-0"

                                >

                                    {bn ? "মুছুন" : "Clear"}

                                </button>

                            )}

                        </div>



                        <p

                            className={`text-sm mt-3 text-center ${dark ? "text-gray-500" : "text-gray-500"

                                }`}

                        >

                            {bn

                                ? `মোট ${filteredMembers.length} জন সদস্য পাওয়া গেছে`

                                : `${filteredMembers.length} members found`}

                        </p>

                    </div>



                    {/* Database state */}
                    {membersLoading && (
                        <p className={`mb-6 text-center ${bodyColor}`}>
                            {bn ? "ডাটাবেজ থেকে সদস্যদের তথ্য আনা হচ্ছে..." : "Loading members from the database..."}
                        </p>
                    )}
                    {!membersLoading && membersError && (
                        <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
                            {membersError}
                        </p>
                    )}

                    {/* Member Cards */}

                    {!membersLoading && !membersError && filteredMembers.length > 0 && (

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

                            {filteredMembers.map((member) => (

                                <div

                                    key={member.id}

                                    className={`group relative overflow-hidden rounded-3xl border p-6 sm:p-7 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${dark

                                        ? "bg-gray-900 border-gray-800 hover:border-emerald-500/50"

                                        : "bg-white border-gray-100 hover:border-emerald-200 shadow-sm"

                                        }`}

                                >

                                    {/* Decorative Background */}

                                    <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />



                                    <div className="relative flex items-start gap-4">

                                        {/* Avatar */}

                                        <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">

                                            <UserRound size={30} strokeWidth={1.7} />

                                        </div>



                                        <div className="min-w-0 flex-1">

                                            <h3 className="text-lg font-bold leading-snug break-all">

                                                {bn ? member.name : member.nameEn}

                                            </h3>



                                            <p className="text-emerald-500 text-sm font-medium mt-1">

                                                {bn ? member.role : member.roleEn}

                                            </p>



                                            <div

                                                className={`inline-flex items-center mt-3 px-3 py-1 rounded-full text-xs font-semibold ${dark

                                                    ? "bg-gray-800 text-gray-300"

                                                    : "bg-gray-100 text-gray-600"

                                                    }`}

                                            >

                                                {member.id}

                                            </div>

                                        </div>

                                    </div>



                                    <div

                                        className={`mt-6 pt-4 border-t flex items-center gap-2 text-sm ${dark

                                            ? "border-gray-800 text-gray-400"

                                            : "border-gray-100 text-gray-500"

                                            }`}

                                    >

                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />

                                        {bn ? "সোসাইটির সদস্য" : "Society Member"}

                                    </div>

                                </div>

                            ))}

                        </div>

                    )}

                    {!membersLoading && !membersError && filteredMembers.length === 0 && (

                        <div

                            className={`text-center py-14 rounded-3xl border border-dashed ${dark

                                ? "border-gray-800 text-gray-400"

                                : "border-gray-300 text-gray-500"

                                }`}

                        >

                            <Search size={36} className="mx-auto mb-4 opacity-50" />



                            <h3 className="text-lg font-semibold mb-2">

                                {bn ? "কোনো সদস্য পাওয়া যায়নি" : "No members found"}

                            </h3>



                            <p className="text-sm">

                                {bn

                                    ? "অন্য নাম বা Member ID দিয়ে চেষ্টা করুন।"

                                    : "Try searching with another name or Member ID."}

                            </p>

                        </div>

                    )}

                </div>

            </section>



            {/* WHY CHOOSE US */}

            <section

                id="why-us"

                className={`px-5 py-20 sm:py-24 ${sectionBg}`}

            >

                <div className="mx-auto max-w-7xl">

                    <SectionHeading

                        eyebrow={bn ? "আমাদের অঙ্গীকার" : "Our Commitment"}

                        title={

                            bn ? "কেন আমাদের বেছে নেবেন?" : "Why Choose Us?"

                        }

                        description={

                            bn

                                ? "আমাদের কার্যক্রমের ভিত্তি হলো স্বচ্ছতা, দায়বদ্ধতা ও সদস্যদের প্রতি সম্মান।"

                                : "Our approach is built around transparency, accountability and respect for members."

                        }

                        dark={dark}

                    />



                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

                        {features.map((feature) => (

                            <InfoCard

                                key={feature.title}

                                icon={feature.icon}

                                title={feature.title}

                                description={feature.description}

                                dark={dark}

                            />

                        ))}

                    </div>

                </div>

            </section>



            {/* HOW IT WORKS */}

            <section

                id="process"

                className={`scroll-mt-20 px-5 py-20 sm:py-24 ${mutedBg}`}

            >

                <div className="mx-auto max-w-7xl">

                    <SectionHeading

                        eyebrow={bn ? "কাজের প্রক্রিয়া" : "Our Process"}

                        title={bn ? "সহজ চারটি ধাপ" : "Four Simple Steps"}

                        description={

                            bn

                                ? "যোগাযোগ থেকে পরবর্তী পদক্ষেপ পর্যন্ত প্রক্রিয়াটি জেনে নিন।"

                                : "Understand the process from initial contact to the next steps."

                        }

                        dark={dark}

                    />



                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

                        {steps.map((step, index) => (

                            <article

                                key={step.number}

                                className={`relative rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${dark

                                    ? "border-gray-800 bg-gray-950"

                                    : "border-gray-200 bg-white"

                                    }`}

                            >

                                <div className="flex items-center justify-between">

                                    <span className="text-4xl font-black text-green-700/25">

                                        {step.number}

                                    </span>

                                    {index === 0 ? (

                                        <Phone className="text-green-700" size={22} />

                                    ) : index === 1 ? (

                                        <CheckCircle2 className="text-green-700" size={22} />

                                    ) : index === 2 ? (

                                        <ShieldCheck className="text-green-700" size={22} />

                                    ) : (

                                        <ArrowRight className="text-green-700" size={22} />

                                    )}

                                </div>



                                <h3

                                    className={`mt-5 text-lg font-bold ${dark ? "text-white" : "text-gray-900"

                                        }`}

                                >

                                    {step.title}

                                </h3>



                                <p className={`mt-3 text-sm leading-7 ${bodyColor}`}>

                                    {step.description}

                                </p>

                            </article>

                        ))}

                    </div>

                </div>

            </section>



            {/* CTA */}

            <section className={`px-5 py-16 ${sectionBg}`}>

                <div className="hero-pattern relative isolate mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl bg-[#005b2b] px-7 py-12 text-center text-white sm:px-12 lg:flex-row lg:text-left">

                    <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />



                    <div>

                        <div className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-300">

                            <Sparkles size={17} />

                            {bn ? "একসঙ্গে এগিয়ে চলি" : "Let's Grow Together"}

                        </div>



                        <h2 className="text-2xl font-extrabold sm:text-3xl">

                            {bn

                                ? "আমাদের সঙ্গে যুক্ত হতে চান?"

                                : "Would You Like to Join Us?"}

                        </h2>



                        <p className="mt-3 max-w-2xl leading-7 text-green-100">

                            {bn

                                ? "সদস্যপদ, সেবার শর্ত ও প্রয়োজনীয় তথ্য জানতে আমাদের সঙ্গে যোগাযোগ করুন।"

                                : "Contact us to learn about membership, service terms and requirements."}

                        </p>

                    </div>



                    <button
                        type="button"
                        onClick={openMembershipForm}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-7 py-4 font-bold text-green-950 transition-all hover:-translate-y-1 hover:bg-amber-300"
                    >
                        {bn ? "সদস্য হতে আবেদন করুন" : "Apply for Membership"}
                        <ArrowRight size={19} />
                    </button>

                </div>

            </section>



            {/* CONTACT */}

            <section

                id="contact"

                className={`scroll-mt-20 px-5 py-20 sm:py-24 ${mutedBg}`}

            >

                <div className="mx-auto max-w-7xl">

                    <SectionHeading

                        eyebrow={bn ? "যোগাযোগ" : "Contact Us"}

                        title={bn ? "আমাদের সঙ্গে কথা বলুন" : "Talk to Our Team"}

                        description={

                            bn

                                ? "সদস্যপদ বা সেবা সম্পর্কে জানতে আমাদের সঙ্গে যোগাযোগ করুন।"

                                : "Reach out for information about membership and services."

                        }

                        dark={dark}

                    />



                    <div className="grid gap-5 md:grid-cols-3">

                        {contactItems.map((item) => (

                            <article

                                key={item.title}

                                className={`rounded-2xl border p-6 transition-all hover:-translate-y-1 hover:shadow-lg ${dark

                                    ? "border-gray-800 bg-gray-950"

                                    : "border-gray-100 bg-white"

                                    }`}

                            >

                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-800">

                                    <item.icon size={23} />

                                </div>



                                <h3

                                    className={`mt-4 font-bold ${dark ? "text-white" : "text-gray-900"

                                        }`}

                                >

                                    {item.title}

                                </h3>



                                <p className={`mt-2 break-all text-sm ${bodyColor}`}>

                                    {item.detail}

                                </p>

                            </article>

                        ))}

                    </div>

                </div>

            </section>



            {/* FOOTER */}

            <footer className="mt-auto bg-[#003d1d] px-5 pb-6 pt-14 text-white">

                <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">



                    {/* Logo / About */}

                    <div>

                        <a href="#home" className="inline-flex items-center gap-3">

                            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">

                                <Image

                                    src={SITE_LOGO}

                                    alt="আল ইনসাফ লোগো"

                                    fill

                                    sizes="48px"

                                    className="object-contain"

                                />

                            </span>



                            <span>

                                <span className="block font-extrabold">

                                    {bn ? "আল ইনসাফ" : "Al-Insaf"}

                                </span>



                                <span className="block text-xs text-green-200">

                                    {bn

                                        ? "ইনভেস্টমেন্ট সোসাইটি"

                                        : "Investment Society"}

                                </span>

                            </span>

                        </a>



                        <p className="mt-5 text-sm leading-7 text-green-100/80">

                            {bn

                                ? "বিশ্বাসে বিনিয়োগ, ইনসাফে সমৃদ্ধি।"

                                : "Invest with Trust, Grow with Integrity."}

                        </p>

                    </div>



                    {/* Quick Links */}

                    <div>

                        <h3 className="mb-5 font-bold">

                            {bn ? "দ্রুত লিংক" : "Quick Links"}

                        </h3>



                        <div className="space-y-3">

                            {navItems.map((item) => (

                                <a

                                    key={item.id}

                                    href={item.href}

                                    className="flex items-center gap-2 text-sm text-green-100/80 transition-colors hover:text-amber-300"

                                >

                                    <ChevronRight size={15} />

                                    {item.label}

                                </a>

                            ))}

                        </div>

                    </div>



                    {/* Services */}

                    <div>

                        <h3 className="mb-5 font-bold">

                            {bn ? "আমাদের সেবা" : "Our Services"}

                        </h3>



                        <div className="space-y-3">

                            {services.map((service) => (

                                <a

                                    key={service.title}

                                    href="#services"

                                    className="block text-sm text-green-100/80 transition-colors hover:text-amber-300"

                                >

                                    {service.title}

                                </a>

                            ))}

                        </div>

                    </div>



                    {/* Mission */}

                    <div>

                        <h3 className="mb-5 font-bold">

                            {bn ? "আমাদের লক্ষ্য" : "Our Mission"}

                        </h3>



                        <p className="text-sm leading-7 text-green-100/80">

                            {bn

                                ? "স্বচ্ছতা, ন্যায়নীতি ও পারস্পরিক সহযোগিতার মাধ্যমে আর্থিক সচেতনতা গড়ে তোলা।"

                                : "Promoting financial awareness through transparency, fairness and mutual support."}

                        </p>



                        <button
                            type="button"
                            onClick={openMembershipForm}
                            className="mt-5 inline-flex items-center gap-2 text-left text-sm font-semibold text-amber-300 transition-colors hover:text-amber-200"
                        >
                            <Users size={17} />
                            {bn ? "সদস্য হতে আবেদন করুন" : "Apply to Become a Member"}
                        </button>

                    </div>

                </div>



                {/* Bottom Footer */}

                <div className="mx-auto mt-12 max-w-7xl border-t border-white/15 pt-5">



                    {/* Copyright */}

                    <div className="text-center text-xs leading-6 text-green-100/70">

                        © {new Date().getFullYear()} Al-Insaf Investment Society.{" "}

                        {bn ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}

                    </div>



                    {/* Developer Credit */}

                    <div className="mt-3 text-center text-xs text-green-100/60">

                        {bn ? "নির্মাণ ও উন্নয়ন:" : "Built by"}{" "}

                        <span className="font-semibold text-white">

                            Abu Saleh

                        </span>{" "}

                    </div>

                </div>

            </footer>

            {/* Become a Member form modal */}
            {showMembershipForm && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) closeMembershipForm();
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="membership-form-title"
                        className={`relative my-auto w-full max-w-2xl rounded-3xl border p-5 shadow-2xl sm:p-8 ${dark ? "border-gray-700 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-900"}`}
                    >
                        <button
                            type="button"
                            onClick={closeMembershipForm}
                            aria-label={bn ? "ফর্ম বন্ধ করুন" : "Close form"}
                            disabled={membershipSubmitting}
                            className="absolute right-4 top-4 rounded-full p-2 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                        >
                            <X size={22} />
                        </button>

                        <div className="mb-6 pr-8">
                            <span className="text-sm font-bold uppercase tracking-wider text-green-700">
                                {bn ? "সদস্যপদ আবেদন" : "Membership Application"}
                            </span>
                            <h2 id="membership-form-title" className="mt-2 text-2xl font-extrabold sm:text-3xl">
                                {bn ? "সদস্য হতে ফর্ম পূরণ করুন" : "Become a Member"}
                            </h2>
                            <p className={`mt-2 text-sm leading-6 ${bodyColor}`}>
                                {bn ? "আপনার তথ্য দিন। আবেদনটি ডাটাবেজে Pending অবস্থায় জমা হবে এবং কর্তৃপক্ষ যাচাই করবে।" : "Fill in your details. Your application will be saved as pending for the team to review."}
                            </p>
                        </div>

                        {membershipSuccess ? (
                            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-green-900">
                                <CheckCircle2 size={32} className="mb-3 text-green-700" />
                                <p className="font-semibold leading-7">{membershipSuccess}</p>
                                <button
                                    type="button"
                                    onClick={() => { setMembershipSuccess(""); setShowMembershipForm(false); }}
                                    className="mt-5 rounded-xl bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800"
                                >
                                    {bn ? "বন্ধ করুন" : "Close"}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleMembershipSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="text-sm font-semibold">
                                    {bn ? "পূর্ণ নাম *" : "Full name *"}
                                    <input name="name" required minLength={2} maxLength={100} autoComplete="name" value={membershipForm.name} onChange={(event) => setMembershipForm((prev) => ({ ...prev, name: event.target.value }))} className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${dark ? "border-gray-700 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900"}`} placeholder={bn ? "আপনার নাম" : "Your name"} />
                                </label>
                                <label className="text-sm font-semibold">
                                    {bn ? "পিতার নাম" : "Father's name"}
                                    <input name="fatherName" maxLength={100} value={membershipForm.fatherName} onChange={(event) => setMembershipForm((prev) => ({ ...prev, fatherName: event.target.value }))} className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${dark ? "border-gray-700 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900"}`} />
                                </label>
                                <label className="text-sm font-semibold">
                                    {bn ? "মোবাইল নম্বর *" : "Mobile number *"}
                                    <input name="phone" type="tel" required minLength={8} maxLength={20} autoComplete="tel" value={membershipForm.phone} onChange={(event) => setMembershipForm((prev) => ({ ...prev, phone: event.target.value }))} className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${dark ? "border-gray-700 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900"}`} placeholder="01XXXXXXXXX" />
                                </label>
                                <label className="text-sm font-semibold">
                                    {bn ? "ইমেইল" : "Email"}
                                    <input name="email" type="email" maxLength={254} autoComplete="email" value={membershipForm.email} onChange={(event) => setMembershipForm((prev) => ({ ...prev, email: event.target.value }))} className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${dark ? "border-gray-700 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900"}`} placeholder="name@example.com" />
                                </label>
                                <label className="text-sm font-semibold">
                                    {bn ? "পেশা" : "Occupation"}
                                    <input name="occupation" maxLength={100} value={membershipForm.occupation} onChange={(event) => setMembershipForm((prev) => ({ ...prev, occupation: event.target.value }))} className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${dark ? "border-gray-700 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900"}`} />
                                </label>
                                <label className="text-sm font-semibold">
                                    {bn ? "প্রস্তাবিত মাসিক জমা (টাকা)" : "Proposed monthly deposit (BDT)"}
                                    <input name="monthlyDeposit" type="number" min="0" max="100000000" step="1" value={membershipForm.monthlyDeposit} onChange={(event) => setMembershipForm((prev) => ({ ...prev, monthlyDeposit: event.target.value }))} className={`mt-2 w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${dark ? "border-gray-700 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900"}`} placeholder="1000" />
                                </label>
                                <label className="text-sm font-semibold sm:col-span-2">
                                    {bn ? "বর্তমান ঠিকানা *" : "Current address *"}
                                    <textarea name="address" required minLength={5} maxLength={500} rows={2} autoComplete="street-address" value={membershipForm.address} onChange={(event) => setMembershipForm((prev) => ({ ...prev, address: event.target.value }))} className={`mt-2 w-full resize-y rounded-xl border px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${dark ? "border-gray-700 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900"}`} />
                                </label>
                                <label className="text-sm font-semibold sm:col-span-2">
                                    {bn ? "অতিরিক্ত তথ্য (ঐচ্ছিক)" : "Additional message (optional)"}
                                    <textarea name="message" maxLength={1000} rows={3} value={membershipForm.message} onChange={(event) => setMembershipForm((prev) => ({ ...prev, message: event.target.value }))} className={`mt-2 w-full resize-y rounded-xl border px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 ${dark ? "border-gray-700 bg-gray-950 text-white" : "border-gray-300 bg-white text-gray-900"}`} />
                                </label>

                                {membershipError && (
                                    <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{membershipError}</p>
                                )}

                                <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
                                    <button type="button" onClick={closeMembershipForm} disabled={membershipSubmitting} className={`rounded-xl border px-5 py-3 font-bold transition disabled:opacity-50 ${dark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-50"}`}>
                                        {bn ? "বাতিল" : "Cancel"}
                                    </button>
                                    <button type="submit" disabled={membershipSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 font-bold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60">
                                        {membershipSubmitting ? (bn ? "জমা হচ্ছে..." : "Submitting...") : (bn ? "আবেদন জমা দিন" : "Submit Application")}
                                        {!membershipSubmitting && <ArrowRight size={18} />}
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            )}

        </main>

    );

}
