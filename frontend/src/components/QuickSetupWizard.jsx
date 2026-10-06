import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Building2,
  Leaf,
  Compass,
  Workflow,
  CheckCircle2,
  Circle,
  ArrowRight,
  Database,
  Loader2,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import AddStoreModal from './AddStoreModal';
import AddBatchModal from './AddBatchModal';

export default function QuickSetupWizard({ totalStores = 0, totalBatches = 0, totalPlaybooks = 0 }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Compute completed tasks
  const isStoreDone = totalStores > 0;
  const isBatchDone = totalBatches > 0;
  const isScoutDone = false; // user can click to run
  const isPlaybookDone = totalPlaybooks > 0;

  const completedCount = (isStoreDone ? 1 : 0) + (isBatchDone ? 1 : 0) + (isPlaybookDone ? 1 : 0);
  const progressPercent = Math.round((completedCount / 4) * 100);

  const seedMutation = useMutation({
    mutationFn: async () => {
      return await api.seedOptionA();
    },
    onSuccess: () => {
      toast.success('Successfully loaded 5 Focus Metro benchmarks (Bangalore, Mumbai, Delhi, Hyderabad, Pune)!');
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['stores-list'] });
      queryClient.invalidateQueries({ queryKey: ['expansion-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['resilience-batches'] });
    },
    onError: (err) => {
      toast.error('Failed to load benchmark dataset. Check network connection.');
    }
  });

  return (
    <>
      <div className="w-full bg-gradient-to-br from-[#121826]/90 via-[#0f1420]/80 to-[#0b0f17]/90 border border-border/80 rounded-2xl p-6 shadow-xl backdrop-blur-xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles size={13} />
              <span>Hub Setup & Onboarding</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">
              Welcome to Your Darkstori Operating System
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Configure your dark store network in 4 straightforward steps, or load the verified Indian metro benchmarks to test drive real-world analytics.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Setup Progress:</span>
              <span className="text-sm font-bold text-emerald-400">{progressPercent}%</span>
            </div>
            <div className="w-44 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4 Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
          {/* Step 1 */}
          <div
            onClick={() => setIsStoreModalOpen(true)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              isStoreDone
                ? 'bg-emerald-500/5 border-emerald-500/30 text-foreground'
                : 'bg-[#0b0f17]/60 border-border/60 hover:border-emerald-500/40 hover:bg-white/[0.02]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                {isStoreDone ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <Circle size={18} className="text-muted-foreground/40" />
                )}
              </div>
              <h4 className="font-semibold text-sm text-foreground mb-1">1. Add Dark Store Hub</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {isStoreDone ? `${totalStores} active dark store(s) connected` : 'Register your first physical micro-fulfillment hub'}
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <span>{isStoreDone ? 'Add Another Hub' : 'Register Hub'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => setIsBatchModalOpen(true)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              isBatchDone
                ? 'bg-amber-500/5 border-amber-500/30 text-foreground'
                : 'bg-[#0b0f17]/60 border-border/60 hover:border-amber-500/40 hover:bg-white/[0.02]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Leaf size={16} />
                </div>
                {isBatchDone ? (
                  <CheckCircle2 size={18} className="text-amber-400" />
                ) : (
                  <Circle size={18} className="text-muted-foreground/40" />
                )}
              </div>
              <h4 className="font-semibold text-sm text-foreground mb-1">2. Add Perishable Batch</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {isBatchDone ? `${totalBatches} active batch(es) tracked` : 'Track dynamic Sigmoid markdown decay for fresh produce'}
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-amber-400 flex items-center gap-1">
              <span>{isBatchDone ? 'Add Another Batch' : 'Add Produce Batch'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => navigate('/cockpit')}
            className="p-4 rounded-xl border bg-[#0b0f17]/60 border-border/60 hover:border-indigo-500/40 hover:bg-white/[0.02] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Compass size={16} />
                </div>
                <Circle size={18} className="text-muted-foreground/40" />
              </div>
              <h4 className="font-semibold text-sm text-foreground mb-1">3. Greenfield Scouting</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                Simulate competitor whitespace & cannibalization via PostGIS
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-indigo-400 flex items-center gap-1">
              <span>Launch Greenfield Scout</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => navigate('/playbooks')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              isPlaybookDone
                ? 'bg-purple-500/5 border-purple-500/30 text-foreground'
                : 'bg-[#0b0f17]/60 border-border/60 hover:border-purple-500/40 hover:bg-white/[0.02]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Workflow size={16} />
                </div>
                {isPlaybookDone ? (
                  <CheckCircle2 size={18} className="text-purple-400" />
                ) : (
                  <Circle size={18} className="text-muted-foreground/40" />
                )}
              </div>
              <h4 className="font-semibold text-sm text-foreground mb-1">4. Autonomous Playbooks</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {isPlaybookDone ? `${totalPlaybooks} rule(s) active` : 'Automate alerts when SLA breaches or rain surge occurs'}
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-purple-400 flex items-center gap-1">
              <span>{isPlaybookDone ? 'Manage Rules' : 'Create First Rule'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Optional Benchmark Seeding Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-emerald-400" />
            <span>Want to test with full multi-city data instantly?</span>
          </div>

          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-foreground font-semibold flex items-center gap-2 transition-all"
          >
            {seedMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin text-emerald-400" />
                <span>Loading Metro Benchmarks...</span>
              </>
            ) : (
              <>
                <Database size={14} className="text-emerald-400" />
                <span>Load 5 Focus Metro Benchmark Pack</span>
              </>
            )}
          </button>
        </div>
      </div>

      <AddStoreModal isOpen={isStoreModalOpen} onClose={() => setIsStoreModalOpen(false)} />
      <AddBatchModal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} />
    </>
  );
}
