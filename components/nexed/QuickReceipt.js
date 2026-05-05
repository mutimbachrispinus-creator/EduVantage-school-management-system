'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search, CreditCard, Banknote, FileText, Loader2, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import DynamicPDFLink from '@/components/DynamicPDFLink';
const ReceiptPDF = dynamic(() => import('./ReceiptPDF').then(m => m.ReceiptPDF), { ssr: false });
import { searchStudents, recordManualPayment } from '@/lib/actions/ledger';
import { initiateSTKPush } from '@/lib/actions/daraja';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function QuickReceipt({ isOpen: forcedOpen, onClose, schoolName = 'Nexed Portal' }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = forcedOpen !== undefined ? forcedOpen : internalOpen;

  const setIsOpen = (val) => {
    if (!val && onClose) onClose();
    setInternalOpen(val);
  };

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [desc, setDesc] = useState('');
  const [isPending, startTransition] = useTransition();
  const [receiptData, setReceiptData] = useState(null);

  // CMD+K Listener
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen]);

  // Search Logic
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      const res = await searchStudents(query);
      setResults(res);
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  const handleSTKPush = async () => {
    if (!selectedStudent || !amount) return;
    
    startTransition(async () => {
      const res = await initiateSTKPush({
        phoneNumber: selectedStudent.phone || '',
        amount: parseFloat(amount),
        accountReference: selectedStudent.adm,
        transactionDesc: desc || `Fees for ${selectedStudent.name}`
      });

      if (res.success) {
        alert('STK Push Sent! Please check the parent\'s phone.');
      } else {
        alert('STK Push Error: ' + res.error);
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !amount) return;

    startTransition(async () => {
      const res = await recordManualPayment({
        studentId: selectedStudent.id,
        amount: parseFloat(amount),
        method,
        description: desc || `Payment for ${selectedStudent.name}`,
        tenantId: selectedStudent.tenantId
      });

      if (res.success) {
        setReceiptData({
          schoolName,
          studentName: selectedStudent.name,
          adm: selectedStudent.adm,
          amount: amount,
          method: method,
          reference: res.transaction.reference,
          description: desc,
          newBalance: res.newBalance
        });
        // Reset form but keep receipt available
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
        <div className="modal-hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, background: 'var(--navy)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <FileText size={18} />
            </div>
            <div>
              <h3>Quick Receipt</h3>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Record a manual payment instantly</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="modal-close">✕</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          
          {/* Left Column: Search & Select */}
          <div>
            <div className="field">
              <label>Search Learner</label>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} size={16} />
                <input 
                  autoFocus
                  placeholder="Name or ADM..."
                  style={{ paddingLeft: 34 }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 15 }}>
              {results.map((s) => (
                <div
                  key={s.id}
                  onClick={() => { setSelectedStudent(s); setQuery(''); setResults([]); }}
                  className="msg-item"
                  style={{ 
                    border: selectedStudent?.id === s.id ? '2.5px solid var(--blue)' : '1.5px solid var(--border)',
                    marginBottom: 8,
                    padding: '10px 14px'
                  }}
                >
                  <div style={{ fontWeight: 800, color: 'var(--navy)' }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>ADM: {s.adm}</div>
                </div>
              ))}
              {query.length >= 2 && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontStyle: 'italic', fontSize: 12 }}>No learners found</div>
              )}
            </div>
          </div>

          {/* Right Column: Payment Form */}
          <div style={{ opacity: selectedStudent ? 1 : 0.3, pointerEvents: selectedStudent ? 'auto' : 'none' }}>
            {selectedStudent && (
              <div className="note-box" style={{ marginBottom: 20 }}>
                <strong>Paying For:</strong> {selectedStudent.name} (ADM: {selectedStudent.adm})
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Amount (KES)</label>
                <input 
                  type="number" 
                  required
                  step="0.01"
                  placeholder="0.00"
                  style={{ fontSize: 20, fontWeight: 900, color: 'var(--navy)' }}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Payment Method</label>
                <div className="tabs" style={{ marginBottom: 0 }}>
                  <button type="button" className={`tab-btn${method === 'cash' ? ' on' : ''}`} onClick={() => setMethod('cash')}>Cash</button>
                  <button type="button" className={`tab-btn${method === 'cheque' ? ' on' : ''}`} onClick={() => setMethod('cheque')}>Cheque</button>
                  <button type="button" className={`tab-btn${method === 'mpesa' ? ' on' : ''}`} onClick={() => setMethod('mpesa')}>M-Pesa</button>
                </div>
              </div>

              {method === 'mpesa' && (
                <button
                  type="button"
                  onClick={handleSTKPush}
                  disabled={isPending || !selectedStudent?.phone}
                  className="btn btn-teal"
                  style={{ width: '100%', marginBottom: 15 }}
                >
                  {isPending ? <Loader2 className="animate-spin" /> : <>📲 Send STK Push to {selectedStudent?.phone || 'Parent'}</>}
                </button>
              )}

              <div className="field">
                <label>Description</label>
                <input 
                  placeholder="e.g. Term 1 Fees"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {receiptData ? (
                <DynamicPDFLink 
                  document={<ReceiptPDF data={receiptData} />} 
                  fileName={`Receipt_${receiptData.reference}.pdf`}
                  className="btn btn-success"
                  style={{ width: '100%' }}
                >
                  {({ loading }) => (loading ? <Loader2 className="animate-spin" /> : <>🖨️ Download Receipt</>)}
                </DynamicPDFLink>
              ) : (
                <button 
                  type="submit" 
                  disabled={isPending || !selectedStudent || !amount}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {isPending ? <Loader2 className="animate-spin" /> : "Confirm Payment"}
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Press ESC to close · Powered by Nexed Financial Core</p>
        </div>
      </div>
    </div>
  );
}
