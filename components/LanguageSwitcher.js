'use client';

/**
 * components/LanguageSwitcher.js - Reusable language selector component
 */

import { useState, useRef, useEffect } from 'react';
import { useI18n, getEnabledLanguages, getLanguageInfo } from '@/lib/i18n';

export default function LanguageSwitcher({ variant = 'dropdown', showFlags = true, showNames = true, size = 'md' }) {
    const { language, changeLanguage, isRtl } = useI18n();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const languages = getEnabledLanguages();
    const currentLang = getLanguageInfo(language);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLanguageSelect = async (langCode) => {
        await changeLanguage(langCode);
        setIsOpen(false);
    };

    // Size classes
    const sizeClasses = {
        sm: {
            container: 'px-2 py-1 text-xs',
            flag: 'text-sm',
            chevron: 'w-3 h-3',
        },
        md: {
            container: 'px-3 py-1.5 text-sm',
            flag: 'text-base',
            chevron: 'w-4 h-4',
        },
        lg: {
            container: 'px-4 py-2 text-base',
            flag: 'text-lg',
            chevron: 'w-5 h-5',
        },
    };

    const sizes = sizeClasses[size] || sizeClasses.md;

    // Simple dropdown variant
    if (variant === 'dropdown') {
        return (
            <div ref={dropdownRef} className="relative inline-block" style={{ direction: 'ltr' }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
            inline-flex items-center gap-2 rounded-lg border border-gray-200 
            bg-white hover:bg-gray-50 hover:border-gray-300 
            transition-all duration-200 cursor-pointer
            ${sizes.container}
          `}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    aria-label="Select language"
                >
                    {showFlags && currentLang.flag && (
                        <span className={sizes.flag}>{currentLang.flag}</span>
                    )}
                    {showNames && (
                        <span className="font-medium text-gray-700">
                            {currentLang.nativeName}
                        </span>
                    )}
                    <svg
                        className={`${sizes.chevron} text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && (
                    <div
                        className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
                        style={{ direction: isRtl ? 'rtl' : 'ltr' }}
                    >
                        <div className="py-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageSelect(lang.code)}
                                    className={`
                    w-full px-3 py-2 text-left flex items-center gap-2
                    hover:bg-gray-50 transition-colors duration-150
                    ${lang.code === language ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}
                  `}
                                >
                                    {showFlags && lang.flag && (
                                        <span className="text-base">{lang.flag}</span>
                                    )}
                                    <span className="flex-1">{lang.nativeName}</span>
                                    {lang.code === language && (
                                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Icon-only variant (for compact spaces)
    if (variant === 'icon') {
        return (
            <div ref={dropdownRef} className="relative inline-block" style={{ direction: 'ltr' }}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                    aria-label="Select language"
                >
                    <span className="text-xl">{currentLang.flag}</span>
                </button>

                {isOpen && (
                    <div
                        className="absolute right-0 mt-2 w-36 rounded-lg border border-gray-200 bg-white shadow-lg z-50"
                        style={{ direction: isRtl ? 'rtl' : 'ltr' }}
                    >
                        <div className="py-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleLanguageSelect(lang.code)}
                                    className={`
                    w-full px-3 py-2 text-left flex items-center gap-2
                    hover:bg-gray-50 transition-colors duration-150
                    ${lang.code === language ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}
                  `}
                                >
                                    <span className="text-base">{lang.flag}</span>
                                    <span className="flex-1">{lang.nativeName}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Inline variant (shows all languages in a row)
    if (variant === 'inline') {
        return (
            <div className="flex items-center gap-1" style={{ direction: 'ltr' }}>
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code)}
                        className={`
              px-2 py-1 rounded-md text-sm transition-all duration-200
              ${lang.code === language
                                ? 'bg-blue-100 text-blue-700 font-semibold'
                                : 'text-gray-600 hover:bg-gray-100'
                            }
            `}
                        title={lang.name}
                    >
                        {showFlags && lang.flag}
                        {showNames && ` ${lang.nativeName}`}
                    </button>
                ))}
            </div>
        );
    }

    return null;
}

// Compact version for navbar
export function LanguageSwitcherCompact() {
    return <LanguageSwitcher variant="icon" />;
}

// Full version for settings page
export function LanguageSwitcherFull() {
    return <LanguageSwitcher variant="dropdown" size="lg" />;
}