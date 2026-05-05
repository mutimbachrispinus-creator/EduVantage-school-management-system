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

export default function ExpenseVoucher({ isOpen: forcedOpen, onClose, schoolName = 'Nexed Portal' }) {
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

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        {/* Header */}
        <div className="modal-hdr" style={{ background: 'var(--navy)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 style={{ color: '#fff' }}>Expenditure Voucher</h3>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Record institutional spending and payouts</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="modal-close" style={{ color: '#fff' }}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* Left Column: Source & Payee */}
          <div>
            <div className="field">
              <label>Select Votehead</label>
              <div style={{ display: 'grid', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {voteheads.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVotehead(v)}
                    className={`tab-btn${selectedVotehead?.id === v.id ? ' on' : ''}`}
                    style={{ textAlign: 'left', border: '1.5px solid var(--border)', padding: '10px 14px' }}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginTop: 20 }}>
              <label>Payee / Supplier</label>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} size={16} />
                <input 
                  placeholder="Search supplier..."
                  style={{ paddingLeft: 34 }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {suppliersList.length > 0 && (
                  <div className="panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 5 }}>
                    <div className="panel-body" style={{ padding: 5 }}>
                      {suppliersList.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => { setSelectedSupplier(s); setQuery(''); setSuppliersList([]); }}
                          className="msg-item"
                          style={{ fontSize: 12, padding: '8px 12px' }}
                        >
                          {s.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {selectedSupplier && (
                <div className="note-box" style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><strong>Active Payee:</strong> {selectedSupplier.name}</span>
                  <button onClick={() => setSelectedSupplier(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Amount & Method */}
          <div style={{ opacity: selectedVotehead ? 1 : 0.3, pointerEvents: selectedVotehead ? 'auto' : 'none' }}>
            <div className="field">
              <label>Amount (KES)</label>
              <input 
                type="number" 
                required
                placeholder="0.00"
                style={{ fontSize: 22, fontWeight: 900, background: 'var(--navy)', color: '#fff', border: 'none' }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Payment Method</label>
              <div className="tabs">
                <button type="button" className={`tab-btn${method === 'cash' ? ' on' : ''}`} onClick={() => setMethod('cash')}>Cash</button>
                <button type="button" className={`tab-btn${method === 'bank_transfer' ? ' on' : ''}`} onClick={() => setMethod('bank_transfer')}>Bank</button>
              </div>
            </div>

            <div className="field">
              <label>Purpose</label>
              <textarea 
                rows={3}
                placeholder="Describe the expenditure..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            {voucherData ? (
              <DynamicPDFLink 
                document={<ExpensePDF data={voucherData} />} 
                fileName={`Voucher_${voucherData.reference}.pdf`}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                {({ loading }) => (loading ? <Loader2 className="animate-spin" /> : <>🖨️ Download Voucher</>)}
              </DynamicPDFLink>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isPending || !selectedVotehead || !amount}
                className="btn btn-primary"
                style={{ width: '100%', background: 'var(--navy)' }}
              >
                {isPending ? <Loader2 className="animate-spin" /> : "Record Expenditure"}
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Press ESC to close · Institutional Ledger Core</p>
        </div>
      </div>
    </div>
  );
}
