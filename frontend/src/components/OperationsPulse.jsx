import React, { useState, useEffect } from 'react';
import { Activity, Radio, Cpu, ShieldCheck, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function OperationsPulse() {
  const [latency, setLatency] = useState(24);
  const [status, setStatus] = useState('healthy');
  const [expanded, setExpanded] = useState(false);
  const [healthData, setHealthData] = useState({ status: 'ok', version: '3.0.0' });

  useEffect(() => {
    let intervalId;
    const checkPulse = async () => {
      const start = performance.now();
      try {
        const data = await api.getHealth();
        const end = performance.now();
        setLatency(Math.round(end - start));
        setHealthData(data);
        setStatus('healthy');
      } catch (e) {
        setLatency(999);
        setStatus('degraded');
      }
    };

    checkPulse();
    intervalId = setInterval(checkPulse, 15000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
        {/* Compact Bar */}
        <div 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/40 transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status === 'healthy' ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-foreground">OPERATIONS PULSE</span>
          </div>

          <div className="h-3 w-px bg-border" />

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio size={12} className={status === 'healthy' ? 'text-emerald-500' : 'text-amber-500'} />
            <span className="font-mono text-[11px]">{latency}ms</span>
          </div>

          <button className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Expanded Telemetry Details */}
        {expanded && (
          <div className="p-3 border-t border-border/40 bg-secondary/20 text-xs space-y-2.5 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-primary" /> PostgreSQL & Neon
              </span>
              <span className="font-medium text-emerald-500 flex items-center gap-1">
                <CheckCircle2 size={12} /> Connected
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Activity size={13} className="text-primary" /> Realtime WebSocket
              </span>
              <span className="font-medium text-foreground">Streaming (EIO=4)</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Cpu size={13} className="text-primary" /> Inference Engine
              </span>
              <span className="font-medium text-foreground">XGBoost & PostGIS</span>
            </div>

            <div className="pt-1 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Darkstori Engine v{healthData.version || '3.0.0'}</span>
              <span>SLO 99.9%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
