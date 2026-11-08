import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Scan, Eye, CheckCircle2, AlertTriangle, ShieldCheck, Scale,
  QrCode, RefreshCw, Volume2, Sparkles, ArrowRight, Zap, Check, X,
  Lock, ExternalLink, Play, Square, AlertOctagon, HelpCircle, Layers, Share2, Copy, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { floorAudio } from '../utils/floorAudio';
import OpticalNeuralLoader from '../components/OpticalNeuralLoader';
import ThermalLabelSticker from '../components/ThermalLabelSticker';

const BENCHMARK_ORDERS = [
  {
    orderId: "BLNK-8821",
    customerPincode: "560038 (Indiranagar)",
    items: [
      { name: "Fresh Hybrid Tomatoes 1kg", target_qty: 1, target_weight_grams: 500 },
      { name: "Fresh Coriander (Dhaniya) 100g", target_qty: 1, target_weight_grams: 100 },
      { name: "Amul Taaza Toned Milk 500ml", target_qty: 2, target_weight_grams: 1040 },
    ]
  },
  {
    orderId: "ZEPT-4109",
    customerPincode: "560008 (Ulsoor)",
    items: [
      { name: "Aashirvaad Shudh Chakki Atta 5kg", target_qty: 1, target_weight_grams: 5000 },
      { name: "Fortune Sunlite Sunflower Oil 1L", target_qty: 1, target_weight_grams: 910 },
      { name: "Tata Salt 1kg", target_qty: 1, target_weight_grams: 1000 },
    ]
  }
];

