'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search, ShoppingCart, Wallet, FileText, Loader2, X, Tag } from 'lucide-react';
import dynamic from 'next/dynamic';
import DynamicPDFLink from '@/components/DynamicPDFLink';
const ExpensePDF = dynamic(() => import('./ExpensePDF').then(m => m.ExpensePDF), { ssr: false });
import { searchSuppliers, getVoteheads, recordExpenditure } from '@/lib/actions/ledger';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function ExpenseVoucher({ isOpen: forcedOpen, onClose, schoolName = 'Nexed Portal', inline = false }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = forcedOpen !== undefined ? forcedOpen : internalOpen;

  const setIsOpen = (val) => {
    if (!val && onClose) onClose();
    setInternalOpen(val);
  };

  const [query, setQuery] = useState('');
  const [suppliersList, setSuppliersList] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [voteheads, setVoteheads] = useState([]);
  const [selectedVotehead, setSelectedVotehead] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [desc, setDesc] = useState('');
  const [isPending, startTransition] = useTransition();
  const [voucherData, setVoucherData] = useState(null);

  // Hotkey CMD+J for Expenses
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen]);

  // Fetch Voteheads
  useEffect(() => {
    if (isOpen) {
      getVoteheads().then(setVoteheads);
    }
  }, [isOpen]);

  // Supplier Search
  useEffect(() => {
    if (query.length < 2) {
      setSuppliersList([]);
      return;
    }
    const delay = setTimeout(async () => {
      const res = await searchSuppliers(query);
      setSuppliersList(res);
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVotehead || !amount) return;

    startTransition(async () => {
      const res = await recordExpenditure({
        supplierId: selectedSupplier?.id || null,
        voteheadId: selectedVotehead.id,
        amount: parseFloat(amount),
        method,
        description: desc || `Expenditure for ${selectedVotehead.name}`,
        tenantId: 'paav-gitombo' // Mock tenant for now
      });

      if (res.success) {
        setVoucherData({
          schoolName,
          supplierName: selectedSupplier?.name || 'General Payee',
          voteheadName: selectedVotehead.name,
          amount: amount,
          method: method,
          reference: res.transaction.reference,
          description: desc || `Payment for ${selectedVotehead.name}`
        });
        setAmount('');
        setDesc('');
      } else {
        alert('Error: ' + res.error);
      }
    });
  };

  if (!isOpen && !inline) return null;
  if (inline && !isOpen) return null;

  const content = (
    <div style={{ flex: 1, overflowY: 'auto', padding: inline ? '20px 0' : '30px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Amount Section - Prominent */}
        <div style={{ background: '#F8FAFC', padding: 24, borderRadius: 16, border: '1.5px solid #E2E8F0' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748B', marginBottom: 10, textTransform: 'uppercase' }}>Voucher Amount (KES)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 24, fontWeight: 900, color: 'var(--navy)' }}>KSH</span>
            <input 
              type="number" 
              required
              placeholder="0.00"
              style={{ 
                width: '100%', border: 'none', background: 'transparent', paddingLeft: 60, 
                fontSize: 42, fontWeight: 900, color: 'var(--navy)', outline: 'none' 
              }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>

        {/* Votehead Selection */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Categorize Expenditure</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {voteheads.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVotehead(v)}
                className={`btn btn-sm ${selectedVotehead?.id === v.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 20, fontSize: 11, fontWeight: 700 }}
              >
                {v.name}
              </button>
            ))}
            {voteheads.length === 0 && <p style={{ fontSize: 11, color: 'var(--muted)' }}>No voteheads configured.</p>}
          </div>
        </div>

        {/* Payee / Supplier */}
        <div className="field">
          <label>Select Payee / Supplier</label>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} size={16} />
            <input 
              placeholder="Search registered suppliers..."
              style={{ paddingLeft: 40, background: '#F8FAFC' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {suppliersList.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#fff', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: 12, marginTop: 8, border: '1.5px solid #E2E8F0', overflow: 'hidden' }}>
                {suppliersList.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => { setSelectedSupplier(s); setQuery(''); setSuppliersList([]); }}
                    style={{ padding: '12px 16px', fontSize: 13, borderBottom: '1px solid #F1F5F9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    className="hover:bg-slate-50"
                  >
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>{s.category}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedSupplier && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #6ee7b7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={14} style={{ color: '#059669' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46' }}>{selectedSupplier.name}</span>
              </div>
              <button type="button" onClick={() => setSelectedSupplier(null)} style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Settlement Method</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { id: 'cash', label: 'Cash Payment', icon: '💵' },
              { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' }
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                style={{
                  padding: '15px', borderRadius: 12, border: '2px solid', 
                  borderColor: method === m.id ? 'var(--primary)' : '#E2E8F0',
                  background: method === m.id ? '#EFF6FF' : '#fff',
                  textAlign: 'center', cursor: 'pointer', transition: '0.2s'
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: method === m.id ? 'var(--primary)' : '#64748B' }}>{m.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Expenditure Purpose</label>
          <textarea 
            rows={3}
            placeholder="e.g. Purchase of science laboratory chemicals for Term 2..."
            style={{ background: '#F8FAFC' }}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        {voucherData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: 15, background: '#F0F9FF', borderRadius: 12, border: '1px solid #BAE6FD', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#0369A1', fontWeight: 700 }}>✅ Transaction Recorded Successfully</p>
              <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#0C4A6E' }}>Ref: {voucherData.reference}</p>
            </div>
            <DynamicPDFLink 
              document={<ExpensePDF data={voucherData} />} 
              fileName={`Voucher_${voucherData.reference}.pdf`}
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: 14, fontWeight: 800 }}
            >
              {({ loading }) => (loading ? <Loader2 className="animate-spin" /> : <>🖨️ Download PDF Voucher</>)}
            </DynamicPDFLink>
            <button type="button" className="btn btn-ghost" onClick={() => setVoucherData(null)}>Record Another</button>
          </div>
        ) : (
          <button 
            type="submit"
            disabled={isPending || !selectedVotehead || !amount}
            className="btn btn-primary"
            style={{ width: '100%', height: 52, background: 'var(--navy)', fontSize: 15, fontWeight: 800, boxShadow: '0 10px 20px rgba(15, 23, 42, 0.2)' }}
          >
            {isPending ? <Loader2 className="animate-spin" /> : "Authorize Expenditure"}
          </button>
        )}
      </form>
    </div>
  );

  if (inline) {
    return (
      <div className="panel animate-in" style={{ borderLeft: '4px solid var(--navy)', overflow: 'hidden' }}>
        <div className="panel-hdr" style={{ background: 'var(--navy)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet size={18} />
            <h3 style={{ color: '#fff', margin: 0 }}>Institutional Expenditure Voucher</h3>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}>✕ Close</button>
        </div>
        <div className="panel-body">
          {content}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm transition-all duration-300"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Side Panel (Drawer) */}
      <div 
        className={cn(
          "fixed right-0 top-0 bottom-0 z-[101] w-full max-w-[480px] bg-white shadow-2xl transition-transform duration-500 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ background: 'var(--navy)', color: '#fff', padding: '24px 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, background: 'rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={22} />
              </div>
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: 18 }}>Financial Command</h3>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Create Institutional Expenditure Voucher</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 20 }}>✕</button>
          </div>
        </div>

        {content}

        <div style={{ padding: '20px 30px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', textAlign: 'center' }}>
          <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>Press ESC to close · Institutional Ledger Core</p>
        </div>
      </div>

      <style jsx>{`
        .fixed { position: fixed; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .z-\[100\] { z-index: 100; }
        .z-\[101\] { z-index: 101; }
        .bg-slate-900\/40 { background-color: rgba(15, 23, 42, 0.4); }
        .backdrop-blur-sm { backdrop-filter: blur(4px); }
        .bg-white { background-color: #fff; }
        .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
        .translate-x-0 { transform: translateX(0); }
        .translate-x-full { transform: translateX(100%); }
        .transition-transform { transition-property: transform; }
        .duration-500 { transition-duration: 500ms; }
        .ease-out { transition-timing-function: cubic-bezier(0, 0, 0.2, 1); }
        .hover\:bg-slate-50:hover { background-color: #f8fafc; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
