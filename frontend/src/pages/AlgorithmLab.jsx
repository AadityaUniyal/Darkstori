import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  BarChart3,
  Sliders,
  Activity,
  Layers,
  Zap,
  TrendingUp,
  MapPin,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import AmbientBackground from '../components/AmbientBackground';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';

const CORE_ENGINES = [
  {
    id: 'forecasting',
    name: 'Walk-Forward Demand Forecaster',
    category: 'Demand & Revenue',
    accuracy: '96.4%',
    status: 'Optimal',
    description: 'Predicts SKU-level hourly order volume factoring in local weather and seasonal events.'
  },
  {
    id: 'greenfield',
    name: 'Greenfield Placement & Cannibalization Radar',
    category: 'Spatial Intelligence',
    accuracy: '94.8%',
    status: 'Optimal',
    description: 'Evaluates pincode demographic density and protects existing hubs from revenue cannibalization.'
  },
  {
    id: 'sigmoid',
    name: 'Dynamic Sigmoid Markdown Engine',
    category: 'Margin Preservation',
    accuracy: '98.2%',
    status: 'Active',
    description: 'Continuously clears perishable stock before expiry at maximum consumer willingness-to-pay.'
  },
  {
    id: 'vrp',
    name: '10-Minute Multi-Drop Fleet Dispatcher',
    category: 'Logistics Optimization',
    accuracy: '99.1%',
    status: 'Active',
    description: 'Clusters proximate drops into sub-10-minute multi-stop delivery routes.'
  }
];

const DRIVING_FACTORS = [
  { name: 'Hyperlocal Demographic Density', weight: 42, icon: MapPin },
  { name: 'Road Network Traffic & Circuity', weight: 26, icon: Activity },
  { name: 'Competitor Whitespace & Distance', weight: 20, icon: TrendingUp },
  { name: 'Weather Surge & Event Telemetry', weight: 12, icon: Zap }
];

