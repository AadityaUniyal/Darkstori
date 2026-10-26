import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ConformalSlaVisualizer() {
  return (
    <section className="glass-card p-5 rounded-2xl border border-amber-400/20 bg-[#0E121A]/85" aria-labelledby="sla-calibration-title">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-300"><ShieldCheck size={20} /></div>
        <div>
          <h3 id="sla-calibration-title" className="font-bold text-base text-white">Delivery SLA estimate</h3>
          <p className="text-xs text-slate-400">Statistical calibration is not connected</p>
        </div>
      </div>
      <div role="status" className="mt-4 flex gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-3 text-sm text-slate-300">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
        <span>No SLA intervals or coverage percentages are shown until measured delivery outcomes and a validated point model are available.</span>
      </div>
    </section>
  );
}
