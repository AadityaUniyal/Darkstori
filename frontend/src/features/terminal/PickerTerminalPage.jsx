import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  Compass,
  Radio
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import { toast } from 'sonner';
import { floorAudio } from '../../utils/floorAudio';

const INITIAL_WAVE_ITEMS = [
  {
    id: 1,
    name: 'Amul Taaza Homogenised Toned Milk 500ml',
    barcode: '890126201005',
    aisle: 'AISLE 01',
    rack: 'RACK B2',
    shelf: 'EYE LEVEL (GOLDEN ZONE)',
    qty: 2,
    weightPerUnitG: 515,
    scanned: false,
    toteAllocations: [
      { tote: 'TOTE 1 (AZURE)', orderId: 'ORD-8812', units: 1, color: 'border-sky-500 bg-sky-500/10 text-sky-300' },
      { tote: 'TOTE 2 (AMBER)', orderId: 'ORD-8815', units: 1, color: 'border-amber-500 bg-amber-500/10 text-amber-300' }
    ]
  },
  {
    id: 2,
    name: 'Nandini Farm Fresh Curd Pouch 500g',
    barcode: '890600102030',
    aisle: 'AISLE 01',
    rack: 'RACK C4',
    shelf: 'MID LEVEL',
    qty: 1,
    weightPerUnitG: 505,
    scanned: false,
    toteAllocations: [
      { tote: 'TOTE 1 (AZURE)', orderId: 'ORD-8812', units: 1, color: 'border-sky-500 bg-sky-500/10 text-sky-300' }
    ]
  },
  {
    id: 3,
    name: 'Modern 100% Whole Wheat Bread 400g',
    barcode: '890172518104',
    aisle: 'AISLE 02',
    rack: 'RACK A1',
    shelf: 'FRONT SLOTTED',
    qty: 1,
    weightPerUnitG: 410,
    scanned: false,
    toteAllocations: [
      { tote: 'TOTE 3 (EMERALD)', orderId: 'ORD-8819', units: 1, color: 'border-emerald-500 bg-emerald-500/10 text-emerald-300' }
    ]
  },
  {
    id: 4,
    name: 'Amul Salted Table Butter 100g',
    barcode: '890126202008',
    aisle: 'COLD VAULT',
    rack: 'RACK V1',
    shelf: 'CHILLED ZONE 4°C',
    qty: 1,
    weightPerUnitG: 105,
    scanned: false,
    toteAllocations: [
      { tote: 'TOTE 2 (AMBER)', orderId: 'ORD-8815', units: 1, color: 'border-amber-500 bg-amber-500/10 text-amber-300' }
    ]
  }
];

