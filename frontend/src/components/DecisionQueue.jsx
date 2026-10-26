import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, Check, ChevronDown, ChevronUp, Clock3, Leaf, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

const priorityStyles = {
  critical: { label: 'Act soon', className: 'border-red-400/25 bg-red-400/10 text-red-300', icon: AlertTriangle },
  high: { label: 'High', className: 'border-amber-400/25 bg-amber-400/10 text-amber-300', icon: Clock3 },
  watch: { label: 'Monitor', className: 'border-white/10 bg-white/[0.04] text-white/60', icon: Leaf },
};

function formatRupees(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
}

export default function DecisionQueue({ city }) {
  const queryClient = useQueryClient();
  const [outcomeFormId, setOutcomeFormId] = useState(null);
  const [outcomeDraft, setOutcomeDraft] = useState({ sold_units: '', wasted_units: '', remaining_units: '', realized_avg_price: '' });
  const [showBacktest, setShowBacktest] = useState(false);
  const queryKey = useMemo(() => ['decision-queue', city], [city]);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => api.getDecisionQueue(city),
    enabled: Boolean(city),
    refetchInterval: 90000,
    staleTime: 30000,
  });
  const { data: impact } = useQuery({
    queryKey: ['decision-impact', city, 90],
    queryFn: () => api.getDecisionImpact(90),
    enabled: Boolean(city),
    staleTime: 30000,
  });
  const { data: backtest, isLoading: isBacktestLoading } = useQuery({
    queryKey: ['decision-backtest', city],
    queryFn: () => api.getDecisionBacktest(city),
    enabled: Boolean(showBacktest && city),
    staleTime: 60000,
  });

  const refreshQueue = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['resilience-batches', city] });
    queryClient.invalidateQueries({ queryKey: ['decision-impact', city] });
  };

  const applyMutation = useMutation({
    mutationFn: (args) => typeof args === 'string' ? api.applyDecisionRecommendation(args) : api.applyDecisionRecommendation(args.recommendationId, args),
    onSuccess: (result) => {
      if (result?.after?.physical_variance && result.after.physical_variance !== 0) {
        toast.info(`Stock ledger updated: ${result.after.physical_variance} units variance recorded.`);
      }
      const syncStatus = result?.catalog_sync?.status;
      const syncNote = syncStatus === 'delivered'
        ? ' · Catalog webhook dispatched'
        : syncStatus === 'queued_local_audit'
        ? ' · Outbound sync logged'
        : '';
      toast.success(`Markdown applied · ${formatRupees(result.before.current_price)} → ${formatRupees(result.after.current_price)}${syncNote}`);
      refreshQueue();
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Could not apply this markdown. Refresh the queue and try again.'),
  });

  const feedbackMutation = useMutation({
    mutationFn: (recommendationId) => api.recordDecisionFeedback(recommendationId, 'dismissed'),
    onSuccess: () => {
      toast('Recommendation dismissed and recorded.');
      refreshQueue();
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Could not record this decision.'),
  });

  const outcomeMutation = useMutation({
    mutationFn: ({ recommendationId, ...outcome }) => api.recordDecisionOutcome(recommendationId, outcome),
    onSuccess: (result) => {
      toast.success(`Batch outcome recorded · ${formatRupees(result.sold_revenue_inr)} reported revenue`);
      setOutcomeFormId(null);
      refreshQueue();
    },
    onError: (error) => toast.error(error?.response?.data?.detail || 'Could not record the batch outcome.'),
  });

  const recommendations = data?.recommendations || [];
  const pendingId = outcomeMutation.variables?.recommendationId || applyMutation.variables || feedbackMutation.variables;

  return (
    <section id="decision-queue" className="rounded-2xl border border-white/10 bg-[#0E121A]/85 p-4 sm:p-5 shadow-xl shadow-black/15 backdrop-blur-xl">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <ShieldCheck size={19} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Operator decision queue</h2>
              {!isLoading && !isError && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-white/60">
                  {recommendations.length} open
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              {data?.method || 'Evidence-backed inventory actions for this store network.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBacktest((prev) => !prev)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${
              showBacktest
                ? 'border-indigo-400/40 bg-indigo-500/15 text-indigo-200'
                : 'border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]'
            }`}
            aria-expanded={showBacktest}
          >
            <BarChart3 size={13} />
            <span>Policy proof</span>
            {showBacktest ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-white/70 transition hover:bg-white/[0.08] disabled:opacity-50"
            aria-label="Refresh decision queue"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {showBacktest && (
        <div className="border-b border-white/[0.07] py-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-white/90">Empirical Policy Validation · Counterfactual Backtest</h4>
              <p className="mt-0.5 text-[11px] text-white/45">
                Comparing Darkstori&apos;s dynamic markdown policy against standard FIFO status quo and linear step discounting.
              </p>
            </div>
            {isBacktestLoading && <Loader2 size={14} className="animate-spin text-white/50" />}
          </div>

          {backtest?.comparison_metrics && (
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {/* Baseline 1: FIFO */}
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-white/40">Baseline 1 · FIFO</span>
                <p className="mt-1 text-xs font-medium text-white/75">Status Quo (No discount)</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-white/60"><span>Waste units</span><span className="font-semibold text-red-300/80">{backtest.comparison_metrics.fifo_status_quo.waste_units}</span></div>
                  <div className="flex justify-between text-white/60"><span>Waste loss</span><span className="font-medium text-white/80">{formatRupees(backtest.comparison_metrics.fifo_status_quo.waste_value_inr)}</span></div>
                  <div className="flex justify-between text-white/60"><span>Discounted rev</span><span className="text-white/45">—</span></div>
                </div>
              </div>

              {/* Baseline 2: Linear Step */}
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                <span className="block text-[10px] font-medium uppercase tracking-wider text-white/40">Baseline 2 · Linear</span>
                <p className="mt-1 text-xs font-medium text-white/75">Rule-based 25% step</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-white/60"><span>Waste units</span><span className="font-semibold text-amber-200/80">{backtest.comparison_metrics.linear_step.waste_units}</span></div>
                  <div className="flex justify-between text-white/60"><span>Waste reduction</span><span className="font-medium text-emerald-300/80">-{backtest.comparison_metrics.linear_step.waste_reduction_vs_fifo_pct}%</span></div>
                  <div className="flex justify-between text-white/60"><span>Discounted rev</span><span className="font-medium text-white/80">{formatRupees(backtest.comparison_metrics.linear_step.markdown_revenue_inr)}</span></div>
                </div>
              </div>

              {/* Darkstori Sigmoid */}
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/[0.05] p-3">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Darkstori Dynamic</span>
                  <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">PROVEN</span>
                </div>
                <p className="mt-1 text-xs font-medium text-emerald-100">Sigmoid Freshness Rule</p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between text-emerald-100/70"><span>Waste units</span><span className="font-bold text-emerald-300">{backtest.comparison_metrics.darkstori_dynamic.waste_units}</span></div>
                  <div className="flex justify-between text-emerald-100/70"><span>Waste reduction</span><span className="font-bold text-emerald-300">-{backtest.comparison_metrics.darkstori_dynamic.waste_reduction_vs_fifo_pct}%</span></div>
                  <div className="flex justify-between text-emerald-100/70"><span>Discounted rev</span><span className="font-bold text-white">{formatRupees(backtest.comparison_metrics.darkstori_dynamic.markdown_revenue_inr)}</span></div>
                </div>
              </div>
            </div>
          )}
          <p className="mt-2.5 text-[10px] leading-relaxed text-white/35">
            Historical holdout comparison across {backtest?.cohort_sample_size || 0} batches. Evaluates waste prevention before operator approval.
          </p>
        </div>
      )}
      {impact && (
        <div className="grid grid-cols-2 gap-2 border-b border-white/[0.07] py-3 sm:grid-cols-4">
          <div><span className="block text-[10px] uppercase tracking-wide text-white/40">Reported batches · 90d</span><span className="text-sm font-semibold text-white/85">{impact.completed_batches}</span></div>
          <div><span className="block text-[10px] uppercase tracking-wide text-white/40">Observed waste</span><span className="text-sm font-semibold text-white/85">{impact.reported_waste_pct == null ? '—' : `${impact.reported_waste_pct}%`}</span></div>
          <div><span className="block text-[10px] uppercase tracking-wide text-white/40">Waste units reported</span><span className="text-sm font-semibold text-white/85">{impact.wasted_units}</span></div>
          <div><span className="block text-[10px] uppercase tracking-wide text-white/40">Markdown sales reported</span><span className="text-sm font-semibold text-white/85">{formatRupees(impact.sold_revenue_inr)}</span></div>
          <p className="col-span-2 text-[10px] leading-relaxed text-white/35 sm:col-span-4">Observed outcomes from operator-reported markdown batches only; this is not a measured reduction or causal comparison.</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-white/55"><Loader2 size={16} className="animate-spin" /> Checking recorded batch expiry…</div>
      ) : isError ? (
        <div className="py-6">
          <p className="text-sm font-medium text-white/80">Live recommendations are unavailable</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">The queue needs a connection to Darkstori’s API. Synthetic actions are not shown as live recommendations.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15">Try again</button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="flex items-start gap-3 py-6">
          <Check size={17} className="mt-0.5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-medium text-white/85">No near-expiry markdown actions right now</p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">The queue checked live batches in {city}. It only raises an item when a recorded expiry and freshness value meet the rule.</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {recommendations.slice(0, 5).map((item) => {
            const priority = priorityStyles[item.priority] || priorityStyles.watch;
            const PriorityIcon = priority.icon;
            const busy = pendingId === item.id && (applyMutation.isPending || feedbackMutation.isPending || outcomeMutation.isPending);
            return (
              <article key={item.id} className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-300/10 text-amber-200"><Leaf size={15} /></div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-snug text-white">{item.title}</h3>
                      <p className="mt-1 text-xs text-white/55">{item.store_name} · {item.category} · {item.quantity} units</p>
                    </div>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${item.needs_outcome ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' : priority.className}`}>
                    <PriorityIcon size={11} /> {item.needs_outcome ? 'Markdown applied · outcome due' : `${item.hours_to_expiry}h · ${priority.label}`}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-lg bg-black/15 px-2.5 py-2"><span className="block text-[10px] text-white/40">Freshness</span><span className="mt-0.5 block font-medium text-white/80">{item.freshness_score == null ? 'Not measured' : `${Math.round(item.freshness_score * 100)}%`}</span></div>
                  <div className="rounded-lg bg-black/15 px-2.5 py-2"><span className="block text-[10px] text-white/40">Current price</span><span className="mt-0.5 block font-medium text-white/80">{formatRupees(item.current_price)}</span></div>
                  <div className="rounded-lg bg-black/15 px-2.5 py-2"><span className="block text-[10px] text-white/40">Suggested price</span><span className="mt-0.5 block font-medium text-white/80">{formatRupees(item.suggested_price)}</span></div>
                  <div className="rounded-lg bg-black/15 px-2.5 py-2"><span className="block text-[10px] text-white/40">Inventory value</span><span className="mt-0.5 block font-medium text-white/80">{formatRupees(item.inventory_value_inr)}</span></div>
                </div>

                {item.requires_freshness_measurement && (
                  <p className="mt-3 rounded-lg border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2 text-[11px] leading-relaxed text-amber-100/75">A markdown is blocked until this batch has a recorded freshness measurement.</p>
                )}

                {item.needs_outcome && (
                  <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3">
                    <p className="text-xs font-medium text-emerald-100">Record the final batch disposition</p>
                    <p className="mt-1 text-[10px] text-white/45">Report the {item.applied_quantity} units after the markdown. This is operator-reported data used to evaluate future rules.</p>
                    {outcomeFormId === item.id ? (
                      <form
                        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          outcomeMutation.mutate({
                            recommendationId: item.id,
                            sold_units: Number(outcomeDraft.sold_units),
                            wasted_units: Number(outcomeDraft.wasted_units),
                            remaining_units: Number(outcomeDraft.remaining_units),
                            realized_avg_price: Number(outcomeDraft.realized_avg_price),
                          });
                        }}
                      >
                        {[
                          ['sold_units', 'Sold units'],
                          ['wasted_units', 'Wasted units'],
                          ['remaining_units', 'Remaining'],
                          ['realized_avg_price', 'Avg sale price ₹'],
                        ].map(([field, label]) => (
                          <label key={field} className="text-[10px] text-white/55">
                            {label}
                            <input
                              type="number"
                              min="0"
                              step={field === 'realized_avg_price' ? '0.01' : '1'}
                              required
                              value={outcomeDraft[field]}
                              onChange={(event) => setOutcomeDraft((draft) => ({ ...draft, [field]: event.target.value }))}
                              className="mt-1 min-h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2 text-xs text-white outline-none focus:border-emerald-300/40"
                            />
                          </label>
                        ))}
                        <div className="col-span-2 flex items-center justify-end gap-2 pt-1 sm:col-span-4">
                          <button type="button" onClick={() => setOutcomeFormId(null)} className="min-h-9 rounded-lg px-3 text-xs text-white/55 hover:bg-white/[0.06]">Cancel</button>
                          <button type="submit" disabled={busy} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-300 px-3 text-xs font-semibold text-[#07150e] disabled:opacity-50">
                            {outcomeMutation.isPending && pendingId === item.id && <Loader2 size={13} className="animate-spin" />}
                            Save batch outcome
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOutcomeDraft({ sold_units: '', wasted_units: '', remaining_units: '', realized_avg_price: String(item.current_price || '') });
                          setOutcomeFormId(item.id);
                        }}
                        className="mt-2 min-h-9 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-medium text-emerald-100 hover:bg-emerald-300/15"
                      >
                        Enter final disposition
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <p className="max-w-xl text-[10px] leading-relaxed text-white/40">{item.method} · {item.disclaimer}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => feedbackMutation.mutate(item.id)} disabled={busy} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 text-xs text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50" aria-label={`Dismiss ${item.product_name}`}>
                      <X size={13} /> Dismiss
                    </button>
                    {item.can_apply && (
                      <button type="button" onClick={() => applyMutation.mutate(item.id)} disabled={busy} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#FF9F1C] px-3 text-xs font-semibold text-[#1a1205] transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-65">
                        {busy && applyMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Apply markdown
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
