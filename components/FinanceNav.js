'use client';
import { usePathname, useRouter } from 'next/navigation';

const FINANCE_TABS = [
  { label: '💎 Finance Hub',    href: '/finance',              short: 'Hub' },
  { label: '💰 Fees & Payments',href: '/fees',                 short: 'Fees' },
  { label: '💳 Billing',        href: '/billing',              short: 'Billing' },
  { label: '🏛️ Fee Ledger',     href: '/nexed',                short: 'Nexed' },
  { label: '📊 Budgets',        href: '/finance/budgets',      short: 'Budgets' },
  { label: '💵 Petty Cash',     href: '/finance/petty-cash',   short: 'Petty Cash' },
  { label: '💸 Payroll',        href: '/finance/payroll',      short: 'Payroll' },
  { label: '📜 Transactions',   href: '/finance/transactions', short: 'Transactions' },
  { label: '🧾 Expenses',       href: '/finance/expenses',     short: 'Expenses' },
  { label: '🔁 Reconcile',      href: '/finance/reconcile',    short: 'Reconcile' },
];

export default function FinanceNav() {
  const router = useRouter();
  const path = usePathname() || '';

  return (
    <div style={{
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap',
      background: 'linear-gradient(135deg,#0F172A,#1E293B)',
      borderRadius: 14,
      padding: '10px 14px',
      marginBottom: 20,
      alignItems: 'center',
    }}>
      <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6, whiteSpace: 'nowrap' }}>
        💼 Finance
      </span>
      {FINANCE_TABS.map(tab => {
        const active = path === tab.href || path.startsWith(tab.href + '/');
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: active ? 800 : 600,
              background: active ? '#3B82F6' : 'rgba(255,255,255,0.08)',
              color: active ? '#fff' : '#CBD5E1',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
