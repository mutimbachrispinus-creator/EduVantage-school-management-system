'use client';

/**
 * components/LanguageSwitcher.js - Reusable language selector component
 * Uses plain inline styles only — no Tailwind required.
 */

import { useState, useRef, useEffect } from 'react';
import { useI18n, getEnabledLanguages, getLanguageInfo } from '@/lib/i18n';

export default function LanguageSwitcher({ variant = 'dropdown', showFlags = true, showNames = true, size = 'md' }) {
  const { language, changeLanguage, isRtl } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const languages = getEnabledLanguages();
  const currentLang = getLanguageInfo(language);

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

  const sizeMap = {
    sm: { pad: '5px 10px', fontSize: 12, flagSize: 14 },
    md: { pad: '8px 14px', fontSize: 13, flagSize: 16 },
    lg: { pad: '10px 18px', fontSize: 15, flagSize: 18 },
  };
  const sz = sizeMap[size] || sizeMap.md;

  const triggerStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: sz.pad, borderRadius: 10,
    border: '1.5px solid var(--border, #E4EAF8)',
    background: '#fff', cursor: 'pointer',
    fontSize: sz.fontSize, fontWeight: 600,
    color: 'var(--navy, #0F172A)',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: 'inherit', whiteSpace: 'nowrap',
    outline: 'none',
  };

  const menuStyle = {
    position: 'absolute', right: 0, top: 'calc(100% + 6px)',
    background: '#fff', border: '1.5px solid var(--border, #E4EAF8)',
    borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    zIndex: 9999, minWidth: 175, overflow: 'hidden',
    direction: isRtl ? 'rtl' : 'ltr',
  };

  const optionBase = {
    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', border: 'none', textAlign: 'left',
    cursor: 'pointer', fontSize: 13, transition: 'background 0.12s',
    fontFamily: 'inherit',
  };

  // ── Dropdown / Full ──────────────────────────────────────────────────────
  if (variant === 'dropdown' || variant === 'full') {
    return (
      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', direction: 'ltr' }}>
        <button
          onClick={() => setIsOpen(o => !o)}
          style={triggerStyle}
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-label="Select language"
        >
          {showFlags && currentLang.flag && (
            <span style={{ fontSize: sz.flagSize }}>{currentLang.flag}</span>
          )}
          {showNames && <span>{currentLang.nativeName}</span>}
          <svg
            style={{ width: 11, height: 11, opacity: 0.45, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div style={menuStyle}>
            {languages.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  style={{
                    ...optionBase,
                    background: active ? '#EFF6FF' : 'transparent',
                    color: active ? '#2563EB' : '#0F172A',
                    fontWeight: active ? 700 : 500,
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFF'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  {showFlags && lang.flag && <span style={{ fontSize: 18 }}>{lang.flag}</span>}
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: active ? 700 : 600, fontSize: 13 }}>{lang.nativeName}</div>
                    <div style={{ fontSize: 11, opacity: 0.5 }}>{lang.name}</div>
                  </div>
                  {active && <span style={{ color: '#2563EB', fontSize: 14, lineHeight: 1 }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Icon only ────────────────────────────────────────────────────────────
  if (variant === 'icon') {
    return (
      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', direction: 'ltr' }}>
        <button
          onClick={() => setIsOpen(o => !o)}
          style={{
            padding: 8, borderRadius: 10, border: '1.5px solid var(--border, #E4EAF8)',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: 'none', fontFamily: 'inherit',
          }}
          aria-label="Select language"
        >
          <span style={{ fontSize: 20 }}>{currentLang.flag}</span>
        </button>
        {isOpen && (
          <div style={menuStyle}>
            {languages.map((lang) => {
              const active = lang.code === language;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageSelect(lang.code)}
                  style={{ ...optionBase, background: active ? '#EFF6FF' : 'transparent', color: active ? '#2563EB' : '#0F172A', fontWeight: active ? 700 : 500 }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFF'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 18 }}>{lang.flag}</span>
                  <span style={{ flex: 1 }}>{lang.nativeName}</span>
                  {active && <span style={{ color: '#2563EB' }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Inline pills ─────────────────────────────────────────────────────────
  if (variant === 'inline') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', direction: 'ltr' }}>
        {languages.map((lang) => {
          const active = lang.code === language;
          return (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              title={lang.name}
              style={{
                padding: '6px 12px', borderRadius: 8,
                border: `1.5px solid ${active ? '#2563EB' : 'var(--border, #E4EAF8)'}`,
                background: active ? '#EFF6FF' : 'transparent',
                color: active ? '#2563EB' : 'var(--muted, #64748B)',
                fontWeight: active ? 700 : 500,
                fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {showFlags && <span>{lang.flag}</span>}
              {showNames && <span>{lang.nativeName}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

/** Compact version for dark navbars */
export function LanguageSwitcherCompact({ dark = false }) {
  return (
    <div style={dark ? { filter: 'brightness(0) invert(1)', opacity: 0.85 } : undefined}>
      <LanguageSwitcher variant="icon" />
    </div>
  );
}

/** Full dropdown for settings page */
export function LanguageSwitcherFull() {
  return <LanguageSwitcher variant="dropdown" size="lg" />;
}