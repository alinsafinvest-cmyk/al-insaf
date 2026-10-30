// বাংলা: এই context-এ ভাষা নির্বাচন, ভাষার state এবং translation hook সরবরাহ করা হয়।

"use client";

import {
    createContext,
    useContext,
    useEffect,
    useSyncExternalStore,
    type ReactNode,
} from "react";

type Language = "bn" | "en";

type LanguageContextType = {
    language: Language;
    setLanguage: (language: Language) => void;
    bn: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
    undefined
);

const LANGUAGE_STORAGE_KEY = "al-insaf-language";
const languageListeners = new Set<() => void>();
let activeLanguage: Language = "bn";

function getLanguageSnapshot(): Language {
    if (typeof window === "undefined") {
        return "bn";
    }

    try {
        const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage === "bn" || savedLanguage === "en") {
            activeLanguage = savedLanguage;
        }
    } catch (error) {
        console.warn("Could not read the saved language preference:", error);
    }

    return activeLanguage;
}

function subscribeToLanguage(listener: () => void) {
    languageListeners.add(listener);

    function handleStorageChange(event: StorageEvent) {
        if (event.key !== LANGUAGE_STORAGE_KEY && event.key !== null) {
            return;
        }

        activeLanguage = event.newValue === "en" ? "en" : "bn";
        languageListeners.forEach((subscriber) => subscriber());
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
        languageListeners.delete(listener);
        window.removeEventListener("storage", handleStorageChange);
    };
}

function getServerLanguageSnapshot(): Language {
    return "bn";
}

// বাংলা: নির্বাচিত ভাষার state ও translation সুবিধা child component-এ ভাগ করে।
export function LanguageProvider({ children }: { children: ReactNode }) {
    const language = useSyncExternalStore(
        subscribeToLanguage,
        getLanguageSnapshot,
        getServerLanguageSnapshot,
    );

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    function setLanguage(nextLanguage: Language) {
        activeLanguage = nextLanguage;
        try {
            window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        } catch (error) {
            console.warn("Could not save the language preference:", error);
        }
        languageListeners.forEach((listener) => listener());
    }

    return (
        <LanguageContext.Provider
            value={{ language, setLanguage, bn: language === "bn" }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

// বাংলা: component থেকে ভাষার state ও ভাষা পরিবর্তনের action ব্যবহার করতে দেয়।
export function useLanguage() {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error("useLanguage must be used inside LanguageProvider");
    }

    return context;
}