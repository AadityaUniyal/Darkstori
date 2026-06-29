import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Plus, Trash2, Check, Clock, ShieldCheck, FileDown, Layers, Landmark, IndianRupee, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AmbientBackground from '../components/AmbientBackground';
import MapView from '../components/MapView';

export default function Simulator() {
  const { user } = useAuth();
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
  const [activeTab, setActiveTab] = useState('simulate'); // 'simulate' | 'proposals' | 'ledger'
  const [reviewText, setReviewText] = useState('');

  // Fetch all neighborhoods
  const { data: nbhds } = useQuery({
    queryKey: ['neighborhoods-all'],
    queryFn: () => api.getNeighborhoods(),
    staleTime: 60000,
  });

  // Fetch Proposals history
  const { data: proposals, refetch: refetchProposals } = useQuery({
    queryKey: ['proposals-list'],
    queryFn: () => api.getProposals(),
  });

  // Fetch Audit Logs (Provenance Ledger)
  const { data: auditLogs, refetch: refetchAudits } = useQuery({
    queryKey: ['provenance-audit-logs'],
    queryFn: () => api.getAuditLogs(),
    refetchInterval: 5000
  });

  const fallbackNeighborhoods = [
    { neighborhood_id: 1, neighborhood_name: 'Koramangala', pincode: '560034', centroid_lat: 12.9716, centroid_lng: 77.5946, population: 150000, avg_household_income: 950000.0, working_professionals_pct: 72.0, competition_intensity: 'High' },
    { neighborhood_id: 2, neighborhood_name: 'Indiranagar', pincode: '560038', centroid_lat: 12.9986, centroid_lng: 77.6386, population: 120000, avg_household_income: 1100000.0, working_professionals_pct: 68.0, competition_intensity: 'High' },
    { neighborhood_id: 3, neighborhood_name: 'HSR Layout', pincode: '560102', centroid_lat: 12.9116, centroid_lng: 77.6446, population: 180000, avg_household_income: 850000.0, working_professionals_pct: 75.0, competition_intensity: 'Medium' },
  ];

  const neighborhoodList = nbhds && nbhds.length > 0 ? nbhds : fallbackNeighborhoods;

  // ROI Predictor Mutation
  const predictROIMutation = useMutation({
    mutationFn: (payload) => api.predictROI(payload),
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
    }
  });

  const getNearestNeighborhood = (lat, lng) => {
    let minD = Infinity;
    let nearest = neighborhoodList[0];
    neighborhoodList.forEach(n => {
      const nLat = n.centroid_lat || 12.9716;
      const nLng = n.centroid_lng || 77.5946;
      const dist = Math.pow(nLat - lat, 2) + Math.pow(nLng - lng, 2);
      if (dist < minD) {
        minD = dist;
        nearest = n;
      }
    });
    return nearest;
  };

  const handleMapSelect = (nb) => {
    if (!placementMode) return;
    if (drafts.length >= 3) {
      alert("Maximum of 3 simultaneous simulations allowed for comparison.");
      return;
    }

    const lat = nb.centroid_lat || 12.9716 + (Math.random() - 0.5) * 0.05;
    const lng = nb.centroid_lng || 77.5946 + (Math.random() - 0.5) * 0.05;

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
        const newId = `Sim-${nearestNb.neighborhood_id}-${Date.now().toString().slice(-4)}`;
        const newDraft = {
          id: newId,
          dbId: data.simulation_id,
          name: nearestNb.neighborhood_name,
          lat,
          lng,
          metrics: {
            demand_score: Math.min(10, Math.round((data.predicted_daily_orders / 25) * 10) / 10),
            competition_gap: data.factors?.competition_stores ? Math.round((10 - data.factors.competition_stores * 1.5) * 10) / 10 : 7.2,
            logistics_viability: data.roi_12_months_pct > 15 ? 'High' : 'Medium',
            recommended_store_size_sqft: storeSize,
            estimated_breakeven_months: data.break_even_month,
            confidence: Math.round(data.confidence_level * 100),
            predicted_daily_orders: data.predicted_daily_orders,
            monthly_revenue: data.predicted_monthly_revenue,
            monthly_opex: data.monthly_operating_cost,
            roi_pct: data.roi_12_months_pct,
            routing_mins: data.routing_mins
          }
        };
        setDrafts(prev => [...prev, newDraft]);
        setActiveDraftId(newId);
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

  const activeDraft = drafts.find(d => d.id === activeDraftId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <AmbientBackground />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity color="var(--saffron-500)" size={32} /> Hyperlocal Simulator & Workflows
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
            Configure grounded costs, test OSRM serviceability polygons, and run Propose → Review → Approve location workflow cycles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setPlacementMode(!placementMode)}
            className={`btn-secondary ${placementMode ? 'active' : ''}`}
            style={{
              borderColor: placementMode ? 'var(--saffron-500)' : 'var(--color-border)',
              color: placementMode ? 'var(--saffron-500)' : 'var(--color-text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={16} />
            {placementMode ? 'Click Map to Place Node' : 'Enable Placement Mode'}
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-6)' }}>
        
        {/* Left Side: Map + Cost Configuration Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="glass-card" style={{ padding: 'var(--space-4)' }}>
            <MapView
              showHeatmap={true}
              height="450px"
              liveOrders={drafts.map(d => ({ ...d, createdTime: Date.now() }))}
              onSelect={handleMapSelect}
            />
          </div>

          {/* Configuration Cost Panel */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={18} color="var(--peacock-500)" /> Grounded Cost & Serviceability Settings
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
                  style={{ accentColor: 'var(--peacock-500)', cursor: 'pointer' }}
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
                  style={{ accentColor: 'var(--peacock-500)', cursor: 'pointer' }}
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
                  style={{ accentColor: 'var(--peacock-500)', cursor: 'pointer' }}
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
                  style={{ accentColor: 'var(--peacock-500)', cursor: 'pointer' }}
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
                  style={{ accentColor: 'var(--peacock-500)', cursor: 'pointer' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Serviceability Promise</span>
                  <span style={{ color: 'var(--saffron-500)', fontWeight: 600 }}>{routingMins} mins</span>
                </div>
                <input 
                  type="range" min={5} max={30} step={1}
                  value={routingMins} onChange={(e) => setRoutingMins(Number(e.target.value))}
                  style={{ accentColor: 'var(--saffron-500)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Tab selectors */}
          <div style={{ display: 'flex', gap: '2px', background: 'var(--color-surface)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <button 
              onClick={() => setActiveTab('simulate')}
              style={{
                flex: 1, padding: '6px 0', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                border: 'none', borderRadius: 'var(--radius-sm)',
                background: activeTab === 'simulate' ? 'var(--peacock-500)' : 'transparent',
                color: activeTab === 'simulate' ? '#0B0D14' : 'var(--color-text-secondary)'
              }}
            >
              Simulation ({drafts.length})
            </button>
            <button 
              onClick={() => setActiveTab('proposals')}
              style={{
                flex: 1, padding: '6px 0', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                border: 'none', borderRadius: 'var(--radius-sm)',
                background: activeTab === 'proposals' ? 'var(--peacock-500)' : 'transparent',
                color: activeTab === 'proposals' ? '#0B0D14' : 'var(--color-text-secondary)'
              }}
            >
              Proposals ({proposals?.length || 0})
            </button>
            <button 
              onClick={() => setActiveTab('ledger')}
              style={{
                flex: 1, padding: '6px 0', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
                border: 'none', borderRadius: 'var(--radius-sm)',
                background: activeTab === 'ledger' ? 'var(--peacock-500)' : 'transparent',
                color: activeTab === 'ledger' ? '#0B0D14' : 'var(--color-text-secondary)'
              }}
            >
              Ledger ({auditLogs?.length || 0})
            </button>
          </div>

          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
            
            {activeTab === 'simulate' && (
              drafts.length === 0 ? (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px' }}>
                  <AlertCircle size={28} style={{ marginBottom: '8px', color: 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: '0.84rem' }}>Enable Placement Mode, click on the map grid to run localized projection.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  {drafts.length > 1 && (
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '4px' }}>
                      {drafts.map(d => (
                        <button
                          key={d.id}
                          onClick={() => setActiveDraftId(d.id)}
                          style={{
                            flex: 1, padding: '4px 0', fontSize: '0.74rem', border: 'none', borderRadius: '3px', cursor: 'pointer',
                            background: activeDraftId === d.id ? 'var(--peacock-500)' : 'transparent',
                            color: activeDraftId === d.id ? '#0b0d14' : 'var(--color-text-secondary)',
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
                          <span style={{ color: 'var(--color-text-secondary)' }}>OSRM Route Time:</span>
                          <strong style={{ color: 'var(--saffron-500)', fontFamily: 'var(--font-mono)' }}>{activeDraft.metrics.routing_mins.toFixed(1)} mins</strong>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>ROI 12 Months:</span>
                          <strong style={{ color: activeDraft.metrics.roi_pct > 15 ? 'var(--peacock-500)' : 'var(--saffron-500)', fontFamily: 'var(--font-mono)' }}>{activeDraft.metrics.roi_pct.toFixed(1)}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-secondary)' }}>Estimated Breakeven:</span>
                          <strong style={{ color: 'var(--saffron-500)', fontFamily: 'var(--font-mono)' }}>{activeDraft.metrics.estimated_breakeven_months} months</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(!user?.role || user.role === 'expansion_lead' || user.role === 'admin') && (
                          <button 
                            onClick={() => proposeMutation.mutate(activeDraft.dbId)}
                            className="btn-secondary" style={{ width: '100%', background: 'var(--peacock-500)', color: '#0b0d14', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                          >
                            <Check size={14} /> Propose Location
                          </button>
                        )}

                        <button
                          onClick={() => removeDraft(activeDraft.id)}
                          className="btn-destructive" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
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
                  {proposals?.length === 0 ? (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>No proposals active.</span>
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
                          {user?.role === 'finance_reviewer' && p.status === 'proposed' && (
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

                          {user?.role === 'regional_head' && p.status === 'reviewed' && (
                            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                              <button 
                                onClick={() => approveMutation.mutate(p.simulation_id)}
                                className="btn-secondary" style={{ flex: 1, background: 'var(--peacock-500)', border: 'none', color: '#0b0d14', padding: '4px 0', fontSize: '0.78rem', fontWeight: 700 }}
                              >
                                Approve store
                              </button>
                            </div>
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
                  {auditLogs?.map((log) => {
                    const prov = log.new_state?.decision_provenance;
                    return (
                      <div key={log.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                          <span style={{ color: 'var(--color-text-primary)' }}>{log.new_state?.store_provisioned || "Darkstore Hub"}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--peacock-500)' }}>v{prov?.model_version || "3.1.0"}</span>
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.74rem' }}>
                          Approver: {prov?.approver?.email || "regional_head@darkstori.com"}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '0.7rem', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '4px' }}>
                          <span>Capex: ₹{(prov?.parameters_snapshot?.investment || 1500000).toLocaleString('en-IN')}</span>
                          <span>Orders Proj: {prov?.parameters_snapshot?.predicted_daily_orders || 240} daily</span>
                        </div>
                      </div>
                    );
                  })}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px' }}>No decision ledger entries.</span>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
