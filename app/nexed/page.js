'use client';

export const runtime = 'edge';

import QuickReceipt from '@/components/nexed/QuickReceipt';
import ExpenseVoucher from '@/components/nexed/ExpenseVoucher';
import { useState } from 'react';

export default function NexedPage() {
  const [showReceipt, setShowReceipt] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  return (
    <div className="page on">
      <div className="page-hdr">
        <div>
          <h2>Nexed Financial Core</h2>
          <p>Institutional Ledger & Payment Gateway</p>
        </div>
        <div className="page-hdr-acts">
          <button 
            className="btn btn-ghost"
            onClick={() => setShowExpense(true)}
          >
            💸 New Expense <kbd className="desktop-only" style={{ marginLeft: 8, fontSize: 10, opacity: 0.5 }}>⌘J</kbd>
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowReceipt(true)}
          >
            🖨️ Quick Receipt <kbd className="desktop-only" style={{ marginLeft: 8, fontSize: 10, opacity: 0.5 }}>⌘K</kbd>
          </button>
        </div>
      </div>

      <div className="sg sg3">
        <div className="stat-card">
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: 'var(--green-bg)' }}>💰</div>
            <div>
              <div className="sc-n">KES 0.00</div>
              <div className="sc-l">Today's Collections</div>
              <div className="sc-sub" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}>↑ 0% vs yesterday</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: 'var(--blue-light)' }}>📲</div>
            <div>
              <div className="sc-n">100%</div>
              <div className="sc-l">M-Pesa Success</div>
              <div className="sc-sub" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>0 transactions today</div>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="sc-inner">
            <div className="sc-icon" style={{ background: 'var(--red-bg)' }}>🔍</div>
            <div>
              <div className="sc-n">0</div>
              <div className="sc-l">Pending Audit</div>
              <div className="sc-sub" style={{ background: 'var(--red-bg)', color: 'var(--red)' }}>Reconciliation Required</div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-hdr">
          <h3>🏛️ Financial Activity Ledger</h3>
        </div>
        <div className="panel-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 15 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--navy)' }}>Real-time Ledger Active</div>
          <p style={{ color: 'var(--muted)', maxWidth: 400, margin: '10px auto 0', fontSize: 13 }}>
            All financial events, including STK Pushes and manual receipts, will be recorded here with 100% audit accuracy.
          </p>
        </div>
      </div>

      <QuickReceipt isOpen={showReceipt} onClose={() => setShowReceipt(false)} />
      <ExpenseVoucher isOpen={showExpense} onClose={() => setShowExpense(false)} />
    </div>
  );
}
