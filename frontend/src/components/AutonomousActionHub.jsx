import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Bot, Shield, CheckCircle2, CloudRain, Percent, Truck, ArrowRight, RefreshCw, Repeat, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AutonomousActionHub({ selectedCity = 'Bangalore' }) {
  const [autopilotMode, setAutopilotMode] = useState(false);
  const [actions, setActions] = useState([
    {
      id: 'ACT-SIGMOID-01',
      title: 'Dynamic Sigmoid Perishable Clearance',
      category: 'margin',
      icon: Percent,
      color: '#34C759',
      description: '42 dairy & fresh bakery SKUs in Indiranagar have < 5 hours remaining. Recommended markdown: -22%.',
      impact: 'Salvages ₹18,400 with 100% stock clearance',
      status: 'pending', // 'pending' | 'executing' | 'executed'
    },
    {
      id: 'ACT-MONSOON-02',
      title: 'Pre-Emptive Monsoon Geofence Contraction',
      category: 'weather',
      icon: CloudRain,
      color: '#0071E3',
      description: 'Rain cell detected arriving in 18 minutes. Contract Koramangala service radius from 2.5km to 1.6km and apply 1.4x rider surge payout.',
      impact: 'Defends 10-minute SLA and prevents 14 rider delays',
      status: 'pending',
    },
    {
      id: 'ACT-VRP-03',
      title: 'Clarke-Wright Multi-Drop Batch Dispatch',
      category: 'dispatch',
      icon: Truck,
      color: '#38BDF8',
      description: 'Cluster 3 adjacent delivery orders in HSR Sector 2 into a single 1.4km loop for Rider #R-309.',
      impact: 'Cuts 2.4 km transit, ETA 7.8 mins (well under 10m SLA)',
      status: 'pending',
    },
    {
      id: 'ACT-REBALANCE-04',
      title: 'Inter-Hub Micro-Transfer Cross-Docking',
      category: 'inventory',
      icon: Repeat,
      color: '#A855F7',
      description: 'Domlur Darkstore has 140 units surplus Amul Gold Milk; Indiranagar is at 45m stockout risk. Dispatch 40-unit runner transfer.',
      impact: 'Eliminates ₹6,200 lost GMV from afternoon stockout',
      status: 'pending',
    },
  ]);

  const handleToggleAutopilot = () => {
    const nextState = !autopilotMode;
    setAutopilotMode(nextState);
    if (nextState) {
      toast.success('Autopilot Engaged: System will autonomously execute validated actions with >90% confidence');
      // Auto-execute pending actions after a brief delay
      setTimeout(() => {
        setActions(prev => prev.map(a => a.status === 'pending' ? { ...a, status: 'executed' } : a));
        toast.info('Autonomous Engine: 4 pending optimizations executed successfully.');
      }, 1200);
    } else {
      toast.info('Advisory Mode Active: Manual 1-click operator confirmation required for all prescriptive actions');
    }
  };

  const executeAction = (actionId) => {
    setActions(prev => prev.map(a => {
      if (a.id === actionId) {
        return { ...a, status: 'executing' };
      }
      return a;
    }));

    setTimeout(() => {
      setActions(prev => prev.map(a => {
        if (a.id === actionId) {
          return { ...a, status: 'executed' };
        }
        return a;
      }));
      const matched = actions.find(a => a.id === actionId);
      toast.success(`Executed: ${matched?.title || 'Action'} · ${matched?.impact || 'Operational optimization confirmed'}`);
    }, 600);
  };

  const pendingCount = actions.filter(a => a.status === 'pending').length;

  return (
    <div className="glass-card p-5 rounded-2xl border border-white/10 bg-[#0E121A]/80 backdrop-blur-xl space-y-4 mb-6">
      {/* Header with Autopilot Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#0071E3]/20 to-[#38BDF8]/20 text-[#38BDF8] border border-[#0071E3]/30">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-white font-display">
                Autonomous Prescriptive Action Hub
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                {pendingCount} Recommended
              </span>
            </div>
            <p className="text-xs text-slate-400 font-body">
              {autopilotMode 
                ? 'Autopilot is dynamically executing real-time micro-fulfillment policies.' 
                : 'Advisory Mode: Review and approve AI-prescribed optimizations with 1-click.'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#141A24] p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => autopilotMode && handleToggleAutopilot()}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                !autopilotMode
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Advisory Mode
            </button>
            <button
              onClick={() => !autopilotMode && handleToggleAutopilot()}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                autopilotMode
                  ? 'bg-gradient-to-r from-[#0071E3] to-[#38BDF8] text-white font-semibold shadow-md shadow-[#0071E3]/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={12} className={autopilotMode ? 'animate-spin' : ''} />
              Autopilot Active
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {actions.map((act) => {
          const Icon = act.icon;
          const isExecuted = act.status === 'executed';
          const isExecuting = act.status === 'executing';

          return (
            <motion.div
              key={act.id}
              layout
              className={`p-4 rounded-xl border transition-all ${
                isExecuted
                  ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                  : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-lg shrink-0"
                    style={{ background: `${act.color}15`, color: act.color, border: `1px solid ${act.color}30` }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white">
                      {act.title}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      {act.category} · {act.id}
                    </span>
                  </div>
                </div>

                {isExecuted ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 size={11} /> EXECUTED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    RECOMMENDED
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {act.description}
              </p>

              <div className="pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[11px] font-medium text-emerald-400">
                  {act.impact}
                </span>

                {!isExecuted && (
                  <button
                    onClick={() => executeAction(act.id)}
                    disabled={isExecuting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0071E3] hover:bg-[#0077ED] text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        Executing...
                      </>
                    ) : (
                      <>
                        Approve & Execute <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
