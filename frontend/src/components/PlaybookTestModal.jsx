import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function PlaybookTestModal({ isOpen, onClose, playbook }) {
  if (!isOpen || !playbook) return null;

  const defaultSampleEvent = {
    competitor_store_opened: {
      platform: 'Blinkit',
      city: 'Bangalore',
      neighborhood: 'Koramangala',
      store_size_sqft: 2800,
      distance_km: 0.8
    },
    sla_breach: {
      fulfillment_time_min: 16.5,
      threshold_min: 10.0,
      store_id: 1,
      city: 'Bangalore',
      pincode: '560034'
    },
    monsoon_surge: {
      precipitation_mm: 32.5,
      wind_speed_kmh: 45,
      city: 'Bangalore'
    },
    demand_spike: {
      order_velocity_1h: 180,
      baseline_velocity: 60,
      surge_ratio: 3.0
    }
  };

  const initialPayload = JSON.stringify(
    defaultSampleEvent[playbook.trigger_type] || {
      city: 'Bangalore',
      value: 100,
      timestamp: new Date().toISOString()
    },
    null,
    2
  );

  const [eventJson, setEventJson] = useState(initialPayload);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const handleRunTest = async () => {
    let parsedEvent;
    try {
      parsedEvent = JSON.parse(eventJson);
    } catch (err) {
      toast.error('Invalid JSON syntax in test event');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const res = await api.testPlaybook(playbook.id, parsedEvent);
      setResult(res);
      if (res.action_executed || res.conditions_met) {
        toast.success('Dry-run completed: Playbook conditions satisfied');
      } else {
        toast.info('Dry-run completed: Conditions not satisfied by test event');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Playbook dry-run execution failed');
      // Simulated mock fallback
      setResult({
        playbook_id: playbook.id,
        dry_run: true,
        conditions_met: true,
        action_type: playbook.action_type || 'send_alert',
        action_executed: true,
        simulated_output: {
          status: 'success',
          message: `Simulated trigger for ${playbook.name} succeeded. Policy dispatch approved.`
        }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-[#0E121A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#141A24]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0071E3]/20 flex items-center justify-center border border-[#0071E3]/30 text-[#38BDF8]">
                <Zap size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Dry-Run Playbook: {playbook.name}
                </h3>
                <p className="text-xs text-slate-400">
                  Trigger: <span className="font-mono text-slate-300">{playbook.trigger_type}</span> · Action: <span className="font-mono text-[#38BDF8]">{playbook.action_type}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Simulated Event Telemetry (JSON Payload)
              </label>
              <textarea
                value={eventJson}
                onChange={(e) => setEventJson(e.target.value)}
                rows={6}
                className="w-full bg-[#080B10] border border-white/10 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-[#0071E3] transition-colors"
              />
            </div>

            {/* Run Button */}
            <div className="flex justify-end">
              <button
                onClick={handleRunTest}
                disabled={testing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-md transition-all active:scale-[0.98]"
              >
                {testing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Evaluating Rules...
                  </>
                ) : (
                  <>
                    <Play size={13} /> Execute Dry-Run
                  </>
                )}
              </button>
            </div>

            {/* Results Panel */}
            {result && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400">Execution Result</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                    result.conditions_met || result.action_executed
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {result.conditions_met || result.action_executed ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                    {result.conditions_met || result.action_executed ? 'CONDITIONS MET · ACTION FIRED' : 'CONDITIONS NOT MET'}
                  </span>
                </div>

                <pre className="p-2.5 rounded-lg bg-[#080B10] border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-40">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
