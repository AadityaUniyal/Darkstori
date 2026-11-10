import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  UserCheck,
  Building,
  ArrowRight,
  RefreshCw,
  Lock,
  X,
  CreditCard,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

const RIDER_COD_SETTLEMENTS = [
  { id: 'RD-SURESH-08', name: 'Suresh Kumar', ordersCompleted: 14, cashDueInr: 2840, upiCollectedInr: 4120, cashDepositedInr: 2840, varianceInr: 0, status: 'SETTLED' },
  { id: 'RD-KUMAR-12', name: 'Kumar Swamy', ordersCompleted: 11, cashDueInr: 1950, upiCollectedInr: 3200, cashDepositedInr: 1950, varianceInr: 0, status: 'SETTLED' },
  { id: 'RD-VIKRAM-04', name: 'Vikram Singh', ordersCompleted: 16, cashDueInr: 3420, upiCollectedInr: 4890, cashDepositedInr: 3000, varianceInr: -420, status: 'PENDING_AUDIT' },
  { id: 'RD-ANAND-19', name: 'Anand Rao', ordersCompleted: 9, cashDueInr: 1480, upiCollectedInr: 2600, cashDepositedInr: 1480, varianceInr: 0, status: 'SETTLED' }
];

export default function CodVaultRegister() {
  const [settlements, setSettlements] = useState(() => {
    try {
      const saved = localStorage.getItem('darkstori_cod_settlements');
      return saved ? JSON.parse(saved) : RIDER_COD_SETTLEMENTS;
    } catch {
      return RIDER_COD_SETTLEMENTS;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('darkstori_cod_settlements', JSON.stringify(settlements));
    } catch {}
  }, [settlements]);
  const [vaultDepositModalOpen, setVaultDepositModalOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');

  const totalCashCollected = settlements.reduce((acc, r) => acc + r.cashDepositedInr, 0);
  const totalUpiCollected = settlements.reduce((acc, r) => acc + r.upiCollectedInr, 0);
  const totalDiscrepancy = settlements.reduce((acc, r) => acc + r.varianceInr, 0);

  const handleDepositToVault = (rider) => {
    floorAudio.playSuccessPick();
    setSelectedRider(rider);
    setDepositAmount(Math.abs(rider.cashDueInr - rider.cashDepositedInr).toString());
    setVaultDepositModalOpen(true);
  };

  const handleConfirmVaultDeposit = (e) => {
    e.preventDefault();
    const amount = parseInt(depositAmount, 10);
    if (isNaN(amount) || amount <= 0) return;

    floorAudio.playSuccessPick();
    toast.success(`₹${amount} deposited into Dark Store Safe Vault for ${selectedRider.name}!`);

    setSettlements(prev => prev.map(r => {
      if (r.id === selectedRider.id) {
        const newDeposited = r.cashDepositedInr + amount;
        return {
          ...r,
          cashDepositedInr: newDeposited,
          varianceInr: newDeposited - r.cashDueInr,
          status: newDeposited >= r.cashDueInr ? 'SETTLED' : 'PENDING_AUDIT'
        };
      }
      return r;
    }));

    setVaultDepositModalOpen(false);
  };

  return (
    <div className="darkstor-cod-vault space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Banknote className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Cash-on-Delivery (COD) & Vault Register
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                Fleet Commander & Dispatch Lead
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Rider Shift Cash Settlement & Vault Auditing
            </h2>
            <p className="text-xs text-white/60 max-w-2xl mt-1">
              Reconciles doorstep cash collections, digital UPI transaction UTRs, and safe vault deposits before riders checkout from their shifts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Vault Safe: LOCKED & SECURE</span>
            </span>
          </div>
        </div>
      </div>

      {/* Settlement Totals KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Total Vault Cash Deposited</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ₹{totalCashCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-white/40 mt-1 font-mono">Physical cash in hub safe</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Doorstep UPI Collections</span>
            <QrCode className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-400 font-mono">
            ₹{totalUpiCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-white/40 mt-1 font-mono">Dynamic QR at doorstep</div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Net Shift Variance Delta</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl font-black font-mono ${totalDiscrepancy < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {totalDiscrepancy === 0 ? '₹0 (100% Balanced)' : `-₹${Math.abs(totalDiscrepancy)}`}
          </div>
          <div className="text-[11px] text-white/40 mt-1 font-mono">
            {totalDiscrepancy < 0 ? '1 rider pending reconciliation' : 'All riders verified'}
          </div>
        </div>
      </div>

      {/* Rider Settlement Ledger Table */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Active Shift Rider Collections</span>
          </h3>
          <span className="text-xs text-white/40 font-mono">Indiranagar Pod 04 Shift #1</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40 font-mono">
                <th className="py-2.5 px-3">RIDER ID</th>
                <th className="py-2.5 px-3">COURIER NAME</th>
                <th className="py-2.5 px-3 text-center">DROPS</th>
                <th className="py-2.5 px-3 text-right">CASH DUE (₹)</th>
                <th className="py-2.5 px-3 text-right">UPI PAID (₹)</th>
                <th className="py-2.5 px-3 text-right">DEPOSITED (₹)</th>
                <th className="py-2.5 px-3 text-center">STATUS</th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {settlements.map(rider => (
                <tr key={rider.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono text-white/60">{rider.id}</td>
                  <td className="py-3 px-3 font-bold text-white">{rider.name}</td>
                  <td className="py-3 px-3 text-center font-mono text-white/80">{rider.ordersCompleted}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">₹{rider.cashDueInr}</td>
                  <td className="py-3 px-3 text-right font-mono text-sky-400">₹{rider.upiCollectedInr}</td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold">₹{rider.cashDepositedInr}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      rider.status === 'SETTLED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {rider.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {rider.varianceInr < 0 ? (
                      <button
                        onClick={() => handleDepositToVault(rider)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer mx-auto flex items-center gap-1"
                      >
                        <Banknote className="w-3 h-3 text-amber-400" />
                        <span>Settle ₹{Math.abs(rider.varianceInr)}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cleared</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vault Deposit Modal */}
      <AnimatePresence>
        {vaultDepositModalOpen && selectedRider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E131F] border border-emerald-500/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setVaultDepositModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Banknote className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Deposit to Store Safe Vault</h3>
                  <div className="text-xs text-emerald-400 font-mono">{selectedRider.name} ({selectedRider.id})</div>
                </div>
              </div>

              <form onSubmit={handleConfirmVaultDeposit} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs text-white/60 block mb-1">Cash Amount to Vault Deposit (INR)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-sm outline-none focus:border-emerald-400"
                    placeholder="Enter amount"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer transition-all shadow-md shadow-emerald-500/20"
                  >
                    Confirm Vault Safe Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setVaultDepositModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
