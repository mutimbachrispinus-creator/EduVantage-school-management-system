/**
 * lib/i18n/languages.js - Language definitions and metadata
 */

export const LANGUAGES = {
    en: {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        dir: 'ltr',
        flag: '🇬🇧',
        enabled: true,
    },
    fr: {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        dir: 'ltr',
        flag: '🇫🇷',
        enabled: true,
    },
    ar: {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        dir: 'rtl',
        flag: '🇸🇦',
        enabled: true,
    },
    sw: {
        code: 'sw',
        name: 'Kiswahili',
        nativeName: 'Kiswahili',
        dir: 'ltr',
        flag: '🇰🇪',
        enabled: true,
    },
};

export const DEFAULT_LANGUAGE = 'en';

export function getLanguageInfo(code) {
    return LANGUAGES[code] || LANGUAGES[DEFAULT_LANGUAGE];
}

export function isRTL(code) {
    return LANGUAGES[code]?.dir === 'rtl' || false;
}

export function getEnabledLanguages() {
    return Object.values(LANGUAGES).filter(lang => lang.enabled);
}