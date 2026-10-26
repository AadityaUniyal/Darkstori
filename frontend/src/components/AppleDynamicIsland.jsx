import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowDownRight, CheckCircle2, ChevronRight, Leaf, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const money = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount || 0);

export default function AppleDynamicIsland({ city = 'Bangalore' }) {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['decision-queue', city],
    queryFn: () => api.getDecisionQueue(city),
    enabled: Boolean(city),
    refetchInterval: 90000,
    staleTime: 30000,
  });

  const items = data?.recommendations || [];
  const first = items[0];
  const scrollToQueue = () => {
    setExpanded(false);
    document.getElementById('decision-queue')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="relative z-40 mb-4 flex justify-center">
      <motion.section layout className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0E121A]/95 text-white shadow-xl shadow-black/30 backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {isLoading ? <Loader2 size={15} className="shrink-0 animate-spin text-white/50" /> : isError ? <AlertTriangle size={15} className="shrink-0 text-amber-300" /> : first ? <AlertTriangle size={15} className="shrink-0 text-amber-300" /> : <CheckCircle2 size={15} className="shrink-0 text-emerald-300" />}
            <span className="truncate text-xs font-semibold sm:text-sm">
              {isLoading ? `Checking ${city} operations…` : isError ? 'Live decision queue unavailable' : first ? `${items.length} inventory action${items.length === 1 ? '' : 's'} need review` : `No urgent inventory actions in ${city}`}
            </span>
          </span>
          <ChevronRight size={15} className={`shrink-0 text-white/40 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.07] px-4 py-4 sm:px-5">
                {isError ? (
                  <p className="text-xs leading-relaxed text-white/55">This status requires the live API. No simulated order, transfer, or savings claims are shown here.</p>
                ) : first ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-xs font-semibold text-white/90"><Leaf size={13} className="text-emerald-300" />{first.title}</p>
                      <p className="mt-1 text-xs text-white/55">{first.store_name} · {first.quantity} units · expires in {first.hours_to_expiry}h</p>
                      {first.can_apply && <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300"><ArrowDownRight size={13} />{money(first.current_price)} → {money(first.suggested_price)} · operator approval required</p>}
                    </div>
                    <button type="button" onClick={scrollToQueue} className="min-h-9 shrink-0 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/15">Review action</button>
                  </div>
                ) : (
                  <p className="text-xs leading-relaxed text-white/55">No recorded batch in {city} currently meets the configured expiry and markdown rules.</p>
                )}
                <p className="mt-3 border-t border-white/[0.06] pt-2 text-[10px] text-white/35">Live batch data · rule-based guidance · no autonomous price changes</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
