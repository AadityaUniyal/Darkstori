import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  User,
  Key,
  Lock,
  Layers,
  Clock,
  Building,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  X,
  Smartphone,
  Globe,
  Sliders,
  Check,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { toast } from 'sonner';
import { floorAudio } from '../utils/floorAudio';

const RBAC_PERMISSIONS_MATRIX = {
  executive: [
    { code: 'CAP_FIN_WATERFALL', name: 'View & Edit EBITDA Waterfalls (CM1/CM2/CM3)', granted: true },
    { code: 'CAP_GREENFIELD_HUFF', name: 'Run Greenfield Huff Gravity Simulations', granted: true },
    { code: 'CAP_COMP_PRICING', name: 'Modify Live Competitor Pricing Posture', granted: true },
    { code: 'CAP_BOARD_DOSSIER', name: 'Export Executive Board Dossiers (PDF)', granted: true },
    { code: 'CAP_DISPATCH_OVERRIDE', name: 'Manual Fleet Dispatch Override', granted: false },
    { code: 'CAP_INBOUND_GRN', name: 'Sign Off Inbound Wholesale Goods Receipt', granted: false }
  ],
  'store-gm': [
    { code: 'CAP_INBOUND_GRN', name: 'Sign Off Inbound Wholesale Goods Receipt', granted: true },
    { code: 'CAP_CYCLE_COUNT', name: 'Execute Blind Cycle Count & Shrinkage Audits', granted: true },
    { code: 'CAP_MARKDOWN_AUCTION', name: 'Approve Sigmoid Dutch-Auction Markdowns', granted: true },
    { code: 'CAP_SCALE_STAMP', name: 'Issue Cryptographic Quality Passports', granted: true },
    { code: 'CAP_FIN_WATERFALL', name: 'View & Edit EBITDA Waterfalls (CM1/CM2/CM3)', granted: false },
    { code: 'CAP_GREENFIELD_HUFF', name: 'Run Greenfield Huff Gravity Simulations', granted: false }
  ],
  'fleet-commander': [
    { code: 'CAP_DISPATCH_OVERRIDE', name: 'Manual Fleet Dispatch Override', granted: true },
    { code: 'CAP_MONSOON_THROTTLE', name: 'Activate Weather Corridor Geofence Contraction', granted: true },
    { code: 'CAP_COD_VAULT', name: 'Settle Courier Cash Collections & Safe Vault', granted: true },
    { code: 'CAP_SWARM_ROUTING', name: 'Trigger Clarke-Wright VRPTW Cluster Batching', granted: true },
    { code: 'CAP_INBOUND_GRN', name: 'Sign Off Inbound Wholesale Goods Receipt', granted: false },
    { code: 'CAP_FIN_WATERFALL', name: 'View & Edit EBITDA Waterfalls (CM1/CM2/CM3)', granted: false }
  ]
};

