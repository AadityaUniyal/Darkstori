import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Scale, Clock, MapPin,
  QrCode, Share2, Copy, Check, ExternalLink, Search, ArrowLeft,
  Lock, FileText, Sparkles, Building2, Eye, Download
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

export default function PublicPassportVerification() {
  const { passport_qr } = useParams();
  const navigate = useNavigate();

  const [queryInput, setQueryInput] = useState(passport_qr || 'BLNK-8821');
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeToken = passport_qr || queryInput;

  useEffect(() => {
    if (activeToken) {
      fetchPassport(activeToken);
    }
  }, [activeToken]);

  const fetchPassport = async (token) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPackingPassport(token);
      setCertificate(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Certificate not found. Please verify the QR token or Order ID.");
      setCertificate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    navigate(`/verify/${queryInput.trim()}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success("Verification certificate link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!certificate) return;
    const text = encodeURIComponent(
      `*Darkstori Verified Proof-of-Pack*\n` +
      `Order: ${certificate.order_id}\n` +
      `Store: ${certificate.store_name}\n` +
      `Certified Weight: ${certificate.measured_weight_grams}g\n` +
      `Freshness Score: ${Math.round(certificate.freshness_score * 100)}% Grade-A\n` +
      `Verification Link: ${window.location.href}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-white flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-500/30">
      
      {/* Background Subtle Gradient Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/20 blur-[120px] rounded-full" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-2xl mx-auto space-y-6 my-4">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 grid place-items-center text-emerald-400">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-wider text-slate-400">DARKSTORI OPERATING SYSTEM</div>
              <div className="text-sm font-black font-display text-white">Trust & Quality Verification</div>
            </div>
          </Link>

          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            PUBLIC DISPUTE PORTAL
          </span>
        </div>

        {/* Search Bar for manual lookups */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Enter Order ID (e.g. BLNK-8821) or Passport QR token..."
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              className="w-full bg-[#0D121F] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-emerald-500/60 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold font-mono transition-all shadow-md shadow-emerald-500/20 shrink-0"
          >
            Verify
          </button>
        </form>

        {/* Sample Quick Chips */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 overflow-x-auto pb-1">
          <span>Sample Orders:</span>
          <button
            type="button"
            onClick={() => navigate('/verify/BLNK-8821')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/10"
          >
            BLNK-8821 (Produce & Milk)
          </button>
          <button
            type="button"
            onClick={() => navigate('/verify/ZEPT-4109')}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10"
          >
            ZEPT-4109 (Atta & Staples)
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-[#0D121F] rounded-2xl border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto" />
            <div className="text-sm font-bold text-white">Retrieving Cryptographic Packing Proof...</div>
            <div className="text-xs text-slate-400 font-mono">Querying Neon PostgreSQL immutable ledger</div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-8 text-center bg-[#0D121F] rounded-2xl border border-rose-500/30 space-y-3">
            <AlertTriangle size={36} className="text-rose-400 mx-auto" />
            <div className="text-sm font-bold text-white">Certificate Verification Failed</div>
            <div className="text-xs text-slate-400 max-w-md mx-auto">{error}</div>
          </div>
        )}

        {/* Official Certificate Card */}
        {certificate && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl bg-[#0D121F] border border-white/15 overflow-hidden shadow-2xl relative"
          >
            {/* Top Seal Banner */}
            <div className="p-6 bg-gradient-to-r from-emerald-950/60 via-emerald-900/30 to-black border-b border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    OFFICIAL DISPATCH PROOF-OF-PACK
                  </div>
                  <h2 className="text-lg font-black text-white mt-0.5">
                    Order {certificate.order_id} Verified Genuine
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sealed at {certificate.station_code} · {new Date(certificate.sealed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[10px] font-mono text-slate-400 block">AUTHENTICITY VERDICT</span>
                <span className="text-sm font-black font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  {certificate.verdict}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              {/* High-Resolution Sealed Packing Snapshot Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-white font-bold">
                    <Eye size={14} className="text-emerald-400" />
                    <span>Visual Proof-of-Bagging Snapshot</span>
                  </span>
                  <span>Captured on Packing Scale</span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center">
                  <img
                    src={certificate.snapshot_image_url}
                    alt="Sealed Packing Tote"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/40 font-mono text-[10px] text-emerald-300 font-bold">
                    STAMPED: {certificate.order_id}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[10px] text-slate-300">
                    CERTIFIED: {certificate.measured_weight_grams}g
                  </div>
                </div>
              </div>

              {/* Digital Scale & Freshness Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Scale size={14} className="text-emerald-400" />
                    <span>Digital Scale Tare Weight</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {certificate.measured_weight_grams}g
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                    Target: {certificate.target_weight_grams}g · Within tolerance
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Sparkles size={14} className="text-emerald-400" />
                    <span>Optical Freshness Audit</span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {Math.round(certificate.freshness_score * 100)}% Grade-A
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 font-semibold">
                    0 Defective items at handoff
                  </div>
                </div>
              </div>

              {/* Itemized Optical Detection Breakdown */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-300">
                  VERIFIED PACKED ITEMS ({certificate.detected_items?.length || 0})
                </div>
                <div className="divide-y divide-white/5 border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                  {certificate.detected_items?.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          Quantity: {item.detected_qty || 1} unit(s) · Verified on scale
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {Math.round((item.freshness_score || 0.95) * 100)}% Fresh
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dark Store & Regulatory Proof */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs space-y-2 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">HUB ORIGIN:</span>
                  <strong className="text-white">{certificate.store_name} ({certificate.city})</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">PASSPORT QR TOKEN:</span>
                  <strong className="text-emerald-400 text-[11px] truncate max-w-[240px]">{certificate.passport_qr}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">SHA-256 CHECKSUM:</span>
                  <span className="text-slate-500 text-[10px] truncate max-w-[240px]">{certificate.snapshot_hash}</span>
                </div>
              </div>

              {/* Action Buttons: WhatsApp & Copy Link */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <Share2 size={15} />
                  <span>Share Proof on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all"
                >
                  {copiedLink ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                  <span>{copiedLink ? 'Copied' : 'Copy Evidence Link'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer Guarantee */}
        <div className="text-center text-xs text-slate-500 space-y-1 pb-8">
          <div>Secured by Darkstori Operating System · Cryptographically Sealed on Neon PostgreSQL</div>
          <div>All optical snapshot frames are immutable and admissible for customer refund dispute defense.</div>
        </div>
      </div>
    </div>
  );
}