export default function PickerTerminalPage() {
  const { roleConfig } = useRole();

  const [activeBatchId, setActiveBatchId] = useState('WAVE-BLR-8942');
  const [pickerId, setPickerId] = useState('PK-RAMESH-204');
  const [items, setItems] = useState(INITIAL_WAVE_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);
  const [batchCompleted, setBatchCompleted] = useState(false);

  // Advanced Tech States: Hands-free Voice, Native BarcodeDetector, Offline-First PWA
  const [voiceControlActive, setVoiceControlActive] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [is2OptOptimized, setIs2OptOptimized] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const barcodeScanIntervalRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check if 2-Opt dispatch route sequence exists from Floor Plan
  useEffect(() => {
    try {
      const savedRoute = localStorage.getItem('darkstori_optimized_pick_sequence');
      if (savedRoute) {
        setIs2OptOptimized(true);
      }
    } catch {}
  }, []);

  // Network Offline / Online Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      try {
        const queue = JSON.parse(localStorage.getItem('darkstori_offline_pick_queue') || '[]');
        if (queue.length > 0) {
          toast.success(`Network reconnected! Synced ${queue.length} offline picks with Central WMS.`);
          localStorage.removeItem('darkstori_offline_pick_queue');
          setOfflineQueueCount(0);
        }
      } catch {}
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Network connection lost! Entering Offline-First PWA buffer mode.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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

  const currentItem = items[currentIndex];

  // Text-To-Speech audio guidance
  const speakVoicePrompt = useCallback((text) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Announce next pick when item changes
  useEffect(() => {
    if (currentItem && !batchCompleted && voiceControlActive) {
      speakVoicePrompt(`Next pick: ${currentItem.name} in ${currentItem.aisle}, rack ${currentItem.rack}`);
    }
  }, [currentIndex, currentItem, batchCompleted, voiceControlActive, speakVoicePrompt]);

  // Barcode Verification Handler
  const handleVerifyBarcode = useCallback((scannedCode) => {
    const codeToTest = (scannedCode || manualBarcode).trim();
    if (!currentItem) return;

    if (codeToTest === currentItem.barcode || codeToTest === currentItem.barcode.slice(-4)) {
      // Positive Match
      floorAudio.playSuccessPick();

      // If offline, buffer into localStorage queue
      if (!isOnline) {
        try {
          const queue = JSON.parse(localStorage.getItem('darkstori_offline_pick_queue') || '[]');
          queue.push({
            batchId: activeBatchId,
            skuId: currentItem.id,
            barcode: currentItem.barcode,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem('darkstori_offline_pick_queue', JSON.stringify(queue));
          setOfflineQueueCount(queue.length);
        } catch {}
      }

      setItems(prev =>
        prev.map((item, idx) => idx === currentIndex ? { ...item, scanned: true } : item)
      );
      setManualBarcode('');
      toast.success(`Matched: ${currentItem.name}! Deposit into assigned tote.`);

      if (voiceControlActive) {
        speakVoicePrompt(`Matched. Put in ${currentItem.toteAllocations[0].tote}.`);
      }

      // Advance to next item or complete batch
      if (currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setBatchCompleted(true);
        setTimerRunning(false);
        floorAudio.playSuccessPick();
        toast.success(`Wave ${activeBatchId} fully picked in ${elapsedSeconds}s! SLA achieved!`);
        if (voiceControlActive) {
          speakVoicePrompt(`Wave pick completed in ${elapsedSeconds} seconds. Great job.`);
        }
      }
    } else {
      // Mismatch
      floorAudio.playErrorMismatch();
      toast.error(`Barcode mismatch! Expected ${currentItem.barcode}, got ${codeToTest}`);
      if (voiceControlActive) {
        speakVoicePrompt(`Barcode mismatch. Please check rack.`);
      }
    }
  }, [currentItem, manualBarcode, isOnline, activeBatchId, currentIndex, items.length, voiceControlActive, speakVoicePrompt, elapsedSeconds]);

  // Native BarcodeDetector API continuous frame scan
  useEffect(() => {
    if (cameraActive && videoRef.current && typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'qr_code', 'code_128', 'upc_a']
        });

        barcodeScanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const detectedVal = barcodes[0].rawValue;
                handleVerifyBarcode(detectedVal);
              }
            } catch {}
          }
        }, 300);
      } catch (e) {
        console.warn('BarcodeDetector initialisation skipped:', e);
      }
    }

    return () => {
      if (barcodeScanIntervalRef.current) {
        clearInterval(barcodeScanIntervalRef.current);
      }
    };
  }, [cameraActive, handleVerifyBarcode]);

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
          console.warn('Camera stream inaccessible, fallback to manual barcode input:', err);
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

  // Hands-free Web Speech Voice Control Handler
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (voiceControlActive && SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
          setLastVoiceCommand(transcript);

          if (transcript.includes('scan') || transcript.includes('confirm') || transcript.includes('pick') || transcript.includes('match')) {
            if (currentItem) handleVerifyBarcode(currentItem.barcode);
          } else if (transcript.includes('skip') || transcript.includes('next')) {
            if (currentIndex < items.length - 1) {
              setCurrentIndex(prev => prev + 1);
              floorAudio.click();
              toast.info('Skipped to next SKU.');
            }
          } else if (transcript.includes('reset') || transcript.includes('restart')) {
            handleResetBatch();
          } else if (transcript.includes('damage') || transcript.includes('damaged')) {
            floorAudio.playErrorMismatch();
            toast.warning(`Damage flagged on ${currentItem?.name}. Incident logged.`);
            speakVoicePrompt('Damage reported. Please set unit aside.');
          }
        };

        recognition.onerror = () => {};
        recognition.onend = () => {
          // Keep listening while voiceControlActive
          if (voiceControlActive) {
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
        toast.success('Hands-free voice operator enabled! Speak: "Scan", "Skip", or "Damage"');
        speakVoicePrompt('Voice assistant active. Hands-free commands ready.');
      } catch (err) {
        console.warn('SpeechRecognition failed to start:', err);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [voiceControlActive, currentItem, currentIndex, items.length, handleVerifyBarcode, speakVoicePrompt]);

  const handleResetBatch = () => {
    setItems(INITIAL_WAVE_ITEMS.map(i => ({ ...i, scanned: false })));
    setCurrentIndex(0);
    setElapsedSeconds(0);
    setBatchCompleted(false);
    setTimerRunning(true);
    setActiveBatchId(`WAVE-BLR-${Math.floor(1000 + Math.random() * 9000)}`);
    floorAudio.playSuccessPick();
  };

  const pickedCount = items.filter(i => i.scanned).length;

  return (
    <div className="darkstor-terminal-page max-w-lg mx-auto p-3 sm:p-5 space-y-4">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400" />
            <span>OFFLINE PWA MODE: {offlineQueueCount} scans queued in local buffer</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40">BUFFERED</span>
        </motion.div>
      )}

      {/* 1. TERMINAL HEADER */}
      <div className="terminal-header p-4 rounded-2xl bg-black/70 border border-white/10 backdrop-blur-xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-xs">{activeBatchId}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                MULTI-ORDER WAVE
              </span>
              {is2OptOptimized && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Compass className="w-2.5 h-2.5" />
                  2-OPT TSP
                </span>
              )}
            </div>
            <span className="text-[10px] text-white/50 block font-mono">
              Picker: {pickerId} · Indiranagar Pod 04
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

      {/* Advanced Capabilities Quick Bar: Voice Assistant & Camera */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            setVoiceControlActive(!voiceControlActive);
            floorAudio.click();
          }}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            voiceControlActive
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
              : 'bg-white/[0.02] text-white/60 border-white/10 hover:bg-white/[0.05]'
          }`}
        >
          {voiceControlActive ? (
            <>
              <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Voice Operator: ON</span>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4" />
              <span>Enable Hands-Free Voice</span>
            </>
          )}
        </button>

        <button
          onClick={() => {
            setCameraActive(!cameraActive);
            floorAudio.click();
          }}
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            cameraActive
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-white/[0.02] text-white/60 border-white/10 hover:bg-white/[0.05]'
          }`}
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>{cameraActive ? 'Close Camera Scanner' : 'Device Camera Scanner'}</span>
        </button>
      </div>

      {/* Voice Status Pill */}
      {voiceControlActive && lastVoiceCommand && (
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono">
            <Radio className="w-3 h-3 text-purple-400 animate-ping" />
            Heard: "{lastVoiceCommand}"
          </span>
          <span className="text-[10px] text-white/40">Say "Scan" to verify</span>
        </div>
      )}

      {/* 2. BATCH PROGRESS TRACKER */}
      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-purple-400" />
          <span className="text-white/70">Wave Pick Progress:</span>
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
          className="p-5 rounded-2xl bg-[#0E131F] border border-purple-500/30 shadow-2xl space-y-4 relative overflow-hidden"
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
              <span className="text-emerald-400 font-bold">TOTAL QTY: x{currentItem.qty}</span>
            </div>
          </div>

          {/* Color-Coded Multi-Order Tote Allocation */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
              Tote Drop Allocation (Wave Batching):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentItem.toteAllocations.map((alloc, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-center justify-between ${alloc.color}`}
                >
                  <div>
                    <div className="text-xs font-bold font-mono">{alloc.tote}</div>
                    <div className="text-[10px] opacity-75 font-mono">{alloc.orderId}</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-black/40 font-mono font-bold text-xs">
                    PUT x{alloc.units}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Camera Scanner Viewport with Live Barcode Detection */}
          {cameraActive && (
            <div className="relative h-48 rounded-xl bg-black border border-white/20 overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-emerald-400/70 m-6 rounded-lg flex items-center justify-center">
                <span className="text-[10px] font-mono text-emerald-300 bg-black/80 px-2.5 py-1 rounded-md border border-emerald-500/30">
                  Live Barcode Detection Active
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
                className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ScanBarcode className="w-4 h-4" />
                <span>Verify</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleVerifyBarcode(currentItem.barcode)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Simulate quick scan gun trigger"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Gun Scan Match</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. WAVE BATCH COMPLETED VIEW */}
      {batchCompleted && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Wave Pick Complete!</h3>
            <p className="text-xs text-emerald-300 mt-1 font-mono">
              Completed in {elapsedSeconds} seconds · Transfer totes to Packing Station 01
            </p>
          </div>
          <button
            onClick={handleResetBatch}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black inline-flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Next Wave Batch</span>
          </button>
        </motion.div>
      )}
    </div>
  );
}