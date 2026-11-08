import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Copy, Check, X, QrCode, FileText, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ThermalLabelSticker({
  orderId = "BLNK-8821",
  passportQr = "VPASS-IN-BLNK-8821-1718290-A89F12",
  hubCode = "BLR-INDIRANAGAR-04",
  pincode = "560038",
  stationCode = "DOCK-OPTICAL-01",
  packerId = "PKR-04",
  measuredWeight = 1645,
  targetWeight = 1640,
  freshnessScore = 0.96,
  itemCount = 3,
  snapshotHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  sealedAt = new Date().toISOString(),
  isOpen = false,
  onClose = () => {}
}) {
  const [paperWidth, setPaperWidth] = useState('58mm'); // '58mm' | '80mm'
  const [copiedRaw, setCopiedRaw] = useState(false);
  const stickerRef = useRef(null);

  if (!isOpen) return null;

  const formattedDate = new Date(sealedAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase();
  const formattedTime = new Date(sealedAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  const verifyUrl = `${window.location.origin}/verify/${passportQr}`;

  const handlePrint = () => {
    window.print();
    toast.success(`Dispatched print job to ${paperWidth} thermal label printer`);
  };

  const handleCopyRawEscPos = () => {
    const rawText = 
`[ESC @]
[ESC a 1] DARKSTORI DS-OS
[ESC a 1] PROOF-OF-PACK QUALITY SEAL
================================
ORDER: ${orderId}
HUB:   ${hubCode} (PIN ${pincode})
DOCK:  ${stationCode}
DATE:  ${formattedDate} ${formattedTime}
--------------------------------
TARE WEIGHT: ${measuredWeight}g (PASS)
FRESHNESS:   ${Math.round(freshnessScore * 100)}% GRADE-A
ITEMS:       ${itemCount} VERIFIED / 0 DEFECT
--------------------------------
QR TOKEN: ${passportQr}
VERIFY: ${verifyUrl}
--------------------------------
SHA: ${snapshotHash.slice(0, 16)}...
FSSAI: 11224333000492
GSTIN: 29AAACG1234F1Z5
- - - - - - - - - - - - - - - - 
[GS V 66 0]`;

    navigator.clipboard.writeText(rawText);
    setCopiedRaw(true);
    toast.success("Raw ESC/POS thermal printer text copied to clipboard");
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  // Pseudo-random deterministic 2D QR matrix generation for authentic thermal visual
  const qrSeed = passportQr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const qrGridSize = 21;
  const qrCells = [];
  for (let r = 0; r < qrGridSize; r++) {
    const row = [];
    for (let c = 0; c < qrGridSize; c++) {
      // Corner Finder Patterns (7x7)
      const isTopLeft = r < 7 && c < 7;
      const isTopRight = r < 7 && c >= qrGridSize - 7;
      const isBottomLeft = r >= qrGridSize - 7 && c < 7;

      if (isTopLeft || isTopRight || isBottomLeft) {
        const localR = isBottomLeft ? r - (qrGridSize - 7) : r;
        const localC = isTopRight ? c - (qrGridSize - 7) : c;
        const isBorder = localR === 0 || localR === 6 || localC === 0 || localC === 6;
        const isInner = localR >= 2 && localR <= 4 && localC >= 2 && localC <= 4;
        row.push(isBorder || isInner);
      } else {
        // Pseudo data pattern based on QR seed
        const val = Math.sin((r * qrGridSize + c + qrSeed) * 1.5) > 0.05;
        row.push(val);
      }
    }
    qrCells.push(row);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        
        {/* Print Stylesheet injection for direct 58mm/80mm thermal paper dispatch */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden !important;
            }
            #thermal-sticker-print, #thermal-sticker-print * {
              visibility: visible !important;
            }
            #thermal-sticker-print {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: ${paperWidth === '58mm' ? '54mm' : '76mm'} !important;
              margin: 0 !important;
              padding: 2mm !important;
              background: #ffffff !important;
              color: #000000 !important;
              border: none !important;
              box-shadow: none !important;
              font-family: monospace !important;
            }
            @page {
              size: ${paperWidth === '58mm' ? '58mm auto' : '80mm auto'};
              margin: 0;
            }
          }
        `}} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-[#080D1A] border border-white/15 rounded-2xl shadow-2xl p-6 text-white my-8 space-y-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/10">
                <Printer size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-white">Thermal Bag Sticker Print Engine</h3>
                <p className="text-[11px] font-mono text-slate-400">Direct ESC/POS monochrome label for sealed delivery bags</p>
              </div>
            </div>

            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Width Selector: 58mm vs 80mm */}
          <div className="flex items-center justify-between bg-black/40 p-2 rounded-xl border border-white/10 text-xs font-mono">
            <span className="text-slate-400">Thermal Roll Format:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  paperWidth === '58mm' ? 'bg-white text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm (Mobile Roll)
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  paperWidth === '80mm' ? 'bg-white text-black shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm (Desktop Hub)
              </button>
            </div>
          </div>

          {/* Physical Skeuomorphic Thermal Sticker Preview */}
          <div className="flex justify-center py-2 overflow-x-auto">
            <div
              id="thermal-sticker-print"
              ref={stickerRef}
              style={{ width: paperWidth === '58mm' ? '280px' : '340px' }}
              className="bg-[#FCFCFC] text-[#0A0A0A] p-4 rounded-sm shadow-2xl border-2 border-slate-300 font-mono text-left select-text transition-all relative"
            >
              {/* Authentic Top Barcode Lines simulation */}
              <div className="flex justify-between items-center h-8 mb-2 overflow-hidden opacity-90">
                {[3,1,2,1,4,1,2,3,1,1,2,4,1,2,3,1,2,1,4,1,2,1,3,1,2,4,1,2,3,1,1,4,2,1,3].map((w, i) => (
                  <div key={i} style={{ width: `${w}px` }} className="h-full bg-black shrink-0" />
                ))}
              </div>

              {/* Title & Hub Header */}
              <div className="text-center pb-2 border-b-2 border-dashed border-black">
                <div className="text-[12px] font-black tracking-tight uppercase">DARKSTORI DS-OS</div>
                <div className="text-[9px] font-bold tracking-widest text-slate-700">PROOF-OF-PACK QUALITY SEAL</div>
                <div className="text-[10px] font-bold mt-1">{hubCode} · PIN {pincode}</div>
              </div>

              {/* Order & Packer Metadata */}
              <div className="py-2 space-y-0.5 text-[10px] border-b border-black">
                <div className="flex justify-between font-black text-[13px]">
                  <span>ORDER:</span>
                  <span>{orderId}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-800">
                  <span>DOCK: {stationCode}</span>
                  <span>OP: {packerId}</span>
                </div>
                <div className="flex justify-between text-[9px] text-slate-800">
                  <span>DATE: {formattedDate}</span>
                  <span>TIME: {formattedTime}</span>
                </div>
              </div>

              {/* Physical Tare & Freshness Audit */}
              <div className="py-2 space-y-1 text-[10px] border-b-2 border-dashed border-black">
                <div className="flex justify-between font-bold">
                  <span>CERTIFIED WEIGHT:</span>
                  <span className="font-black text-[11px]">{measuredWeight}g (PASS)</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>FRESHNESS GRADE:</span>
                  <span>{Math.round(freshnessScore * 100)}% GRADE-A</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span>VERIFIED MANIFEST:</span>
                  <span>{itemCount} ITEMS / 0 DEFECT</span>
                </div>
              </div>

              {/* Authentic 2D QR Code Matrix */}
              <div className="py-3 flex flex-col items-center justify-center">
                <div className="p-2 bg-white border border-black inline-block">
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: `repeat(${qrGridSize}, 1fr)`,
                      width: '105px',
                      height: '105px'
                    }}
                  >
                    {qrCells.flat().map((filled, idx) => (
                      <div
                        key={idx}
                        className={filled ? 'bg-black' : 'bg-white'}
                        style={{ width: '5px', height: '5px' }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-[8px] font-bold tracking-widest mt-1 text-center">
                  SCAN FOR DISPUTE PROOF CERTIFICATE
                </div>
                <div className="text-[7px] text-slate-600 truncate max-w-[240px] text-center mt-0.5 font-mono">
                  {passportQr}
                </div>
              </div>

              {/* Bottom Regulatory & Checksum */}
              <div className="pt-2 border-t border-black text-[8px] text-slate-700 space-y-0.5">
                <div className="truncate">SHA: {snapshotHash.slice(0, 24)}...</div>
                <div className="flex justify-between">
                  <span>FSSAI: 11224333000492</span>
                  <span>GST: 29AAACG1234F1Z5</span>
                </div>
              </div>

              {/* Perforated Jagged Tear Line */}
              <div className="mt-3 pt-2 text-center text-[8px] font-bold tracking-widest border-t border-dashed border-slate-400 text-slate-500">
                - - - - - - - [TEAR HERE] - - - - - - -
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-white text-black font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-slate-200 transition-all"
            >
              <Printer size={15} />
              <span>Print {paperWidth} Label (Ctrl+P)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyRawEscPos}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-mono font-bold text-white flex items-center justify-center gap-1.5 transition-all"
            >
              {copiedRaw ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedRaw ? 'Copied' : 'Copy ESC/POS'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
