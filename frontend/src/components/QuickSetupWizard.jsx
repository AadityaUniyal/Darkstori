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
      <div className="w-full bg-[#0E121A]/80 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#0071E3]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0071E3]/10 border border-[#0071E3]/20 text-[#38BDF8] text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles size={13} />
              <span>Hub Setup & Onboarding</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-display text-white">
              Welcome to Your Darkstori Operating System
            </h2>
            <p className="text-sm text-[#86868B] mt-1 max-w-xl">
              Configure your dark store network in 4 straightforward steps, or load verified Indian metro benchmarks to test drive real-world analytics.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#86868B]">Setup Progress:</span>
              <span className="text-sm font-bold text-[#38BDF8]">{progressPercent}%</span>
            </div>
            <div className="w-44 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#0071E3] to-[#38BDF8] transition-all duration-500 rounded-full"
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
                ? 'bg-[#0071E3]/10 border-[#0071E3]/30 text-white'
                : 'bg-[#141A24]/60 border-white/10 hover:border-[#0071E3]/40 hover:bg-[#141A24]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0071E3]/15 text-[#38BDF8] flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                {isStoreDone ? (
                  <CheckCircle2 size={18} className="text-[#34C759]" />
                ) : (
                  <Circle size={18} className="text-white/30" />
                )}
              </div>
              <h4 className="font-semibold text-sm text-white mb-1">1. Add Dark Store Hub</h4>
              <p className="text-xs text-[#86868B] line-clamp-2">
                {isStoreDone ? `${totalStores} active dark store(s) connected` : 'Register your first physical micro-fulfillment hub'}
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-[#38BDF8] flex items-center gap-1">
              <span>{isStoreDone ? 'Add Another Hub' : 'Register Hub'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => setIsBatchModalOpen(true)}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              isBatchDone
                ? 'bg-[#0071E3]/10 border-[#0071E3]/30 text-white'
                : 'bg-[#141A24]/60 border-white/10 hover:border-[#0071E3]/40 hover:bg-[#141A24]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0071E3]/15 text-[#38BDF8] flex items-center justify-center">
                  <Leaf size={16} />
                </div>
                {isBatchDone ? (
                  <CheckCircle2 size={18} className="text-[#34C759]" />
                ) : (
                  <Circle size={18} className="text-white/30" />
                )}
              </div>
              <h4 className="font-semibold text-sm text-white mb-1">2. Add Perishable Batch</h4>
              <p className="text-xs text-[#86868B] line-clamp-2">
                {isBatchDone ? `${totalBatches} active batch(es) tracked` : 'Track dynamic Sigmoid markdown decay for fresh produce'}
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-[#38BDF8] flex items-center gap-1">
              <span>{isBatchDone ? 'Add Another Batch' : 'Add Produce Batch'}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => navigate('/cockpit')}
            className="p-4 rounded-xl border bg-[#141A24]/60 border-white/10 hover:border-[#0071E3]/40 hover:bg-[#141A24] transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0071E3]/15 text-[#38BDF8] flex items-center justify-center">
                  <Compass size={16} />
                </div>
                <Circle size={18} className="text-white/30" />
              </div>
              <h4 className="font-semibold text-sm text-white mb-1">3. Greenfield Scouting</h4>
              <p className="text-xs text-[#86868B] line-clamp-2">
                Simulate competitor whitespace & cannibalization via PostGIS
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-[#38BDF8] flex items-center gap-1">
              <span>Launch Greenfield Scout</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => navigate('/playbooks')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              isPlaybookDone
                ? 'bg-[#0071E3]/10 border-[#0071E3]/30 text-white'
                : 'bg-[#141A24]/60 border-white/10 hover:border-[#0071E3]/40 hover:bg-[#141A24]'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#0071E3]/15 text-[#38BDF8] flex items-center justify-center">
                  <Workflow size={16} />
                </div>
                {isPlaybookDone ? (
                  <CheckCircle2 size={18} className="text-[#34C759]" />
                ) : (
                  <Circle size={18} className="text-white/30" />
                )}
              </div>
              <h4 className="font-semibold text-sm text-white mb-1">4. Autonomous Playbooks</h4>
              <p className="text-xs text-[#86868B] line-clamp-2">
                {isPlaybookDone ? `${totalPlaybooks} rule(s) active` : 'Automate alerts when SLA breaches or rain surge occurs'}
              </p>
            </div>
            <button className="mt-3 text-xs font-semibold text-[#38BDF8] flex items-center gap-1">
              <span>{isPlaybookDone ? 'Manage Rules' : 'Create First Rule'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Optional Benchmark Seeding Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-[#86868B]">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-[#38BDF8]" />
            <span>Want to test with full multi-city data instantly?</span>
          </div>

          <button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-[#0071E3]/20 hover:border-[#0071E3]/30 text-white font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            {seedMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin text-[#38BDF8]" />
                <span>Loading Metro Benchmarks...</span>
              </>
            ) : (
              <>
                <Database size={14} className="text-[#38BDF8]" />
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
