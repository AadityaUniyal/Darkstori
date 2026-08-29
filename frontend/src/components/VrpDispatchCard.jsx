import React, { useState, useEffect } from 'react';
import { Truck, Navigation, Leaf, Percent, RefreshCw, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useCity } from '../context/CityContext';
import { toast } from 'sonner';

export default function VrpDispatchCard({ storeId = null }) {
  const { currentCity } = useCity();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ordersCount, setOrdersCount] = useState(8);

  const runVrpOptimization = async () => {
    setLoading(true);
    try {
      const res = await api.getBatchDispatch({
        store_id: storeId,
        city: currentCity,
        max_orders_per_rider: 3,
        sample_order_count: ordersCount,
      });
      setData(res);
      toast.success('VRP Batching calculated: optimal multi-stop routes generated');
    } catch (e) {
      toast.error('Failed to run dispatch optimization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runVrpOptimization();
  }, [storeId, currentCity, ordersCount]);

  const metrics = data?.vrp_metrics;

  return (
    <div className="glass-card p-5 rounded-2xl border border-border/80 bg-card/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Truck size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">VRP Dispatch & Multi-Drop Batching</h3>
            <p className="text-xs text-muted-foreground">{data?.store_name || 'Hub Dispatch Matrix'} · Clarke-Wright Savings Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={ordersCount}
            onChange={(e) => setOrdersCount(Number(e.target.value))}
            className="bg-secondary text-foreground text-xs px-2.5 py-1.5 rounded-lg border border-border/60 focus:outline-none"
          >
            <option value={6}>6 Orders</option>
            <option value={8}>8 Orders</option>
            <option value={12}>12 Orders</option>
            <option value={16}>16 Orders</option>
          </select>
          <button
            onClick={runVrpOptimization}
            disabled={loading}
            className="p-1.5 rounded-lg bg-secondary hover:bg-accent text-foreground transition-colors"
            title="Recalculate VRP Routes"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* High-level savings metrics */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        <div className="p-3 bg-secondary/40 rounded-xl border border-border/30">
          <span className="text-[11px] text-muted-foreground block mb-1">Riders Needed</span>
          <div className="text-lg font-bold text-foreground">
            {metrics?.riders_required || 0} <span className="text-xs font-normal text-muted-foreground">/ {metrics?.total_orders || 0} orders</span>
          </div>
        </div>

        <div className="p-3 bg-secondary/40 rounded-xl border border-border/30">
          <span className="text-[11px] text-muted-foreground block mb-1">Distance Saved</span>
          <div className="text-lg font-bold text-emerald-400">
            {metrics?.distance_saved_km || 0} <span className="text-xs font-normal text-muted-foreground">km</span>
          </div>
        </div>

        <div className="p-3 bg-secondary/40 rounded-xl border border-border/30">
          <span className="text-[11px] text-muted-foreground block mb-1">Cost Savings</span>
          <div className="text-lg font-bold text-emerald-400">
            {metrics?.cost_savings_pct || 0}%
          </div>
        </div>

        <div className="p-3 bg-secondary/40 rounded-xl border border-border/30">
          <span className="text-[11px] text-muted-foreground block mb-1">CO₂ Offset</span>
          <div className="text-lg font-bold text-sky-400 flex items-center gap-1">
            <Leaf size={14} /> {metrics?.co2_saved_kg || 0} <span className="text-xs font-normal text-muted-foreground">kg</span>
          </div>
        </div>
      </div>

      {/* Batches Table / Cards */}
      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
        {metrics?.batches?.map((batch) => (
          <div 
            key={batch.batch_id}
            className="p-3 bg-secondary/20 hover:bg-secondary/40 rounded-xl border border-border/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground font-mono">{batch.batch_id}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                  {batch.rider_id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {batch.orders_count} stops · {batch.total_route_distance_km} km
                </span>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${batch.batch_sla_status === 'GREEN' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                {batch.total_route_duration_mins} min SLA
              </span>
            </div>

            {/* Sequence stops */}
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {batch.orders?.map((ord, oIdx) => (
                <React.Fragment key={ord.order_id}>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-lg border border-border/50 text-[11px] shrink-0">
                    <span className="font-mono text-muted-foreground font-bold">#{ord.sequence_stop}</span>
                    <span className="font-medium text-foreground">{ord.order_id}</span>
                    <span className="text-muted-foreground font-mono">({ord.est_delivery_mins}m)</span>
                  </div>
                  {oIdx < batch.orders.length - 1 && (
                    <ArrowRight size={12} className="text-muted-foreground/50 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
