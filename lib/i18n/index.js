'use client';

/**
 * lib/i18n/index.js - Main i18n configuration and utilities
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguageInfo, isRTL } from './languages';

// Import translation files
import enTranslations from './translations/en.json';

// Translation cache (pre-load English)
const translationCache = {
    en: enTranslations,
};

// Local storage key
const LANGUAGE_STORAGE_KEY = 'eduvantage_language';
const SCHOOL_LANGUAGE_KEY = 'school_default_language';

/**
 * Load translations for a specific language using dynamic imports
 */
export async function loadTranslations(lang) {
    if (translationCache[lang]) {
        return translationCache[lang];
    }

    try {
        let translations;
        switch (lang) {
            case 'fr':
                translations = (await import('./translations/fr.json')).default;
                break;
            case 'ar':
                translations = (await import('./translations/ar.json')).default;
                break;
            case 'sw':
                translations = (await import('./translations/sw.json')).default;
                break;
            default:
                translations = translationCache.en;
        }
        translationCache[lang] = translations;
        return translations;
    } catch (error) {
        console.error(`Error loading translations for ${lang}:`, error);
        return translationCache.en;
    }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current?.[key] !== undefined ? current[key] : undefined;
    }, obj);
}

/**
 * Format translation string with parameters
 */
function formatTranslation(text, params) {
    if (!params || typeof text !== 'string') return text;

    return text.replace(/\{(\w+)\}/g, (match, key) => {
        return params[key] !== undefined ? params[key] : match;
    });
}

/**
 * Create translation function
 */
function createTranslateFunction(translations, language) {
    return function t(key, params = {}) {
        if (!translations) return key;

        const value = getNestedValue(translations, key);

        if (value === undefined) {
            // Try fallback to English
            const englishValue = getNestedValue(translationCache.en, key);
            if (englishValue !== undefined) {
                return formatTranslation(englishValue, params);
            }
            // Return key as fallback
            return key;
        }

        return formatTranslation(value, params);
    };
}

/**
 * I18n Context
 */
const I18nContext = createContext(null);

/**
 * I18n Provider Component
 */
export function I18nProvider({ children, initialLanguage = null }) {
    const [language, setLanguageState] = useState(initialLanguage || DEFAULT_LANGUAGE);
    const [translations, setTranslations] = useState(translationCache.en);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize language from storage or props
    useEffect(() => {
        const initLanguage = async () => {
            let lang = initialLanguage;

            if (!lang) {
                // Try to get from localStorage
                lang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
            }

            if (!lang || !LANGUAGES[lang]) {
                lang = DEFAULT_LANGUAGE;
            }

            // Load translations
            setIsLoading(true);
            const loadedTranslations = await loadTranslations(lang);
            setTranslations(loadedTranslations);
            setLanguageState(lang);
            setIsLoading(false);

            // Apply RTL if needed
            applyDirection(lang);
        };

        initLanguage();
    }, [initialLanguage]);

    /**
     * Change language
     */
    const changeLanguage = useCallback(async (newLang) => {
        if (!LANGUAGES[newLang] || newLang === language) return;

        setIsLoading(true);

        // Load translations
        const loadedTranslations = await loadTranslations(newLang);
        setTranslations(loadedTranslations);
        setLanguageState(newLang);

        // Save to localStorage
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);

        // Apply RTL if needed
        applyDirection(newLang);

        setIsLoading(false);
    }, [language]);

    /**
     * Apply text direction to document
     */
    const applyDirection = useCallback((lang) => {
        const rtl = isRTL(lang);
        document.documentElement.dir = rtl ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;

        if (rtl) {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    }, []);

    /**
     * Translation function
     */
    const t = useMemo(() => createTranslateFunction(translations, language), [translations, language]);

    /**
     * Get current language info
     */
    const languageInfo = useMemo(() => getLanguageInfo(language), [language]);

    /**
     * Check if current language is RTL
     */
    const isRtl = useMemo(() => isRTL(language), [language]);

    const value = useMemo(() => ({
        language,
        languageInfo,
        isRtl,
        t,
        changeLanguage,
        isLoading,
        translations,
    }), [language, languageInfo, isRtl, t, changeLanguage, isLoading, translations]);

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    );
}

/**
 * Use i18n hook
 */
export function useI18n() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useI18n must be used within an I18nProvider');
    }
    return context;
}

/**
 * Translate hook (shorthand)
 */
export function useTranslation() {
    const { t, language, isRtl, languageInfo, changeLanguage } = useI18n();
    return { t, language, isRtl, languageInfo, changeLanguage };
}

/**
 * Get language from URL parameter
 */
export function getLanguageFromUrl() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('lang');
}

/**
 * Set language in URL parameter
 */
export function setLanguageInUrl(lang) {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    if (lang && lang !== DEFAULT_LANGUAGE) {
        url.searchParams.set('lang', lang);
    } else {
        url.searchParams.delete('lang');
    }
    window.history.replaceState({}, '', url.toString());
}

/**
 * Get school default language
 */
export async function getSchoolLanguage(tenantId) {
    try {
        const response = await fetch(`/api/saas/config?tenant=${tenantId}`);
        if (response.ok) {
            const data = await response.json();
            return data.profile?.language || data.defaultLanguage || DEFAULT_LANGUAGE;
        }
    } catch (error) {
        console.error('Error fetching school language:', error);
    }
    return DEFAULT_LANGUAGE;
}

/**
 * Set school default language (admin only)
 */
export async function setSchoolLanguage(tenantId, language) {
    try {
        const response = await fetch('/api/db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{
                    type: 'set',
                    key: 'paav_school_profile',
                    value: { language }
                }]
            })
        });
        return response.ok;
    } catch (error) {
        console.error('Error setting school language:', error);
    }
    return false;
}

// Export language utilities
export { LANGUAGES, DEFAULT_LANGUAGE, getLanguageInfo, isRTL };

// Export languages list
export { getEnabledLanguages } from './languages';