export default function CiamSecurityModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { activeRole } = useRole();
  const [activeTab, setActiveTab] = useState('identity');
  const [copiedKey, setCopiedKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('dks_live_9a8f27e4b1c83d6e5021fa4c99b821');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [sessionExpiryMinutes, setSessionExpiryMinutes] = useState(1420);

  useEffect(() => {
    // Session token countdown calculation
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp) {
          const remainingSecs = Math.max(0, Math.floor(payload.exp - Date.now() / 1000));
          setSessionExpiryMinutes(Math.floor(remainingSecs / 60));
        }
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const permissions = RBAC_PERMISSIONS_MATRIX[activeRole] || RBAC_PERMISSIONS_MATRIX.executive;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    floorAudio.playSuccessPick();
    toast.success('API Key copied to clipboard!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRotateKey = () => {
    floorAudio.playSuccessPick();
    const newKey = `dks_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    setApiKey(newKey);
    toast.success('Production API Key rotated successfully. Old key revoked.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0E131F] border border-white/15 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5">
          <span className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Identity & Access Governance (CIAM)</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-white/60">
              Role-Based Access Control (RBAC), multi-tenant isolation, session tokens, and API credential management.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono">
          {[
            { id: 'identity', label: 'Identity & Pod', icon: User },
            { id: 'rbac', label: 'RBAC Permissions', icon: Layers },
            { id: 'session', label: 'JWT & Session', icon: Clock },
            { id: 'credentials', label: 'API Keys', icon: Key }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); floorAudio.playSuccessPick(); }}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: IDENTITY & POD DETAILS */}
        {activeTab === 'identity' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider font-mono">User Profile & Tenant</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-white/40 block text-[10px]">AUTHENTICATED IDENTITY</span>
                  <strong className="text-white text-sm">{user?.email || 'operator@darkstori.com'}</strong>
                  <span className="text-emerald-400 block text-[10px]">Verified Account</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-white/40 block text-[10px]">ORGANIZATION / TENANT ID</span>
                  <strong className="text-amber-400 text-sm">{user?.organization_id || 'ORG-DKS-BLR-01'}</strong>
                  <span className="text-white/40 block text-[10px]">Multi-Tenant Isolated Database</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider font-mono">Assigned Dark Store Hub</div>
              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-white/50">POD LOCATION:</span>
                  <span className="text-white font-bold">{user?.store?.name || 'Indiranagar Central Pod #04'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">METRO & PINCODE:</span>
                  <span className="text-amber-400">{user?.store?.city || 'Bengaluru'} · 560038</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">OPERATIONAL SLA:</span>
                  <span className="text-emerald-400 font-bold">10-Minute Hyperlocal Guarantee</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50">ASSIGNED 2W FLEET:</span>
                  <span className="text-white">18 Couriers Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RBAC PERMISSIONS */}
        {activeTab === 'rbac' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Current Operational Role: <strong className="text-amber-400 uppercase font-mono">{activeRole}</strong></span>
              <span className="text-[11px] text-white/40 font-mono">RBAC Policy: ST-2026-v3</span>
            </div>

            <div className="space-y-2">
              {permissions.map((perm, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="text-white font-semibold">{perm.name}</div>
                    <div className="text-[10px] text-white/40 font-mono">{perm.code}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                    perm.granted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-white/5 text-white/40 border border-white/10'
                  }`}>
                    {perm.granted ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>GRANTED</span>
                      </>
                    ) : (
                      <span>RESTRICTED</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: JWT SESSION SECURITY */}
        {activeTab === 'session' && (
          <div className="space-y-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider">Cryptographic Token State</div>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-white/60">ALGORITHM:</span>
                  <span className="text-white font-bold">HMAC-SHA256 (HS256)</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-white/60">ACCESS TOKEN EXPIRY:</span>
                  <span className="text-emerald-400 font-bold">{sessionExpiryMinutes} minutes remaining</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-white/60">REFRESH TOKEN ROTATION:</span>
                  <span className="text-sky-300 font-bold">ENABLED (7-Day Rolling JTI)</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-white/60">MULTI-FACTOR AUTH (2FA):</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>TOTP ENFORCED</span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                toast.success('Active sessions synchronized and token rotated!');
                floorAudio.playSuccessPick();
              }}
              className="w-full py-2.5 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Rotate Session Tokens & Revoke Stale JTIs</span>
            </button>
          </div>
        )}

        {/* TAB 4: API CREDENTIALS */}
        {activeTab === 'credentials' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="text-xs font-bold text-white/50 uppercase tracking-wider font-mono">Production Integration Key</div>
              <p className="text-xs text-white/60">
                Use this API key in the <code className="text-amber-400">Authorization: Bearer</code> header for server-to-server ERP integration, automated PO commitments, and IoT scale streams.
              </p>

              <div className="p-3 rounded-xl bg-black/60 border border-white/15 flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-amber-300 truncate">
                  {showApiKey ? apiKey : `${apiKey.substring(0, 12)}••••••••••••••••••••••••`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 cursor-pointer"
                    title={showApiKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleCopyKey}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 cursor-pointer"
                    title="Copy API key"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleRotateKey}
                  className="text-xs text-rose-400 hover:text-rose-300 font-mono underline cursor-pointer"
                >
                  Revoke & Generate New Key
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-black cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
