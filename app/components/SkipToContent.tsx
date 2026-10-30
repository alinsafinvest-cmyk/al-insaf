"use client";
// বাংলা: keyboard ব্যবহারকারীদের সরাসরি মূল কনটেন্টে যেতে সুবিধা দেয়।

import { useLanguage } from "@/context/LanguageContext";
import { translate } from "@/lib/i18n";

export default function SkipToContent() {
    const { language } = useLanguage();

    return (
        <a className="skip-link" href="#main-content">
            {translate(language, "Skip to main content")}
        </a>
    );
}
