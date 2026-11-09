import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  ScanBarcode,
  PackageCheck,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  X,
  Plus,
  RefreshCw,
  Clock,
  Scale
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

const INBOUND_PURCHASE_ORDERS = [
  {
    id: 'PO-APMC-MANDI-8901',
    vendor: 'APMC Yeshwanthpur Mandi Direct',
    category: 'Fresh Produce & Vegetables',
    expectedCrates: 45,
    receivedCrates: 42,
    truckNumber: 'KA-04-E-9912',
    arrivedTime: '04:15 AM',
    status: 'IN_RECEIVING',
    tareLossPct: 4.2,
    items: [
      { id: 'SKU-TOM-01', name: 'Hybrid Tomatoes Grade A', expectedKg: 250, receivedKg: 238, lossReason: 'Moisture Evaporation / Mandi Tare', status: 'SHORT' },
      { id: 'SKU-POT-02', name: 'Indore Jyoti Potatoes 50kg Sacks', expectedKg: 500, receivedKg: 500, lossReason: 'None', status: 'MATCH' },
      { id: 'SKU-ONI-03', name: 'Nashik Red Onions Medium', expectedKg: 300, receivedKg: 285, lossReason: 'Sorting Sorting Discard Grade C', status: 'SHORT' }
    ]
  },
  {
    id: 'PO-AMUL-DAIRY-4412',
    vendor: 'Gujarat Co-operative Milk Marketing Fed (Amul)',
    category: 'Cold-Chain Dairy (2°C - 4°C)',
    expectedCrates: 80,
    receivedCrates: 80,
    truckNumber: 'KA-01-MJ-2024',
    arrivedTime: '05:00 AM',
    status: 'VERIFIED',
    tareLossPct: 0.0,
    items: [
      { id: 'SKU-AMUL-01', name: 'Amul Taaza Milk 500ml Crates', expectedKg: 800, receivedKg: 800, lossReason: 'None', status: 'MATCH' },
      { id: 'SKU-AMUL-02', name: 'Amul Salted Butter 100g Cartons', expectedKg: 120, receivedKg: 120, lossReason: 'None', status: 'MATCH' }
    ]
  },
  {
    id: 'PO-NESTLE-FMCG-9031',
    vendor: 'Nestlé India Regional Distribution Center',
    category: 'Dry Ambient FMCG & Snacks',
    expectedCrates: 60,
    receivedCrates: 58,
    truckNumber: 'MH-12-Q-5541',
    arrivedTime: '05:45 AM',
    status: 'IN_RECEIVING',
    tareLossPct: 1.5,
    items: [
      { id: 'SKU-MAGGI-01', name: 'Maggi 2-Minute Noodles 70g (Pack of 24)', expectedKg: 180, receivedKg: 174, lossReason: '2 cartons water-damaged in transit', status: 'DAMAGED' },
      { id: 'SKU-KITKAT-02', name: 'KitKat 4-Finger 38.5g Display Box', expectedKg: 65, receivedKg: 65, lossReason: 'None', status: 'MATCH' }
    ]
  }
];