export default function VisionPackDock({ city = "Bangalore", activeStoreId = 1 }) {
  const [calibrating, setCalibrating] = useState(true);
  const [activeOrderIdx, setActiveOrderIdx] = useState(0);
  const [cameraMode, setCameraMode] = useState('simulation'); // 'live' | 'simulation'
  const [isInspecting, setIsInspecting] = useState(false);
  const [simulateDefect, setSimulateDefect] = useState(false);

  // Optical scan & scale state
  const [measuredWeight, setMeasuredWeight] = useState(1645);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [committedPassport, setCommittedPassport] = useState(null);
  const [isCommitting, setIsCommitting] = useState(false);

  // Customer dispute simulator
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeRecord, setDisputeRecord] = useState(null);
  const [thermalModalOpen, setThermalModalOpen] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const currentOrder = BENCHMARK_ORDERS[activeOrderIdx] || BENCHMARK_ORDERS[0];
  const targetWeight = currentOrder.items.reduce((acc, it) => acc + it.target_weight_grams, 0);

  // Live Camera Init
  useEffect(() => {
    if (cameraMode === 'live') {
      navigator.mediaDevices?.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        toast.success("Live optical camera stream linked to VisionPack AI");
      })
      .catch(err => {
        console.warn("Live camera unaccessible, defaulting to optical simulation:", err);
        setCameraMode('simulation');
        toast.info("Camera permission unavailable. Using high-resolution optical benchmark simulation.");
      });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraMode]);

  // Run initial automatic inspection on order select
  useEffect(() => {
    if (!calibrating) {
      handleTriggerOpticalScan();
    }
  }, [activeOrderIdx, calibrating, simulateDefect]);

  const handleTriggerOpticalScan = async () => {
    setIsInspecting(true);
    try {
      const res = await api.inspectPackingTote({
        order_id: currentOrder.orderId,
        store_id: activeStoreId || 1,
        station_code: "DOCK-OPTICAL-01",
        items: currentOrder.items,
        measured_weight_grams: measuredWeight,
        simulate_defect: simulateDefect,
      });

      setInspectionResult(res);

      if (res.overall_status === 'VERIFIED') {
        floorAudio.playSuccessPick();
      } else {
        floorAudio.playErrorMismatch();
        toast.warning("Visual Defect or Weight Discrepancy intercepted by VisionPack AI!");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Optical inspection request failed");
    } finally {
      setIsInspecting(false);
    }
  };

  const handleCommitPassport = async () => {
    if (!inspectionResult) return;
    setIsCommitting(true);
    try {
      const res = await api.commitPackingPassport({
        order_id: currentOrder.orderId,
        store_id: activeStoreId || 1,
        station_code: "DOCK-OPTICAL-01",
        detected_items: inspectionResult.detected_items,
        overall_freshness_score: inspectionResult.overall_freshness_score,
        detected_defects: inspectionResult.detected_defects,
        measured_weight_grams: measuredWeight,
        target_weight_grams: targetWeight,
        weight_tolerance_passed: inspectionResult.scale_metrics?.tolerance_passed ?? true,
        snapshot_image_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
        override_reason: inspectionResult.overall_status === 'FLAGGED_DEFECT' ? "Store GM Quality Override" : null
      });

      setCommittedPassport(res);
      setPassportModalOpen(true);
      floorAudio.playDispatchSuccess();
      toast.success(`Packing Passport ${res.passport_qr} sealed & committed to Neon Postgres!`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to commit passport to Neon database");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleOpenDisputeSimulator = async (qrCode) => {
    try {
      toast.info("Retrieving immutable proof-of-pack certificate from Neon...");
      const cert = await api.getPackingPassport(qrCode);
      setDisputeRecord(cert);
      setDisputeModalOpen(true);
    } catch (e) {
      toast.error("Dispute certificate lookup failed");
    }
  };

  if (calibrating) {
    return <OpticalNeuralLoader onComplete={() => setCalibrating(false)} durationMs={2000} />;
  }

  return (
    <div className="min-h-screen bg-[#02040A] text-white p-4 sm:p-6 lg:p-8 relative selection:bg-[#00F0FF]/30 select-none">
      {/* Background Cyber Shimmer Grid */}
      <div 
        className="fixed inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 240, 255, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 240, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Top Banner: Cyber-Optical Header & Neon Brand Identity */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#00F0FF]/20">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00F0FF]"></span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
              VISIONPACK <span className="text-[#00F0FF] text-shadow-[0_0_15px_#00F0FF]">AI™</span>
            </h1>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
              OPTICAL GATEKEEPER · NEON POSTGRES
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Hardware Optical Produce AI, Freshness Grading & Tamper-Evident Bagging Passport
          </p>
        </div>

        {/* Order Selector & Hardware Camera Switch */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-xl p-1">
            {BENCHMARK_ORDERS.map((ord, idx) => (
              <button
                key={ord.orderId}
                onClick={() => { setActiveOrderIdx(idx); setInspectionResult(null); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                  idx === activeOrderIdx
                    ? 'bg-[#00F0FF] text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {ord.orderId}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCameraMode(prev => prev === 'live' ? 'simulation' : 'live')}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-1.5 ${
              cameraMode === 'live'
                ? 'bg-[#10F98E]/20 text-[#10F98E] border-[#10F98E]/50 shadow-[0_0_15px_rgba(16,249,142,0.25)]'
                : 'bg-white/5 text-slate-300 border-white/10 hover:border-[#00F0FF]/40'
            }`}
          >
            <Camera size={14} />
            <span>{cameraMode === 'live' ? 'Live Camera' : 'Simulation Feed'}</span>
          </button>

          <button
            onClick={() => setCalibrating(true)}
            title="Recalibrate Optical Sensor"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-[#00F0FF]"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Main 3-Column Studio Grid */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        
        {/* Column 1: Optical Camera Viewport & HUD (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden border border-[#00F0FF]/40 bg-black/60 shadow-[0_0_25px_rgba(0,240,255,0.15)] aspect-[4/3] flex items-center justify-center">
            
            {/* Live Camera Video or Simulated Feed */}
            {cameraMode === 'live' ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full relative">
                <img
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80"
                  alt="Optical Tote Surface"
                  className="w-full h-full object-cover opacity-85 filter contrast-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
              </div>
            )}

            {/* Sweeping Laser Line */}
            <motion.div
              animate={{ y: ['-180%', '180%'] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent shadow-[0_0_15px_#00F0FF] pointer-events-none"
            />

            {/* HUD Corner Targeting Brackets */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-[#00F0FF] pointer-events-none" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-[#00F0FF] pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-[#00F0FF] pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-[#00F0FF] pointer-events-none" />

            {/* Live Detected Bounding Boxes */}
            {inspectionResult?.detected_items?.map((item, idx) => {
              const isDefective = item.status === 'FLAGGED_DEFECT';
              return (
                <div
                  key={idx}
                  style={{
                    left: `${item.bounding_box.x}px`,
                    top: `${item.bounding_box.y}px`,
                    width: `${item.bounding_box.width}px`,
                    height: `${item.bounding_box.height}px`,
                  }}
                  className={`absolute rounded-lg border-2 pointer-events-none transition-all flex flex-col justify-between p-1.5 ${
                    isDefective
                      ? 'border-[#FF0055] bg-[#FF0055]/15 shadow-[0_0_20px_rgba(255,0,85,0.4)]'
                      : 'border-[#10F98E] bg-[#10F98E]/10 shadow-[0_0_15px_rgba(16,249,142,0.3)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                      isDefective ? 'bg-[#FF0055] text-white' : 'bg-[#10F98E] text-black'
                    }`}>
                      {item.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-white bg-black/60 px-1 rounded">
                      {Math.round(item.freshness_score * 100)}%
                    </span>
                  </div>

                  <div className="text-[9px] font-mono text-white/90 bg-black/70 px-1 rounded truncate">
                    {isDefective ? 'BRUISED SKIN DEFECT' : 'FRESH GRADE-A'}
                  </div>
                </div>
              );
            })}

            {/* Bottom HUD Bar on Viewport */}
            <div className="absolute bottom-3 inset-x-3 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10F98E] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10F98E]"></span>
                </span>
                <span className="text-slate-300">FPS: <strong className="text-[#00F0FF]">{inspectionResult?.optical_fps || 59.2}</strong></span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">LATENCY: <strong className="text-[#10F98E]">{inspectionResult?.inference_latency_ms || 31}ms</strong></span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400">ORDER:</span>
                <span className="text-[#00F0FF] font-bold">{currentOrder.orderId}</span>
              </div>
            </div>
          </div>

          {/* Scale Weight Integration Bar */}
          <div className="p-4 rounded-xl bg-[#080E18] border border-[#00F0FF]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                <Scale size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">PACKING DOCK TARE SCALE</div>
                <div className="text-lg font-black font-mono text-white flex items-center gap-2">
                  <span>{measuredWeight}g</span>
                  <span className="text-xs font-normal text-slate-400">/ Target: {targetWeight}g</span>
                  {inspectionResult?.scale_metrics?.tolerance_passed ? (
                    <span className="text-[11px] font-bold text-[#10F98E] bg-[#10F98E]/15 px-2 py-0.5 rounded border border-[#10F98E]/30">
                      MATCH (±2.4%)
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#FF0055] bg-[#FF0055]/15 px-2 py-0.5 rounded border border-[#FF0055]/30">
                      DISCREPANCY
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Tare Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMeasuredWeight(targetWeight)}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 border border-white/10"
              >
                Auto-Tare
              </button>
              <button
                onClick={() => setSimulateDefect(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                  simulateDefect
                    ? 'bg-[#FF0055]/20 text-[#FF0055] border-[#FF0055]/50'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {simulateDefect ? 'Defect Active' : 'Test Defect Trigger'}
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Manifest & Verification Authority (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Status Verdict Header Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            inspectionResult?.overall_status === 'FLAGGED_DEFECT'
              ? 'bg-[#FF0055]/10 border-[#FF0055]/40 shadow-[0_0_20px_rgba(255,0,85,0.2)]'
              : 'bg-[#10F98E]/10 border-[#10F98E]/40 shadow-[0_0_20px_rgba(16,249,142,0.15)]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {inspectionResult?.overall_status === 'FLAGGED_DEFECT' ? (
                  <AlertOctagon size={22} className="text-[#FF0055]" />
                ) : (
                  <ShieldCheck size={22} className="text-[#10F98E]" />
                )}
                <div>
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                    OPTICAL INSPECTION VERDICT
                  </div>
                  <div className={`text-base font-black font-mono ${
                    inspectionResult?.overall_status === 'FLAGGED_DEFECT' ? 'text-[#FF0055]' : 'text-[#10F98E]'
                  }`}>
                    {inspectionResult?.overall_status === 'FLAGGED_DEFECT'
                      ? 'DEFECT INTERCEPTED · DO NOT SEAL'
                      : 'ALL ITEMS VERIFIED · READY TO SEAL'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-slate-400">FRESHNESS</div>
                <div className="text-xl font-black font-mono text-white">
                  {Math.round((inspectionResult?.overall_freshness_score || 0.95) * 100)}%
                </div>
              </div>
            </div>

            {/* Defect Alert Warning if Intercepted */}
            {inspectionResult?.detected_defects?.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-black/60 border border-[#FF0055]/40 text-xs space-y-1">
                {inspectionResult.detected_defects.map((def, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-200">
                    <AlertTriangle size={15} className="text-[#FF0055] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#FF0055] font-bold">{def.defect_type}:</strong> {def.recommended_action}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manifest Itemized Detection Checklist */}
          <div className="p-4 rounded-2xl bg-[#080E18] border border-white/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 pb-2 border-b border-white/10">
              <span>ORDER MANIFEST & OPTICAL RECOGNITION</span>
              <span>{inspectionResult?.detected_items?.length || 0} / {currentOrder.items.length} ITEMS</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {inspectionResult?.detected_items?.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    item.status === 'FLAGGED_DEFECT'
                      ? 'bg-[#FF0055]/10 border-[#FF0055]/30'
                      : 'bg-white/[0.03] border-white/5'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>{item.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">×{item.detected_qty}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Optical Confidence: <strong className="text-[#00F0FF]">{Math.round(item.optical_confidence * 100)}%</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      item.status === 'FLAGGED_DEFECT'
                        ? 'bg-[#FF0055]/20 text-[#FF0055] border border-[#FF0055]/40'
                        : 'bg-[#10F98E]/20 text-[#10F98E] border border-[#10F98E]/40'
                    }`}>
                      {Math.round(item.freshness_score * 100)}% FRESH
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Re-Inspect Scan Button */}
            <button
              onClick={handleTriggerOpticalScan}
              disabled={isInspecting}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-200 flex items-center justify-center gap-2 transition-all"
            >
              <Scan size={14} className={isInspecting ? 'animate-spin text-[#00F0FF]' : ''} />
              <span>{isInspecting ? 'Analyzing Frame...' : 'Re-Scan Table Contents'}</span>
            </button>
          </div>

          {/* Authorize Seal & Digital Passport Trigger */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00F0FF]/15 via-transparent to-[#10F98E]/10 border border-[#00F0FF]/30 space-y-3 shadow-lg">
            <div className="text-xs font-mono text-slate-300">
              <strong className="text-white block font-sans text-sm">Seal Bag & Commit Neon Passport</strong>
              Generates cryptographic proof-of-pack QR seal to eliminate customer refund dispute fraud.
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCommitPassport}
                disabled={isCommitting || !inspectionResult}
                className="flex-1 py-3 px-4 rounded-xl font-bold font-mono text-xs uppercase bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all"
              >
                <Lock size={15} />
                <span>{isCommitting ? 'Sealing...' : 'Authorize Seal & Passport'}</span>
              </button>
              <button
                type="button"
                onClick={() => setThermalModalOpen(true)}
                title="Print Physical 58mm Thermal Sticker"
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono text-xs flex items-center justify-center transition-all shrink-0"
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Cryptographic Packing Passport Certificate */}
      <AnimatePresence>
        {passportModalOpen && committedPassport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#050914] border border-[#00F0FF]/40 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.2)] p-6 text-white space-y-4"
            >
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display text-white">Digital Packing Passport</h3>
                    <p className="text-[11px] font-mono text-slate-400">Cryptographically Sealed in Neon PostgreSQL</p>
                  </div>
                </div>
                <button
                  onClick={() => setPassportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* QR Token & Proof Details */}
              <div className="p-4 rounded-xl bg-black/60 border border-[#00F0FF]/30 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>PASSPORT QR:</span>
                  <strong className="text-[#00F0FF] text-[11px]">{committedPassport.passport_qr}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>ORDER ID:</span>
                  <strong className="text-white">{committedPassport.order_id}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>SHA-256 PROOF:</span>
                  <span className="text-slate-400 text-[10px] truncate max-w-[200px]">{committedPassport.snapshot_hash}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>FRESHNESS GRADE:</span>
                  <strong className="text-[#10F98E]">{Math.round(committedPassport.overall_freshness_score * 100)}% Grade-A</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(`/verify/${committedPassport.passport_qr}`, '_blank')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-xs font-mono font-bold text-[#00F0FF] flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                  >
                    <ExternalLink size={14} />
                    <span>Open Public Dispute Portal ↗</span>
                  </button>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/verify/${committedPassport.passport_qr}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Public verification URL copied to clipboard");
                    }}
                    className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-mono font-bold text-white flex items-center gap-1.5"
                    title="Copy Public URL"
                  >
                    <Copy size={14} />
                    <span>Copy URL</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenDisputeSimulator(committedPassport.passport_qr)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 flex items-center justify-center gap-1.5"
                  >
                    <Eye size={13} />
                    <span>Inline Defense Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setThermalModalOpen(true)}
                    className="py-2 px-3 rounded-xl bg-white text-black hover:bg-slate-200 font-mono font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Printer size={14} />
                    <span>Print Thermal Sticker</span>
                  </button>
                  <button
                    onClick={() => setPassportModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-mono font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Customer Support Dispute Defense Simulator */}
      <AnimatePresence>
        {disputeModalOpen && disputeRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#080E18] border border-[#10F98E]/40 rounded-2xl shadow-2xl p-6 text-white space-y-4"
            >
              <div className="flex items-start justify-between pb-3 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-mono text-[#10F98E] font-bold uppercase">CUSTOMER DISPUTE DEFENSE PORTAL</span>
                  <h3 className="text-lg font-bold text-white">Immutable Proof-of-Bagging Snapshot</h3>
                </div>
                <button onClick={() => setDisputeModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video">
                <img
                  src={disputeRecord.snapshot_image_url}
                  alt="Verified Bagging Snapshot"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 font-mono text-[10px] text-[#10F98E] border border-[#10F98E]/40">
                  TIMESTAMP: {disputeRecord.sealed_at}
                </div>
              </div>

              <div className="p-3 bg-white/[0.03] rounded-xl border border-white/10 text-xs font-mono space-y-1">
                <div className="text-slate-300">Certificate Status: <strong className="text-[#10F98E]">{disputeRecord.verdict}</strong></div>
                <div className="text-slate-400 text-[11px]">Weight on Dispatch: {disputeRecord.measured_weight_grams}g (Certified)</div>
                <div className="text-slate-400 text-[11px]">Store: {disputeRecord.store_name} ({disputeRecord.city})</div>
              </div>

              <div className="text-right">
                <button
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-mono font-bold text-white"
                >
                  Close Defense View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 58mm / 80mm Physical Thermal Sticker Modal & Print Engine */}
      <ThermalLabelSticker
        isOpen={thermalModalOpen}
        onClose={() => setThermalModalOpen(false)}
        orderId={committedPassport?.order_id || currentOrder.orderId}
        passportQr={committedPassport?.passport_qr || `VPASS-IN-${currentOrder.orderId}-SAMPLE`}
        hubCode="BLR-INDIRANAGAR-04"
        pincode="560038"
        stationCode="DOCK-OPTICAL-01"
        packerId="PKR-04"
        measuredWeight={measuredWeight}
        targetWeight={targetWeight}
        freshnessScore={committedPassport?.overall_freshness_score || inspectionResult?.overall_freshness_score || 0.96}
        itemCount={currentOrder.items.length}
        snapshotHash={committedPassport?.snapshot_hash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
      />
    </div>
  );
}