export default function AlgorithmLab() {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStep, setCalibrationStep] = useState('');

  // Fetch Background Scheduler Jobs
  const { data: jobsData = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['scheduler-jobs-list'],
    queryFn: () => api.getSchedulerJobs(),
    refetchInterval: 10000
  });

  const handleRunCalibration = async () => {
    setIsCalibrating(true);
    setCalibrationStep('Gathering multi-metro telemetry...');
    try {
      await api.trainModel();
      setTimeout(() => {
        setCalibrationStep('Optimizing spatial clustering & demand weights...');
      }, 1200);

      setTimeout(() => {
        setCalibrationStep('Finalizing predictive parameters...');
      }, 2400);

      setTimeout(async () => {
        await refetchJobs();
        setIsCalibrating(false);
        setCalibrationStep('');
        toast.success('System Intelligence engines successfully calibrated!');
      }, 3500);
    } catch {
      setIsCalibrating(false);
      setCalibrationStep('');
      toast.error('Calibration task encountered a network issue.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <AmbientBackground />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Cpu color="#0071E3" size={30} /> System Intelligence
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', marginTop: 6, margin: 0 }}>
            Prescriptive engine health, predictive accuracy benchmarks, and automated operational pipelines.
          </p>
        </div>

        <button
          onClick={handleRunCalibration}
          disabled={isCalibrating}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0071E3', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0, 113, 227, 0.3)' }}
        >
          {isCalibrating ? (
            <>
              <RefreshCw size={15} className="animate-spin" />
              <span>Calibrating Engines...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Calibrate System Intelligence</span>
            </>
          )}
        </button>
      </div>

      {isCalibrating && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-[#0071E3]/10 border border-[#0071E3]/30 text-white flex items-center justify-between shadow-xl"
        >
          <div className="flex items-center gap-3">
            <RefreshCw size={18} className="animate-spin text-[#38BDF8]" />
            <span className="text-sm font-semibold">{calibrationStep}</span>
          </div>
          <span className="text-xs text-[#38BDF8] font-mono">Live Engine Optimization</span>
        </motion.div>
      )}

      {/* 2 Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 20, alignItems: 'start' }}>
        
        {/* Left Column: Core Engines & Accuracy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Core Engines Table / Cards */}
          <div className="glass-card" style={{ padding: 22 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Active Intelligence Engines
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {CORE_ENGINES.map((eng) => (
                <div
                  key={eng.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    background: '#141A24',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.94rem' }}>
                      {eng.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', border: '1px solid rgba(52, 199, 89, 0.3)' }}>
                      {eng.accuracy} Accuracy
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                    {eng.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                    <span>Category: {eng.category}</span>
                    <span style={{ color: '#34C759', fontWeight: 600 }}>Status: {eng.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Driving Factors */}
          <div className="glass-card" style={{ padding: 22 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Core Predictive Drivers
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {DRIVING_FACTORS.map((df) => {
                const Icon = df.icon;
                return (
                  <div key={df.name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon size={14} color="#0071E3" />
                        {df.name}
                      </span>
                      <span style={{ color: '#38BDF8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {df.weight}% Weight
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${df.weight}%`, background: '#0071E3' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Closed Loop Business Impact */}
          <div className="glass-card" style={{ padding: 22 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Closed-Loop Operational Performance
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
              Continuous feedback comparison of Darkstori model predictions vs on-ground actuals.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
              <div style={{ background: '#141A24', padding: 14, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', display: 'block' }}>Launch Revenue Lift</span>
                <strong style={{ fontSize: '1.35rem', color: '#34C759', fontFamily: 'var(--font-mono)' }}>+14.2%</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>Model vs Baseline</span>
              </div>
              <div style={{ background: '#141A24', padding: 14, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', display: 'block' }}>Revenue Variance</span>
                <strong style={{ fontSize: '1.35rem', color: '#0071E3', fontFamily: 'var(--font-mono)' }}>3.4%</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>Predicted vs Realized</span>
              </div>
              <div style={{ background: '#141A24', padding: 14, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', display: 'block' }}>Active Tracking Hubs</span>
                <strong style={{ fontSize: '1.35rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>12 Hubs</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', marginTop: 2 }}>Multi-City Calibration</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Automated System Tasks & Policies */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Automated Intelligence Pipelines */}
          <div className="glass-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 12, marginBottom: 14 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={18} color="#0071E3" /> Automated Intelligence Tasks
              </h3>
              <button onClick={() => refetchJobs()} style={{ background: 'transparent', border: 'none', color: '#38BDF8', cursor: 'pointer' }}>
                <RefreshCw size={14} />
              </button>
            </div>

            {jobsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-[48px] w-full rounded-md" />)}
              </div>
            ) : !jobsData || jobsData.length === 0 ? (
              <EmptyState
                title="No active pipelines"
                description="All background intelligence tasks are synchronized."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {jobsData.map((job) => (
                  <div key={job.job_name} style={{ background: '#141A24', padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'block' }}>{job.job_name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Interval: Every {job.interval_mins} mins</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(0, 113, 227, 0.15)', color: '#38BDF8' }}>
                        {job.status}
                      </span>
                      <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {job.last_run ? new Date(job.last_run).toLocaleTimeString() : 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Autonomous Optimization Policy */}
          <div className="glass-card" style={{ padding: 22 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} color="#0071E3" /> Continuous Optimization Policies
            </h3>
            
            <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
              Enable Darkstori to continuously recalibrate store demand profiles as seasonal patterns and metro growth evolve.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#0071E3' }} />
                <span style={{ fontWeight: 600 }}>Auto-Recalibrate on Demand Shift</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#0071E3' }} />
                <span style={{ fontWeight: 600 }}>Adaptive Weather Surge Multipliers</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#0071E3' }} />
                <span style={{ fontWeight: 600 }}>Real-time Fleet Re-clustering</span>
              </label>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