export default function InboundDockView() {
  const { roleConfig } = useRole();
  const [purchaseOrders, setPurchaseOrders] = useState(INBOUND_PURCHASE_ORDERS);
  const [selectedPoId, setSelectedPoId] = useState('PO-APMC-MANDI-8901');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [debitNoteModalOpen, setDebitNoteModalOpen] = useState(false);
  const [generatedDebitNote, setGeneratedDebitNote] = useState(null);

  const activePo = purchaseOrders.find(po => po.id === selectedPoId) || purchaseOrders[0];

  const handleScanCrate = (e) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;

    floorAudio.playSuccessPick();
    toast.success(`Crate barcode ${scannedBarcode} registered for ${activePo.id}!`);
    setScannedBarcode('');

    setPurchaseOrders(prev => prev.map(po => {
      if (po.id === activePo.id && po.receivedCrates < po.expectedCrates) {
        const newCount = po.receivedCrates + 1;
        return {
          ...po,
          receivedCrates: newCount,
          status: newCount === po.expectedCrates ? 'VERIFIED' : 'IN_RECEIVING'
        };
      }
      return po;
    }));
  };

  const handleGenerateDebitNote = (item) => {
    floorAudio.playErrorMismatch();
    const noteId = `DBN-VND-${Math.floor(100000 + Math.random() * 900000)}`;
    const shortKg = item.expectedKg - item.receivedKg;
    const estimatedLossInr = shortKg * 42; // ₹42/kg average

    setGeneratedDebitNote({
      id: noteId,
      poId: activePo.id,
      vendor: activePo.vendor,
      sku: item.name,
      shortKg,
      lossInr: estimatedLossInr,
      reason: item.lossReason,
      date: new Date().toLocaleDateString('en-IN')
    });
    setDebitNoteModalOpen(true);
  };

  return (
    <div className="darkstor-inbound-dock space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Truck className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Inbound Receiving Dock (GRN)
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                Store GM & Dock Lead
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Dock Receiving, Crate Scanning & Vendor Debit Notes
            </h2>
            <p className="text-xs text-white/60 max-w-2xl mt-1">
              Reconciles arriving 4:00 AM wholesale trucks, checks APMC mandi produce tare losses, and issues instant debit notes for in-transit damages.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={handleScanCrate} className="flex gap-2">
              <input
                type="text"
                placeholder="Scan Crate Barcode..."
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-indigo-400 w-48 font-mono"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/10"
              >
                <ScanBarcode className="w-3.5 h-3.5" />
                <span>Receive</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* PO Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {purchaseOrders.map(po => {
          const isSelected = po.id === activePo.id;
          const progress = Math.round((po.receivedCrates / po.expectedCrates) * 100);
          return (
            <div
              key={po.id}
              onClick={() => setSelectedPoId(po.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span className="font-mono text-white/80">{po.id}</span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                  po.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {po.status}
                </span>
              </div>
              <div className="text-sm font-bold text-white truncate">{po.vendor}</div>
              <div className="text-xs text-white/40 mt-1 flex items-center justify-between">
                <span>Truck: {po.truckNumber}</span>
                <span>Arr: {po.arrivedTime}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[11px] font-mono text-white/60 mb-1">
                  <span>Crates: {po.receivedCrates}/{po.expectedCrates}</span>
                  <span className="text-indigo-300 font-bold">{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active PO Details Table */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>{activePo.vendor}</span>
            </h3>
            <div className="text-xs text-white/50 font-mono mt-0.5">
              Category: {activePo.category} · Tare Loss Recorded: {activePo.tareLossPct}%
            </div>
          </div>

          <div className="text-xs text-right font-mono">
            <span className="text-white/40">Vehicle Gate In:</span>
            <span className="text-emerald-400 font-bold ml-1.5">{activePo.truckNumber}</span>
          </div>
        </div>

        {/* Line Items Breakdown */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40 font-mono">
                <th className="py-2.5 px-3">SKU CODE</th>
                <th className="py-2.5 px-3">PRODUCT DESCRIPTION</th>
                <th className="py-2.5 px-3 text-right">EXPECTED (KG)</th>
                <th className="py-2.5 px-3 text-right">RECEIVED (KG)</th>
                <th className="py-2.5 px-3">VARIANCE REASON</th>
                <th className="py-2.5 px-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activePo.items.map(item => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono text-white/60">{item.id}</td>
                  <td className="py-3 px-3 font-medium text-white">{item.name}</td>
                  <td className="py-3 px-3 text-right font-mono text-white/80">{item.expectedKg} kg</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    <span className={item.receivedKg < item.expectedKg ? 'text-amber-400' : 'text-emerald-400'}>
                      {item.receivedKg} kg
                    </span>
                  </td>
                  <td className="py-3 px-3 text-white/60">{item.lossReason}</td>
                  <td className="py-3 px-3 text-center">
                    {item.receivedKg < item.expectedKg ? (
                      <button
                        onClick={() => handleGenerateDebitNote(item)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all cursor-pointer flex items-center gap-1 mx-auto"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>Issue Debit Note</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified OK</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debit Note Modal */}
      <AnimatePresence>
        {debitNoteModalOpen && generatedDebitNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0E131F] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl relative space-y-4"
            >
              <button
                onClick={() => setDebitNoteModalOpen(false)}
                className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <FileText className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">Vendor Debit Note Issued</h3>
                  <div className="text-xs text-rose-400 font-mono">{generatedDebitNote.id}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs font-mono text-white/80">
                <div className="flex justify-between">
                  <span className="text-white/50">VENDOR:</span>
                  <span className="text-white font-bold">{generatedDebitNote.vendor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">PO REFERENCE:</span>
                  <span className="text-white">{generatedDebitNote.poId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">DISCREPANCY:</span>
                  <span className="text-amber-400 font-bold">{generatedDebitNote.shortKg} kg Shortfall</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">REASON:</span>
                  <span className="text-white/80">{generatedDebitNote.reason}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-white/50">DEDUCTION AMOUNT:</span>
                  <span className="text-rose-400 font-bold text-sm">₹{generatedDebitNote.lossInr.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    toast.success(`Debit Note ${generatedDebitNote.id} dispatched to vendor ERP via webhook!`);
                    setDebitNoteModalOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Transmit to Vendor ERP</span>
                </button>
                <button
                  onClick={() => setDebitNoteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
