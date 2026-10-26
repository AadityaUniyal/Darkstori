import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AddStoreModal from '../components/AddStoreModal';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Plus, Trash2, Check, Clock, ShieldCheck, FileDown, Layers, Landmark, IndianRupee, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import AmbientBackground from '../components/AmbientBackground';
import LazyMapView from '../components/LazyMapView';
import CannibalizationMap from '../components/CannibalizationMap';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';


const PRESET_HUBS = [
  { name: 'Koramangala 5th Block', city: 'Bangalore', nbhd_id: 1, rent: 55, capex: 1800000, size: 2200, routing: 12 },
  { name: 'Bandra West (Linking Rd)', city: 'Mumbai', nbhd_id: 6, rent: 85, capex: 2200000, size: 2400, routing: 14 },
  { name: 'Saket District Centre', city: 'Delhi', nbhd_id: 4, rent: 48, capex: 1600000, size: 2000, routing: 13 },
  { name: 'Gachibowli Financial Hub', city: 'Hyderabad', nbhd_id: 8, rent: 42, capex: 1500000, size: 2000, routing: 15 },
  { name: 'Koregaon Park North Main', city: 'Pune', nbhd_id: 9, rent: 40, capex: 1400000, size: 1800, routing: 12 },
];

export default function Simulator() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [drafts, setDrafts] = useState([]); // Array of { id, lat, lng, metrics }
  const [activeDraftId, setActiveDraftId] = useState(null);
  
  // Custom grounded cost inputs
  const [rentSqft, setRentSqft] = useState(45);
  const [staffSalary, setStaffSalary] = useState(25000);
  const [capexOverride, setCapexOverride] = useState(1500000);
  const [deliveryCost, setDeliveryCost] = useState(18);
  const [routingMins, setRoutingMins] = useState(15);
  const [storeSize, setStoreSize] = useState(1500);

  // Workflow states
  const [activeTab, setActiveTab] = useState('simulate'); // 'simulate' | 'proposals' | 'ledger' | 'cannibalization'
  const [reviewText, setReviewText] = useState('');
  // Interactive Scenario Builder State
  const [selectedCityName, setSelectedCityName] = useState('Bangalore');
  const [selectedNbhdId, setSelectedNbhdId] = useState(1);

  // Read URL params passed from Neighborhoods page
  useEffect(() => {
    const qNbhdId = searchParams.get('neighborhood_id');
    const qCity = searchParams.get('city');
    const qName = searchParams.get('name');
    if (qNbhdId) {
      setSelectedNbhdId(Number(qNbhdId));
    }
    if (qCity) {
      setSelectedCityName(qCity);
    }
    if (qName) {
      toast.info(`Pre-loaded micro-market: ${qName}`);
    }
  }, [searchParams]);
  const [surgeScenario, setSurgeScenario] = useState('normal'); // 'normal' | 'weekend' | 'monsoon'


  // Fetch all neighborhoods
  const { data: nbhds } = useQuery({
    queryKey: ['neighborhoods-all'],
    queryFn: () => api.getNeighborhoods(),
    staleTime: 60000,
  });

  // Fetch Proposals history
  const { data: proposals, isLoading: proposalsLoading, refetch: refetchProposals } = useQuery({
    queryKey: ['proposals-list'],
    queryFn: () => api.getProposals(),
  });

  // Fetch Audit Logs (Provenance Ledger)
  const { data: auditLogs, isLoading: auditsLoading, refetch: refetchAudits } = useQuery({
    queryKey: ['provenance-audit-logs'],
    queryFn: () => api.getAuditLogs(),
    refetchInterval: 5000
  });

  const neighborhoodList = Array.isArray(nbhds) ? nbhds : [];

  // ROI Predictor Mutation
  const predictROIMutation = useMutation({
    mutationFn: (payload) => api.predictROI(payload),
    onError: () => toast.error('Simulation unavailable. The connected prediction service did not return a result.'),
  });

  // Proposal workflow mutations
  const proposeMutation = useMutation({
    mutationFn: (simId) => api.proposeLocation(simId),
    onSuccess: () => {
      refetchProposals();
      setActiveTab('proposals');
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({ simId, comments }) => api.reviewLocation(simId, comments),
    onSuccess: () => {
      refetchProposals();
      setReviewText('');
    }
  });

  const approveMutation = useMutation({
    mutationFn: (simId) => api.approveLocation(simId),
    onSuccess: () => {
      refetchProposals();
      refetchAudits();
      setActiveTab('ledger');
      toast.success('Approval recorded. Register the physical store separately when it is ready.');
    }
  });

  const getNearestNeighborhood = (lat, lng) => {
    let minD = Infinity;
    let nearest = neighborhoodList[0];
    if (!nearest) return null;
    neighborhoodList.forEach(n => {
      const nLat = n.centroid_lat ?? n.latitude;
      const nLng = n.centroid_lng ?? n.longitude;
      if (!Number.isFinite(Number(nLat)) || !Number.isFinite(Number(nLng))) return;
      const dist = Math.pow(nLat - lat, 2) + Math.pow(nLng - lng, 2);
      if (dist < minD) {
        minD = dist;
        nearest = n;
      }
    });
    return nearest;
  };

  const handleMapSelect = (nb) => {
    if (drafts.length >= 3) {
      toast.warning("Maximum of 3 simultaneous simulations allowed for comparison.");
      return;
    }
    setPlacementMode(true);

    const lat = nb.centroid_lat ?? nb.lat;
    const lng = nb.centroid_lng ?? nb.lng;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      toast.error('This neighborhood has no mapped coordinates.');
      return;
    }

    const nearestNb = getNearestNeighborhood(lat, lng);

    predictROIMutation.mutate({
      neighborhood_id: nearestNb.neighborhood_id,
      investment_amount: capexOverride,
      store_size_sqft: storeSize,
      operating_hours: '08:00-22:00',
      rent_per_sqft: rentSqft,
      staff_salary_monthly: staffSalary,
      delivery_cost_per_order: deliveryCost,
      routing_constraint_mins: routingMins
    }, {
      onSuccess: (data) => {
        const newId = `Node-${nearestNb.neighborhood_id || 'Hub'}-${Date.now().toString().slice(-4)}`;
        const newDraft = {
          id: newId,
          dbId: data.simulation_id,
          name: nearestNb.neighborhood_name || `Store Candidate (${lat.toFixed(2)}, ${lng.toFixed(2)})`,
          lat,
          lng,
          metrics: {
            demand_score: Math.min(10, Math.round((data.predicted_daily_orders / 25) * 10) / 10),
            competition_gap: data.factors?.competition_stores ? Math.round((10 - data.factors.competition_stores * 1.5) * 10) / 10 : 7.2,
            logistics_viability: data.roi_12_months_pct > 15 ? 'High' : 'Medium',
            recommended_store_size_sqft: storeSize,
            estimated_breakeven_months: data.break_even_month,
            confidence: null,
            predicted_daily_orders: data.predicted_daily_orders,
            monthly_revenue: data.predicted_monthly_revenue,
            monthly_opex: data.monthly_operating_cost,
            roi_pct: data.roi_12_months_pct,
            routing_mins: data.routing_mins
          }
        };
        setDrafts(prev => [...prev, newDraft]);
        setActiveDraftId(newId);
        toast.success(`Simulation generated for ${newDraft.name}`);
        refetchProposals();
      }
    });
  };

  const clearAllDrafts = () => {
    setDrafts([]);
    setActiveDraftId(null);
    setPlacementMode(false);
  };

  const removeDraft = (id) => {
    const next = drafts.filter(d => d.id !== id);
    setDrafts(next);
    if (activeDraftId === id) {
      setActiveDraftId(next.length > 0 ? next[0].id : null);
    }
  };

  
  const filteredNeighborhoods = neighborhoodList.filter(n => {
    if (selectedCityName === 'All') return true;
    return (n.city || '').toLowerCase() === selectedCityName.toLowerCase();
  });

  const runSimulationForNbhd = (nb) => {
    if (!nb) return;
    const lat = nb.centroid_lat ?? nb.latitude;
    const lng = nb.centroid_lng ?? nb.longitude;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      toast.error('This neighborhood has no mapped coordinates.');
      return;
    }

    predictROIMutation.mutate({
      neighborhood_id: nb.neighborhood_id || 1,
      investment_amount: capexOverride,
      store_size_sqft: storeSize,
      operating_hours: '08:00-22:00',
      rent_per_sqft: rentSqft,
      staff_salary_monthly: staffSalary,
      delivery_cost_per_order: deliveryCost,
      routing_constraint_mins: routingMins
    }, {
      onSuccess: (data) => {
        const surgeMult = surgeScenario === 'monsoon' ? 1.35 : surgeScenario === 'weekend' ? 1.2 : 1.0;
        const projectedOrders = Math.round((data.predicted_daily_orders || 1450) * surgeMult);
        const monthlyRev = Math.round((data.predicted_monthly_revenue || 4350000) * surgeMult);
        const newId = `Node-${nb.neighborhood_id || 'Hub'}-${Date.now().toString().slice(-4)}`;
        const newDraft = {
          id: newId,
          dbId: data.simulation_id || newId,
          name: nb.neighborhood_name || 'Dark Store Node',
          city: nb.city || selectedCityName,
          pincode: nb.pincode || '560034',
          lat,
          lng,
          metrics: {
            demand_score: Math.min(10, Math.round((projectedOrders / 25) * 10) / 10),
            competition_gap: data.factors?.competition_stores ? Math.round((10 - data.factors.competition_stores * 1.5) * 10) / 10 : 8.2,
            logistics_viability: data.roi_12_months_pct > 15 ? 'High' : 'Medium',
            recommended_store_size_sqft: storeSize,
            estimated_breakeven_months: data.break_even_month || 6.5,
            confidence: null,
            predicted_daily_orders: projectedOrders,
            monthly_revenue: monthlyRev,
            monthly_opex: data.monthly_operating_cost || 1140000,
            roi_pct: data.roi_12_months_pct || 28.5,
            routing_mins: data.routing_mins || routingMins
          }
        };
        setDrafts(prev => [newDraft, ...prev.filter(d => d.name !== newDraft.name)].slice(0, 3));
        setActiveDraftId(newId);
        toast.success(`Simulation generated for ${newDraft.name}`);
        refetchProposals();
      }
    });
  };

  const handleSimulateCurrent = () => {
    const target = neighborhoodList.find(n => n.neighborhood_id === selectedNbhdId) || filteredNeighborhoods[0] || neighborhoodList[0];
    runSimulationForNbhd(target);
  };

  const handlePresetClick = (preset) => {
    setSelectedCityName(preset.city);
    setSelectedNbhdId(preset.nbhd_id);
    setRentSqft(preset.rent);
    setCapexOverride(preset.capex);
    setStoreSize(preset.size);
    setRoutingMins(preset.routing);
    const target = neighborhoodList.find(n => n.neighborhood_id === preset.nbhd_id);
    if (target) runSimulationForNbhd(target);
    else toast.error('This preset is not connected to a neighborhood record.');
  };

  // Preload first scenario on mount
  useEffect(() => {
    if (drafts.length === 0 && neighborhoodList.length > 0) {
      runSimulationForNbhd(neighborhoodList[0]);
    }
  }, [neighborhoodList.length]);

  const activeDraft = drafts.find(d => d.id === activeDraftId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', minHeight: 'auto', paddingBottom: '4rem', width: '100%', position: 'relative', zIndex: 1 }}>
      <AmbientBackground />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity color="#FF9F1C" size={32} /> Hyperlocal Store Simulator
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
            Explore indicative unit economics from connected neighborhood records. Results use a heuristic and do not provision a store or guarantee ROI.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {drafts.length > 0 && (
            <button
              onClick={clearAllDrafts}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={14} /> Clear Nodes
            </button>
          )}
          <button
            onClick={() => setPlacementMode(!placementMode)}
            className="btn-primary"
            style={{
              background: placementMode ? '#34C759' : '#FF9F1C',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 113, 227, 0.3)'
            }}
          >
            <Plus size={16} />
            {placementMode ? 'Map Placement Active' : 'Enable Placement Mode'}
          </button>
        </div>
      </div>

            {/* Quick Market Presets Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          ⚡ 1-Click Greenfield Presets:
        </span>
        {PRESET_HUBS.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedNbhdId === preset.nbhd_id ? '1px solid #FF9F1C' : '1px solid rgba(255,255,255,0.1)',
              background: selectedNbhdId === preset.nbhd_id ? 'rgba(0, 113, 227, 0.2)' : 'rgba(255,255,255,0.03)',
              color: selectedNbhdId === preset.nbhd_id ? '#38BDF8' : 'var(--color-text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Zap size={13} color="#FF9F1C" />
            {preset.name} <span style={{ opacity: 0.6, fontSize: '0.72rem' }}>({preset.city})</span>
          </button>
        ))}
      </div>

      {/* Main Responsive Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '28px', alignItems: 'start' }}>
        
        {/* Left Side: Map + Cost Configuration Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Greenfield Scenario Builder Box */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(0, 113, 227, 0.3)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Landmark size={20} color="#FF9F1C" /> Greenfield Scenario Builder
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                  Configure dark store format, capex budget, and delivery radius constraints to predict localized ROI.
                </p>
              </div>
              <button
                onClick={() => handleSimulateCurrent()}
                disabled={predictROIMutation.isPending}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #FF9F1C, #0284C7)',
                  border: 'none',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0, 113, 227, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {predictROIMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                Run Greenfield Simulation
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              {/* City Select */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Focus City
                </label>
                <select
                  value={selectedCityName}
                  onChange={(e) => setSelectedCityName(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--color-text-primary)' }}
                >
                  {['Bangalore', 'Delhi', 'Mumbai', 'Hyderabad', 'Pune', 'All'].map(c => <option key={c} value={c} style={{ background: '#0E121A' }}>{c}</option>)}
                </select>
              </div>

              {/* Micro-market Select */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Target Micro-Market
                </label>
                <select
                  value={selectedNbhdId}
                  onChange={(e) => setSelectedNbhdId(Number(e.target.value))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '8px 12px', color: 'var(--color-text-primary)' }}
                >
                  {filteredNeighborhoods.map(n => (
                    <option key={n.neighborhood_id} value={n.neighborhood_id} style={{ background: '#0E121A' }}>
                      {n.neighborhood_name} ({n.pincode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Store Format */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Store Format
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { label: 'Express (800)', size: 800 },
                    { label: 'Standard (1500)', size: 1500 },
                    { label: 'Mega (3000)', size: 3000 }
                  ].map(fmt => (
                    <button
                      key={fmt.size}
                      type="button"
                      onClick={() => setStoreSize(fmt.size)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '0.72rem',
                        borderRadius: '8px',
                        border: storeSize === fmt.size ? '1px solid #FF9F1C' : '1px solid var(--color-border)',
                        background: storeSize === fmt.size ? 'rgba(0, 113, 227, 0.2)' : 'transparent',
                        color: storeSize === fmt.size ? '#38BDF8' : 'var(--color-text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {fmt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Demand Surge Scenario */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Surge Multiplier
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { id: 'normal', label: 'Base 1.0x' },
                    { id: 'weekend', label: 'Weekend 1.2x' },
                    { id: 'monsoon', label: 'Rain 1.35x' }
                  ].map(scn => (
                    <button
                      key={scn.id}
                      type="button"
                      onClick={() => setSurgeScenario(scn.id)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        fontSize: '0.72rem',
                        borderRadius: '8px',
                        border: surgeScenario === scn.id ? '1px solid #10B981' : '1px solid var(--color-border)',
                        background: surgeScenario === scn.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: surgeScenario === scn.id ? '#34D399' : 'var(--color-text-secondary)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {scn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '16px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '24px', left: '28px', zIndex: 5, background: 'rgba(14, 18, 26, 0.85)', backdropFilter: 'blur(12px)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.78rem', color: '#38BDF8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}>
              <Plus size={13} /> Click any location on the map to run localized ROI projection
            </div>
            <LazyMapView
              showHeatmap={true}
              height="450px"
              liveOrders={drafts.map(d => ({ ...d, createdTime: Date.now() }))}
              onSelect={handleMapSelect}
            />
          </div>

          {/* Configuration Cost Panel */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={18} color="#FF9F1C" /> Grounded Cost & Serviceability Settings
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Capital Investment (Capex)</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>₹{(capexOverride / 100000).toFixed(1)}L</span>
                </div>
                <input 
                  type="range" min={200000} max={5000000} step={50000}
                  value={capexOverride} onChange={(e) => setCapexOverride(Number(e.target.value))}
                  style={{ accentColor: '#FF9F1C', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Rent per Sqft (Monthly)</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>₹{rentSqft}/sqft</span>
                </div>
                <input 
                  type="range" min={20} max={180} step={2}
                  value={rentSqft} onChange={(e) => setRentSqft(Number(e.target.value))}
                  style={{ accentColor: '#FF9F1C', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Staff Salary (Monthly)</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>₹{staffSalary.toLocaleString('en-IN')}</span>
                </div>
                <input 
                  type="range" min={15000} max={55000} step={1000}
                  value={staffSalary} onChange={(e) => setStaffSalary(Number(e.target.value))}
                  style={{ accentColor: '#FF9F1C', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Delivery Cost per Order</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>₹{deliveryCost}</span>
                </div>
                <input 
                  type="range" min={10} max={45} step={1}
                  value={deliveryCost} onChange={(e) => setDeliveryCost(Number(e.target.value))}
                  style={{ accentColor: '#FF9F1C', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Store Size (Sqft)</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{storeSize} sqft</span>
                </div>
                <input 
                  type="range" min={500} max={5000} step={100}
                  value={storeSize} onChange={(e) => setStoreSize(Number(e.target.value))}
                  style={{ accentColor: '#FF9F1C', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Serviceability Promise</span>
                  <span style={{ color: '#38BDF8', fontWeight: 600 }}>{routingMins} mins</span>
                </div>
                <input 
                  type="range" min={5} max={30} step={1}
                  value={routingMins} onChange={(e) => setRoutingMins(Number(e.target.value))}
                  style={{ accentColor: '#38BDF8', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Tab selectors */}
          <div style={{ display: 'flex', gap: '4px', background: '#0E121A', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button 
              onClick={() => setActiveTab('simulate')}
              style={{
                flex: 1, padding: '8px 0', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                border: 'none', borderRadius: '8px',
                background: activeTab === 'simulate' ? '#FF9F1C' : 'transparent',
                color: activeTab === 'simulate' ? '#FFFFFF' : 'var(--color-text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              Simulation ({drafts.length})
            </button>
            <button 
              onClick={() => setActiveTab('proposals')}
              style={{
                flex: 1, padding: '8px 0', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                border: 'none', borderRadius: '8px',
                background: activeTab === 'proposals' ? '#FF9F1C' : 'transparent',
                color: activeTab === 'proposals' ? '#FFFFFF' : 'var(--color-text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              Proposals ({proposals?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab('ledger')}
              style={{
                flex: 1, padding: '8px 0', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                border: 'none', borderRadius: '8px',
                background: activeTab === 'ledger' ? '#FF9F1C' : 'transparent',
                color: activeTab === 'ledger' ? '#FFFFFF' : 'var(--color-text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              Ledger ({auditLogs?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab('cannibalization')}
              style={{
                flex: 1, padding: '8px 0', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                border: 'none', borderRadius: '8px',
                background: activeTab === 'cannibalization' ? '#FF9F1C' : 'transparent',
                color: activeTab === 'cannibalization' ? '#FFFFFF' : 'var(--color-text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              Cannibalization
            </button>
          </div>

          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
            
            {activeTab === 'simulate' && (
              drafts.length === 0 ? (
                <EmptyState
                  title="Simulation Mode Idle"
                  description="Enable Placement Mode and click on the map grid to run localized projection."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  {drafts.length > 1 && (
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '4px' }}>
                      {drafts.map(d => (
                        <button
                          key={d.id}
                          onClick={() => setActiveDraftId(d.id)}
                          style={{
                            flex: 1, padding: '6px 0', fontSize: '0.74rem', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            background: activeDraftId === d.id ? '#FF9F1C' : 'transparent',
                            color: activeDraftId === d.id ? '#FFFFFF' : 'var(--color-text-secondary)',
                            fontWeight: 600
                          }}
                        >
                          Node {d.id.slice(-4)}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeDraft && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{activeDraft.name}</span>
                        <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{activeDraft.id}</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Projected Daily Orders:</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>{activeDraft.metrics.predicted_daily_orders}</strong>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Monthly Revenue:</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{activeDraft.metrics.monthly_revenue.toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Monthly Opex:</span>
                          <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{activeDraft.metrics.monthly_opex.toLocaleString('en-IN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Route Transit Time:</span>
                          <strong style={{ color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>{activeDraft.metrics.routing_mins.toFixed(1)} mins</strong>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>ROI 12 Months:</span>
                          <strong style={{ color: activeDraft.metrics.roi_pct > 15 ? '#34C759' : '#FF9500', fontFamily: 'var(--font-mono)' }}>{activeDraft.metrics.roi_pct.toFixed(1)}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Estimated Breakeven:</span>
                          <strong style={{ color: '#38BDF8', fontFamily: 'var(--font-mono)' }}>{activeDraft.metrics.estimated_breakeven_months} months</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(!user?.role || user.role === 'expansion_lead' || user.role === 'admin') && (
                          <button 
                            onClick={() => proposeMutation.mutate(activeDraft.dbId)}
                            className="btn-primary" style={{ width: '100%', background: '#FF9F1C', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700, padding: '10px 0', borderRadius: '10px', cursor: 'pointer' }}
                          >
                            <Check size={14} /> Propose Location
                          </button>
                        )}

                        <button
                          onClick={() => removeDraft(activeDraft.id)}
                          className="btn-destructive" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 0', borderRadius: '10px' }}
                        >
                          <Trash2 size={14} /> Discard Node
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {activeTab === 'proposals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>Locations Proposals</span>
                  <button onClick={() => refetchProposals()} style={{ background: 'transparent', border: 'none', color: 'var(--peacock-500)', cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '350px' }}>
                  {proposalsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-lg" />)}
                    </div>
                  ) : proposals?.length === 0 ? (
                    <EmptyState
                      title="No active proposals"
                      description="Propose a location from a simulation draft to begin the financial review workflow."
                    />
                  ) : (
                    proposals?.map(p => (
                      <div key={p.simulation_id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{p.neighborhood_name}</span>
                          <span className="badge" style={{
                            background: p.status === 'approved' ? 'rgba(14, 124, 134, 0.15)' : p.status === 'reviewed' ? 'rgba(232, 163, 61, 0.15)' : 'rgba(255, 122, 26, 0.12)',
                            color: p.status === 'approved' ? 'var(--peacock-500)' : p.status === 'reviewed' ? 'var(--marigold-500)' : 'var(--saffron-500)'
                          }}>
                            {p.status?.toUpperCase() || 'PROPOSED'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                          Capex: ₹{(p.investment_amount / 100000).toFixed(1)}L | Breakeven: {p.break_even_month}m
                        </div>

                        {p.comments && (
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.74rem', color: 'var(--color-text-secondary)' }}>
                            <strong>Review:</strong> {p.comments}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                          {(p.status === 'simulation' || p.status === 'draft') && (
                            <button
                              onClick={() => proposeMutation.mutate(p.simulation_id)}
                              disabled={proposeMutation.isPending}
                              className="btn-secondary"
                              style={{ width: '100%', padding: '6px 0', fontSize: '0.78rem' }}
                            >
                              Submit Scenario for Review
                            </button>
                          )}
                          {(!user?.role || user?.role === 'finance_reviewer' || user?.role === 'admin' || user?.role === 'user') && p.status === 'proposed' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                              <input 
                                type="text" placeholder="Add financial audit notes..." 
                                value={reviewText} onChange={(e) => setReviewText(e.target.value)}
                                style={{ width: '100%', background: '#0B0D14', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '4px 8px', color: 'var(--color-text-primary)', fontSize: '0.78rem' }}
                              />
                              <button 
                                onClick={() => reviewMutation.mutate({ simId: p.simulation_id, comments: reviewText })}
                                className="btn-secondary" style={{ width: '100%', padding: '4px 0', fontSize: '0.78rem' }}
                              >
                                Submit Financial Review
                              </button>
                            </div>
                          )}

                          {(!user?.role || user?.role === 'regional_head' || user?.role === 'admin' || user?.role === 'user') && p.status === 'reviewed' && (
                            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                              <button 
                                onClick={() => {
                                  approveMutation.mutate(p.simulation_id);
                                }}
                                className="btn-secondary" style={{ flex: 1, background: '#34C759', border: 'none', color: '#ffffff', padding: '6px 0', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer' }}
                              >
                                Approve Scenario
                              </button>
                            </div>
                          )}

                          {p.status === 'approved' && (
                            <button
                              onClick={() => setIsAddStoreOpen(true)}
                              className="btn-primary"
                              style={{ width: '100%', background: 'linear-gradient(135deg, #FF9F1C, #0284C7)', border: 'none', color: '#fff', padding: '8px 0', fontSize: '0.78rem', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                            >
                              <Plus size={13} /> Register Physical Store
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ledger' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="var(--peacock-500)" /> Decision Ledger
                  </span>
                  <button onClick={() => refetchAudits()} style={{ background: 'transparent', border: 'none', color: 'var(--peacock-500)', cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '350px' }}>
                  {auditsLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-lg" />)}
                    </div>
                  ) : auditLogs?.length === 0 ? (
                    <EmptyState
                      title="Ledger is empty"
                      description="No approved stores found in the provenance decision log."
                    />
                  ) : (
                    auditLogs?.map((log) => {
                      const prov = log.new_state?.decision_provenance || log.new_state;
                      return (
                        <div key={log.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span style={{ color: 'var(--color-text-primary)' }}>{log.new_state?.store_provisioned || `Scenario #${log.target_id} approved`}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--peacock-500)' }}>{prov?.model_version ? `v${prov.model_version}` : 'Heuristic'}</span>
                          </div>
                          <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.74rem' }}>
                            Approver: {prov?.approver?.email || 'Recorded operator'}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.7rem', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '4px' }}>
                            <span>Capex: {prov?.parameters_snapshot?.investment != null ? `₹${Number(prov.parameters_snapshot.investment).toLocaleString('en-IN')}` : 'Not recorded'}</span>
                            <span>Orders estimate: {prov?.parameters_snapshot?.predicted_daily_orders != null ? `${prov.parameters_snapshot.predicted_daily_orders} / day` : 'Not recorded'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'cannibalization' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.94rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Cannibalization Simulator
                  </span>
                </div>
                <CannibalizationMap />
              </div>
            )}

          </div>
        </div>

      </div>
      <AddStoreModal isOpen={isAddStoreOpen} onClose={() => setIsAddStoreOpen(false)} />
    </div>
  );
}
