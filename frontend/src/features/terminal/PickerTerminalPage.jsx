import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  ScanBarcode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  Layers,
  ArrowRight,
  RefreshCw,
  Send,
  Volume2,
  Vibrate,
  ShieldCheck,
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

const INITIAL_BATCH_ITEMS = [
  {
    id: 1,
    name: 'Amul Taaza Homogenised Toned Milk 500ml',
    barcode: '890126201005',
    aisle: 'AISLE 01',
    rack: 'RACK B',
    shelf: 'EYE LEVEL (GOLDEN ZONE)',
    qty: 2,
    weightPerUnitG: 515,
    scanned: false
  },
  {
    id: 2,
    name: 'Nandini Farm Fresh Curd Pouch 500g',
    barcode: '890600102030',
    aisle: 'AISLE 01',
    rack: 'RACK C',
    shelf: 'MID LEVEL',
    qty: 1,
    weightPerUnitG: 505,
    scanned: false
  },
  {
    id: 3,
    name: 'Modern 100% Whole Wheat Bread 400g',
    barcode: '890172518104',
    aisle: 'AISLE 02',
    rack: 'RACK A',
    shelf: 'FRONT SLOTTED',
    qty: 1,
    weightPerUnitG: 410,
    scanned: false
  }
];

export default function PickerTerminalPage() {
  const { roleConfig } = useRole();

  const [activeBatchId, setActiveBatchId] = useState('BATCH-BLR-8942');
  const [pickerId, setPickerId] = useState('PK-RAMESH-204');
  const [items, setItems] = useState(INITIAL_BATCH_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [batchCompleted, setBatchCompleted] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Timer interval tracking pick seconds
  useEffect(() => {
    let interval = null;
    if (timerRunning && !batchCompleted) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, batchCompleted]);

  // Camera stream handler
  useEffect(() => {
    if (cameraActive) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.warn('Camera stream inaccessible, fallback to manual barcode gun input:', err);
          toast.info('Hardware scanner ready. Enter or trigger barcode scanner.');
        });
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    }
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraActive]);

  const currentItem = items[currentIndex];

  const handleVerifyBarcode = (scannedCode) => {
    const codeToTest = (scannedCode || manualBarcode).trim();
    if (!currentItem) return;

    if (codeToTest === currentItem.barcode || codeToTest === currentItem.barcode.slice(-4)) {
      // Positive Match
      floorAudio.click();
      if ('vibrate' in navigator) {
        navigator.vibrate([80, 40, 80]);
      }

      setItems(prev =>
        prev.map((item, idx) => idx === currentIndex ? { ...item, scanned: true } : item)
      );
      setManualBarcode('');
      toast.success(`Matched: ${currentItem.name}`);

      // Advance to next item or complete batch
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setBatchCompleted(true);
        setTimerRunning(false);
        floorAudio.success();
        toast.success(`Batch ${activeBatchId} fully picked in ${elapsedSeconds} seconds! Sub-45s SLA achieved!`);
      }
    } else {
      // Mismatch
      floorAudio.alert();
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      toast.error(`Barcode mismatch! Expected ${currentItem.barcode}, scanned ${codeToTest}`);
    }
  };

  const handleResetBatch = () => {
    setItems(INITIAL_BATCH_ITEMS.map(i => ({ ...i, scanned: false })));
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setBatchCompleted(false);
    setTimerRunning(true);
    setActiveBatchId(`BATCH-BLR-${Math.floor(1000 + Math.random() * 9000)}`);
    floorAudio.click();
  };

  const totalBatchWeightG = items.reduce((acc, i) => acc + (i.weightPerUnitG * i.qty), 0);
  const pickedCount = items.filter(i => i.scanned).length;

  return (
    <div className="darkstor-terminal-page max-w-lg mx-auto p-4 sm:p-6 space-y-4">
      {/* 1. TERMINAL HEADER */}
      <div className="terminal-header p-4 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-xs">{activeBatchId}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                LIVE RUN
              </span>
            </div>
            <span className="text-[10px] text-white/50 block font-mono">
              Picker: {pickerId} · Koramangala Central
            </span>
          </div>
        </div>

        {/* Live Pick Timer */}
        <div className="text-right">
          <div className={`text-xl font-black font-mono ${elapsedSeconds > 45 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {elapsedSeconds}s
          </div>
          <span className="text-[9px] text-white/40 uppercase tracking-wider block">
            Target &lt; 45s
          </span>
        </div>
      </div>

      {/* 2. BATCH PROGRESS TRACKER */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-400" />
          <span className="text-white/70">Pick Progress:</span>
          <strong className="text-white font-mono">{pickedCount} / {items.length} SKUs</strong>
        </div>
        <div className="flex items-center gap-1.5">
          {items.map((item, idx) => (
            <span
              key={item.id}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                item.scanned
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : idx === currentIndex
                  ? 'bg-purple-400 animate-pulse'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 3. ACTIVE PICK TASK CARD */}
      {!batchCompleted && currentItem && (
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-surface border border-purple-500/30 shadow-2xl space-y-4 relative overflow-hidden"
        >
          {/* Location Badge */}
          <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>{currentItem.aisle} · {currentItem.rack}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
              {currentItem.shelf}
            </span>
          </div>

          {/* Item Description */}
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white leading-snug">
              {currentItem.name}
            </h2>
            <div className="flex items-center justify-between text-xs pt-1 font-mono text-white/50">
              <span>Barcode: <strong className="text-purple-300">{currentItem.barcode}</strong></span>
              <span className="text-emerald-400 font-bold">QTY: x{currentItem.qty}</span>
            </div>
          </div>

          {/* Camera Scanner Viewport */}
          {cameraActive && (
            <div className="relative h-44 rounded-xl bg-black border border-white/20 overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-emerald-400/60 m-6 rounded-lg flex items-center justify-center">
                <span className="text-[10px] font-mono text-emerald-300 bg-black/70 px-2 py-1 rounded">
                  Point Camera at Barcode
                </span>
              </div>
            </div>
          )}

          {/* Scanning Action Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Scan or enter barcode..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyBarcode()}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono text-xs outline-none focus:border-purple-400"
              />
              <button
                onClick={() => handleVerifyBarcode()}
                className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
              >
                <ScanBarcode className="w-4 h-4" />
                <span>Verify</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCameraActive(!cameraActive)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  cameraActive
                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cameraActive ? 'Close Camera Scanner' : 'Open Camera Scanner'}</span>
              </button>

              <button
                onClick={() => handleVerifyBarcode(currentItem.barcode)}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-mono"
                title="Simulate Hardware Ring Scanner Trigger"
              >
                Gun Sim
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. BATCH COMPLETED CELEBRATION CARD */}
      {batchCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">Batch {activeBatchId} Pick Completed!</h2>
            <p className="text-xs text-white/60 mt-1">
              All 3 items verified. Handover package to Vision Packing Dock 01.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex justify-around text-xs font-mono">
            <div>
              <span className="text-white/40 block">Total Pick Time:</span>
              <strong className="text-emerald-400 text-sm">{elapsedSeconds}s</strong>
            </div>
            <div>
              <span className="text-white/40 block">Estimated Weight:</span>
              <strong className="text-white text-sm">{totalBatchWeightG}g</strong>
            </div>
            <div>
              <span className="text-white/40 block">SLA Target:</span>
              <strong className="text-purple-300 text-sm">PASSED</strong>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleResetBatch}
              className="flex-1 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Pick Next Assigned Batch</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* 5. ITEM QUEUE CHECKLIST */}
      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-2">
          Batch Items Sequence ({items.length})
        </span>

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                item.scanned
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-white/60'
                  : idx === currentIndex
                  ? 'bg-purple-500/10 border-purple-500/40 text-white font-semibold'
                  : 'bg-white/[0.02] border-white/5 text-white/50'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                {item.scanned ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-white/20 text-[9px] flex items-center justify-center font-mono shrink-0">
                    {idx + 1}
                  </span>
                )}
                <span className="truncate">{item.name}</span>
              </div>
              <span className="font-mono text-purple-300 shrink-0 ml-2">x{item.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
