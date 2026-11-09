import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook, Globe, Shield, Send, CheckCircle2, AlertCircle, X,
  Key, RefreshCw, Layers, Copy, Check, ExternalLink, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

const STORAGE_KEY = 'darkstor_storefront_config';

export default function StorefrontSettingsModal({ isOpen, onClose }) {
  const [platform, setPlatform] = useState('shopify');
  const [webhookUrl, setWebhookUrl] = useState('https://storefront.mybrand.in/api/webhooks/darkstor');
  const [hmacSecret, setHmacSecret] = useState('whsec_in_' + Math.random().toString(36).substring(2, 12));
  const [gstin, setGstin] = useState('29AAACG1234F1Z5');
  const [fssai, setFssai] = useState('11224333000492');
  const [geofenceKm, setGeofenceKm] = useState('2.8');
  const [copiedKey, setCopiedKey] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Subscribed events
  const [events, setEvents] = useState({
    priceUpdate: true,
    stockout: true,
    orderDispatched: true,
    expiryAlert: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.platform) setPlatform(parsed.platform);
        if (parsed.webhookUrl) setWebhookUrl(parsed.webhookUrl);
        if (parsed.hmacSecret) setHmacSecret(parsed.hmacSecret);
        if (parsed.gstin) setGstin(parsed.gstin);
        if (parsed.fssai) setFssai(parsed.fssai);
        if (parsed.geofenceKm) setGeofenceKm(parsed.geofenceKm);
        if (parsed.events) setEvents(parsed.events);
      }
    } catch {
      // Fallback
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(hmacSecret);
    setCopiedKey(true);
    toast.success('HMAC Secret copied to clipboard');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleGenerateSecret = () => {
    const fresh = 'whsec_in_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 8);
    setHmacSecret(fresh);
    toast.info('Generated new HMAC Secret Key. Remember to update your storefront.');
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setTestResult(null);
    try {
      const res = await api.testStorefrontWebhook({
        webhook_url: webhookUrl,
        hmac_secret: hmacSecret,
        event_type: 'inventory.price_update',
        payload: {
          sku: 'SKU-AMUL-500ML',
          name: 'Amul Taaza Toned Milk 500ml',
          base_price: 27.0,
          current_price: 27.0,
          discount_pct: 0,
          inventory_available: 184,
          out_of_stock: false,
          pincode: '560038',
          hub_id: 'BLR-INDIRANAGAR-04'
        }
      });
      setTestResult(res);
      if (res.status === 'delivered') {
        toast.success(`Webhook test delivered successfully! Status: ${res.status_code}`);
      } else if (res.status === 'simulated') {
        toast.info(`Webhook verified & simulated: ${res.detail}`);
      } else {
        toast.warning(`Webhook endpoint responded with HTTP ${res.status_code}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to ping storefront webhook endpoint');
      setTestResult({
        status: 'error',
        status_code: 500,
        detail: e?.message || 'Network request failed'
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleSave = () => {
    const config = {
      platform,
      webhookUrl,
      hmacSecret,
      gstin,
      fssai,
      geofenceKm,
      events,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Storage unavailable
    }
    toast.success('Storefront webhook & tax configuration saved successfully!');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-[#0B0F19] border border-white/10 rounded-2xl shadow-2xl p-6 text-white my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <Webhook size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold font-display text-white">Storefront & OMS Integrations</h3>
                <p className="text-xs text-slate-400">Configure outbound stockout hooks, price decay sync, and GST compliance.</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            {/* Storefront Platform Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Consumer Storefront Architecture
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'shopify', label: 'Shopify Plus / Headless' },
                  { id: 'nextjs', label: 'Custom Next.js / React' },
                  { id: 'woocommerce', label: 'WooCommerce / POS' },
                  { id: 'blinkit_merchant', label: 'Blinkit Merchant API' },
                  { id: 'zepto_dark', label: 'Zepto Dark Partner' },
                  { id: 'custom_webhook', label: 'Custom Rest Webhook' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlatform(item.id)}
                    className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                      platform === item.id
                        ? 'border-violet-500 bg-violet-500/15 text-white font-bold'
                        : 'border-white/5 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Webhook Endpoint & HMAC Key */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Outbound Webhook URL (POST Target)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://api.yourstore.com/webhooks/darkstor"
                    className="flex-1 bg-[#141A26] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Key size={13} className="text-amber-400" />
                    <span>HMAC SHA-256 Signing Secret</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSecret}
                    className="text-[11px] text-violet-400 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Generate New
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={hmacSecret}
                    onChange={(e) => setHmacSecret(e.target.value)}
                    className="flex-1 bg-[#141A26] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 shrink-0"
                  >
                    {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Event Subscriptions */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Live Event Subscriptions (Webhooks)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'priceUpdate', label: 'inventory.price_update', desc: 'Push real-time perishable markdown' },
                  { key: 'stockout', label: 'inventory.stockout', desc: 'Push when shelf stock reaches 0 units' },
                  { key: 'orderDispatched', label: 'order.dispatched', desc: 'Notify storefront when rider receives bag' },
                  { key: 'expiryAlert', label: 'resilience.expiry_alert', desc: 'Alert store manager 2 hrs before expiry' }
                ].map(ev => (
                  <label
                    key={ev.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      events[ev.key]
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                        : 'border-white/5 bg-white/[0.02] text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={events[ev.key]}
                      onChange={(e) => setEvents({ ...events, [ev.key]: e.target.checked })}
                      className="mt-0.5 rounded accent-emerald-500"
                    />
                    <div>
                      <div className="font-mono font-bold text-[11px] text-emerald-300">{ev.label}</div>
                      <div className="text-[10px] text-slate-400">{ev.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Indian Dark Store Regulatory & Tax Details */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <Shield size={14} className="text-emerald-400" />
                <span>Indian Dark Store Statutory & Compliance Registration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">State GSTIN</label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full bg-[#141A26] border border-white/10 rounded-lg p-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">FSSAI Storage License</label>
                  <input
                    type="text"
                    value={fssai}
                    onChange={(e) => setFssai(e.target.value)}
                    className="w-full bg-[#141A26] border border-white/10 rounded-lg p-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Max Geofence Radius</label>
                  <div className="flex items-center bg-[#141A26] border border-white/10 rounded-lg px-2">
                    <input
                      type="number"
                      step="0.1"
                      value={geofenceKm}
                      onChange={(e) => setGeofenceKm(e.target.value)}
                      className="w-full bg-transparent p-2 text-xs font-mono text-white outline-none"
                    />
                    <span className="text-[11px] text-slate-400">km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Ping Diagnostic Box */}
            <div className="p-3.5 rounded-xl bg-[#141A26] border border-violet-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  <span>Integration Health & Payload Ping</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={isPinging}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/20"
                >
                  <Send size={12} className={isPinging ? 'animate-spin' : ''} />
                  <span>{isPinging ? 'Testing...' : 'Send Test Ping'}</span>
                </button>
              </div>

              {testResult && (
                <div className="mt-2 p-2.5 rounded-lg bg-black/50 border border-white/10 font-mono text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Status: <strong className={testResult.status_code === 200 ? 'text-emerald-400' : 'text-amber-400'}>{testResult.status_code} ({testResult.status})</strong></span>
                    {testResult.latency_ms && <span className="text-slate-400">{testResult.latency_ms} ms</span>}
                  </div>
                  <div className="text-slate-400 text-[10px] truncate">Target: {testResult.target_url}</div>
                  {testResult.hmac_signature && (
                    <div className="text-[10px] text-amber-300/80 truncate">Header: X-Darkstor-Signature: {testResult.hmac_signature.slice(0, 32)}...</div>
                  )}
                  <div className="text-slate-300 text-[10px] pt-1">{testResult.detail}</div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={15} />
              <span>Save Integration Config</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
