import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreVertical, Copy, Check, Barcode, ShieldAlert, 
  History, ArrowRight, Printer, AlertTriangle, ExternalLink 
} from 'lucide-react';
import { floorAudio } from '../utils/floorAudio';

/**
 * RowActionMenu
 * 
 * Tactile context menu for dense inventory/order/SKU rows.
 * Provides micro-actions (Copy Barcode, Spot-Audit, View Ledger, Print Tag)
 * with instant tactile feedback and physical keyboard navigation.
 */
export default function RowActionMenu({ 
  item = {},
  onSpotAudit,
  onViewLedger,
  onPrintLabel,
  align = 'right'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  const barcodeValue = item.barcode || item.ean || item.sku || item.id || 'N/A';

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleCopyBarcode = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(barcodeValue);
    setCopied(true);
    floorAudio.success();
    setTimeout(() => {
      setCopied(false);
      setIsOpen(false);
    }, 1200);
  };

  const handleAction = (actionFn) => (e) => {
    e.stopPropagation();
    floorAudio.click();
    setIsOpen(false);
    if (actionFn) actionFn(item);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          floorAudio.click();
          setIsOpen(!isOpen);
        }}
        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
        title="Row context actions"
        aria-label="Open context actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div 
          className={`absolute z-50 mt-1 w-52 rounded-md bg-[#0D131F] border border-white/10 shadow-2xl py-1 text-xs text-slate-200 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Header with SKU details */}
          <div className="px-3 py-1.5 border-b border-white/5 font-mono text-[10px] text-slate-400 truncate">
            SKU: <span className="text-amber-400">{barcodeValue}</span>
          </div>

          {/* Action 1: Copy Barcode */}
          <button
            type="button"
            onClick={handleCopyBarcode}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 hover:text-white transition-colors text-left"
          >
            <span className="flex items-center gap-2">
              <Barcode className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Barcode (EAN)</span>
            </span>
            {copied ? (
              <span className="flex items-center text-[10px] text-emerald-400 font-medium">
                <Check className="w-3 h-3 mr-0.5" /> Copied
              </span>
            ) : (
              <kbd className="text-[9px] font-mono bg-white/5 px-1 py-0.5 rounded text-slate-500">⌘C</kbd>
            )}
          </button>

          {/* Action 2: Trigger Spot Audit */}
          {onSpotAudit && (
            <button
              type="button"
              onClick={handleAction(onSpotAudit)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Spot Audit</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Bin {item.bin || 'A1'}</span>
            </button>
          )}

          {/* Action 3: View Stock Ledger */}
          {onViewLedger && (
            <button
              type="button"
              onClick={handleAction(onViewLedger)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span>Audit Ledger History</span>
              </span>
              <ArrowRight className="w-3 h-3 text-slate-500" />
            </button>
          )}

          {/* Action 4: Print Thermal Sticker */}
          {onPrintLabel && (
            <button
              type="button"
              onClick={handleAction(onPrintLabel)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 hover:text-white transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Thermal Tag</span>
              </span>
              <span className="text-[9px] font-mono bg-white/5 px-1 py-0.5 rounded text-slate-500">58mm</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
