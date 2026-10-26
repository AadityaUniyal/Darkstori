import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, BarChart3, ShieldCheck, ClipboardList, RefreshCw, Search, Radar } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useCity } from '../context/CityContext';
import AmbientBackground from '../components/AmbientBackground';
import LazyMapView from '../components/LazyMapView';
import AnimatedCard from '../components/AnimatedCard';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';

import { Plus } from 'lucide-react';
import QuickSetupWizard from '../components/QuickSetupWizard';
import AddStoreModal from '../components/AddStoreModal';
import AppleSearchBar from '../components/AppleSearchBar';

function MetricCard({ label, value, sublabel, icon: Icon }) {
  return (
    <div className="glass-card" style={{ display: 'flex', gap: 14, alignItems: 'center', minHeight: 110, padding: '16px 20px', borderRadius: '16px' }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(0, 113, 227, 0.12)', color: '#FF9F1C' }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{sublabel}</div>
      </div>
    </div>
  );
}

export default function ExpansionCockpit() {
  const { selectedCity, selectLocation } = useCity();
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [capex, setCapex] = useState(null);
  const [storeSize, setStoreSize] = useState(null);
  const [routingMins, setRoutingMins] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [resolvedPoint, setResolvedPoint] = useState(null);
  const [activeTab, setActiveTab] = useState('sites');
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);

  const { data: storesList = [] } = useQuery({
    queryKey: ['stores-list', selectedCity],
    queryFn: () => api.getStores({ city: selectedCity }),
  });

  const { data: batchesList = [] } = useQuery({
    queryKey: ['resilience-batches', selectedCity],
    queryFn: () => api.getResilienceBatches(selectedCity),
  });

  const { data: playbooksList = [] } = useQuery({
    queryKey: ['playbooks'],
    queryFn: () => api.getPlaybooks(),
  });

  const { data: opportunities = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['expansion-opportunities', selectedCity],
    queryFn: () => api.getExpansionOpportunities(selectedCity, 8),
    staleTime: 120000,
  });

  const { data: ledger = [], isLoading: ledgerLoading, isError: ledgerError, refetch: refetchLedger } = useQuery({
    queryKey: ['expansion-ledger', selectedCity],
    queryFn: () => api.getExpansionLedger({ city: selectedCity, limit: 10 }),
    staleTime: 30000,
  });

  const { data: locationAnalysis, isFetching: isAnalyzing } = useQuery({
    queryKey: ['location-analysis', locationQuery, resolvedPoint?.lat, resolvedPoint?.lng],
    queryFn: () => api.analyzeLocation(resolvedPoint ? { lat: resolvedPoint.lat, lng: resolvedPoint.lng } : { q: locationQuery }),
    enabled: !!locationQuery || !!resolvedPoint,
    staleTime: 0,
  });

  const simulateMutation = useMutation({
    mutationFn: ({ neighborhoodId, payload }) => api.simulateExpansion(neighborhoodId, payload),
    onSuccess: (data) => {
      setSelectedOpportunity((prev) => (prev ? { ...prev, simulation: data } : prev));
      refetchLedger();
      setActiveTab('simulate');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ simulationId, notes }) => api.reviewExpansionDecision(simulationId, notes),
    onSuccess: () => refetchLedger(),
  });

  const approveMutation = useMutation({
    mutationFn: (simulationId) => api.approveExpansionDecision(simulationId),
    onSuccess: () => {
      refetchLedger();
      toast.success('Scenario approval recorded. No physical store was created or provisioned.');
    },
  });

  const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];
  const safeLedger = Array.isArray(ledger) ? ledger : [];
  const activeOpportunity = selectedOpportunity || safeOpportunities[0] || null;
  const activeSimulation = activeOpportunity?.simulation;
  const analysisCenter = locationAnalysis ? [locationAnalysis.lat, locationAnalysis.lng] : undefined;

  const mapNeighborhoods = useMemo(
    () =>
      safeOpportunities.map((o) => ({
        neighborhood_id: o.neighborhood_id,
        neighborhood_name: o.neighborhood_name,
        city: o.city,
        lat: o.lat,
        lng: o.lng,
        opportunity_score: o.opportunity_score,
      })),
    [safeOpportunities]
  );

  const handleResolveLocation = async () => {
    if (!locationQuery.trim()) return;
    try {
      const resolved = await api.resolveLocation(locationQuery.trim());
      if (resolved && Number.isFinite(Number(resolved.lat)) && Number.isFinite(Number(resolved.lng))) {
        setResolvedPoint(resolved);
        selectLocation?.(resolved);
      } else {
        setResolvedPoint(null);
        toast.error('Could not resolve this location. Try a more specific address or city name.');
      }
    } catch {
      setResolvedPoint(null);
      toast.error('Location resolution failed. Please check your network and try again.');
    }
  };

  const runSimulation = () => {
    if (!activeOpportunity) return;
    if (![capex, storeSize, routingMins].every((value) => Number.isFinite(Number(value)) && Number(value) > 0)) {
      toast.error('Enter capex, store size, and routing limit before running the scenario.');
      return;
    }
    simulateMutation.mutate({
      neighborhoodId: activeOpportunity.neighborhood_id,
      payload: { capex, store_size_sqft: storeSize, routing_mins: routingMins },
    });
  };

  const analysisNeighborhoods = mapNeighborhoods;

  const locationSummary = locationAnalysis || resolvedPoint;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, position: 'relative', zIndex: 1, minHeight: 'auto', paddingBottom: '4rem', width: '100%' }}>
      <AmbientBackground />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
            Regional Expansion Cockpit
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)', fontSize: '0.94rem' }}>
            Search any mapped place, review recorded placement scores, and run a clearly labeled scenario with your own assumptions.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="btn-primary"
            onClick={() => setIsAddStoreOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FF9F1C', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(255, 159, 28, 0.3)' }}
          >
            <Plus size={16} /> Add Dark Store
          </button>
          <button className="btn-secondary" onClick={() => { refetch(); refetchLedger(); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Show Onboarding Wizard only if network has 0 stores */}
      {storesList.length === 0 && (
        <QuickSetupWizard
          totalStores={storesList.length}
          totalBatches={batchesList.length}
          totalPlaybooks={playbooksList.length}
        />
      )}

      {/* Prominent Apple Cupertino Search & Corridor Analyzer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <AppleSearchBar
              placeholder="Search any Indian city, neighborhood, PIN (e.g. 560034), or landmark corridor..."
              value={locationQuery}
              onChange={setLocationQuery}
              onSubmit={handleResolveLocation}
              onClear={() => { setLocationQuery(''); setResolvedPoint(null); }}
              isLoading={isAnalyzing}
              hotkey="ENTER"
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleResolveLocation}
            disabled={!locationQuery.trim() || isAnalyzing}
            style={{ background: '#FF9F1C', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            {isAnalyzing ? 'Resolving...' : 'Analyze Corridor'}
          </button>
        </div>
        {locationSummary && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 10, width: 'fit-content', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <MapPin size={13} color="#FF9F1C" />
            <span>{locationAnalysis?.query || resolvedPoint?.display_name || locationQuery}</span>
            {locationAnalysis?.opportunity_score != null && (
              <span style={{ color: '#38BDF8', fontWeight: 600 }}>• Market Potential: {locationAnalysis.opportunity_score}/100</span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard label="Scored Sites" value={isLoading ? <Skeleton className="h-7 w-12 rounded inline-block" /> : opportunities.length} sublabel="Stored placement records" icon={MapPin} />
        <MetricCard
          label="Avg Opportunity"
          value={isLoading ? <Skeleton className="h-7 w-16 rounded inline-block" /> : opportunities.length ? `${Math.round(opportunities.reduce((a, b) => a + (b.opportunity_score || 0), 0) / opportunities.length)}/100` : '—'}
          sublabel="Mean of stored scores"
          icon={BarChart3}
        />
        <MetricCard label="Latest Decisions" value={ledgerLoading ? <Skeleton className="h-7 w-12 rounded inline-block" /> : ledger.length} sublabel="Auditable trail entries" icon={ClipboardList} />
        <MetricCard label="Location Mode" value="Search-first" sublabel="Any place, not just fixed cities" icon={Radar} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 20, alignItems: 'start' }}>
        <AnimatedCard className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>Opportunity Map</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={() => setActiveTab('sites')} style={{ opacity: activeTab === 'sites' ? 1 : 0.7 }}>
                Stored Scores
              </button>
              <button className="btn-secondary" onClick={() => setActiveTab('ledger')} style={{ opacity: activeTab === 'ledger' ? 1 : 0.7 }}>
                Ledger
              </button>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="w-full h-[420px]" />
          ) : (
            <LazyMapView
              neighborhoods={analysisNeighborhoods}
              height="420px"
              center={analysisCenter}
              zoom={locationAnalysis ? 11 : undefined}
              externalPoints={locationAnalysis?.competitors?.map((s) => ({
                lat: s.lat,
                lng: s.lng,
                platform: s.platform,
                store_name: s.name,
              })) || []}
              showHeatmap={true}
              onSelect={(nb) => {
                if (nb?.neighborhood_id) {
                  setSelectedOpportunity(opportunities.find((o) => o.neighborhood_id === nb.neighborhood_id) || null);
                } else if (Number.isFinite(Number(nb?.lat)) && Number.isFinite(Number(nb?.lng))) {
                  setResolvedPoint(nb);
                  selectLocation?.(nb);
                }
              }}
            />
          )}

          {isError && activeTab === 'sites' && <div role="alert" style={{ marginTop: 12, color: 'var(--color-text-secondary)' }}>Stored placement scores could not be loaded. Check the API connection and retry.</div>}
          <div style={{ marginTop: 16, display: activeTab === 'sites' ? 'grid' : 'none', gap: 10 }}>
            {isLoading ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />)}
              </div>
            ) : (
              isError ? null : safeOpportunities.length === 0 ? (
                <EmptyState title="No scored locations available" description="No sample rankings are generated. Add validated placement records to rank sites; search or tap the map to inspect any location." />
              ) : safeOpportunities.slice(0, 4).map((opp, idx) => (
                <button
                  key={`${opp.neighborhood_id}-${idx}`}
                  onClick={() => setSelectedOpportunity(opp)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: selectedOpportunity?.neighborhood_id === opp.neighborhood_id ? '1px solid #FF9F1C' : '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{opp.neighborhood_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{opp.city} · PIN {opp.pincode || 'Not recorded'}</div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>Stored placement score{opp.scored_at ? ` · ${new Date(opp.scored_at).toLocaleDateString()}` : ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#38BDF8' }}>{opp.opportunity_score}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Score</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </AnimatedCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <AnimatedCard className="glass-card" style={{ padding: 20 }}>
            <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>Simulation Panel</h2>
            {!activeOpportunity ? (
              <EmptyState title="Select a site" description="Choose a neighborhood to simulate ROI, coverage gain, and cannibalization risk." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{activeOpportunity.neighborhood_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Stored score only · demand, coverage impact, and cannibalization are not inferred.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Capex
                    <input className="input-field" type="number" min="1" required placeholder="Enter capex (₹)" value={capex ?? ''} onChange={(e) => setCapex(e.target.value === '' ? null : Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Store size sqft
                    <input className="input-field" type="number" min="1" required placeholder="Enter area (sq ft)" value={storeSize ?? ''} onChange={(e) => setStoreSize(e.target.value === '' ? null : Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Routing constraint mins
                    <input className="input-field" type="number" min="1" required placeholder="Enter target (minutes)" value={routingMins ?? ''} onChange={(e) => setRoutingMins(e.target.value === '' ? null : Number(e.target.value))} />
                  </label>
                </div>

                {locationAnalysis && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                    <div className="glass-card" style={{ padding: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Competitors nearby</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{locationAnalysis.competitor_count}</div>
                    </div>
                    <div className="glass-card" style={{ padding: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Coverage points</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{locationAnalysis.coverage_points}</div>
                    </div>
                    <div className="glass-card" style={{ padding: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Route mins</div>
                      <div style={{ fontSize: 24, fontWeight: 700 }}>{locationAnalysis.route_duration_mins ?? 'NA'}</div>
                    </div>
                  </div>
                )}

                <button className="btn-primary" onClick={runSimulation} disabled={simulateMutation.isPending} style={{ background: '#FF9F1C', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {simulateMutation.isPending ? 'Running simulation...' : 'Simulate economics'}
                </button>

                {activeSimulation && (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div role="note" style={{ padding: 10, borderRadius: 10, border: '1px solid rgba(255,159,28,.35)', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      Scenario estimate only · heuristic assumptions, not a demand forecast or investment recommendation. Validate every input against your operating data.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="glass-card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>12-month ROI</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#34C759' }}>{activeSimulation.roi_12_months_pct}%</div>
                    </div>
                    <div className="glass-card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Breakeven</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#38BDF8' }}>{activeSimulation.break_even_month} mo</div>
                    </div>
                    <div className="glass-card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Daily orders</div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{activeSimulation.predicted_daily_orders}</div>
                    </div>
                    <div className="glass-card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Routing</div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{Math.round(activeSimulation.routing_mins)} mins</div>
                    </div>
                    </div>
                  </div>
                )}

                {activeSimulation && (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      Review notes
                      <textarea
                        className="input-field"
                        rows={3}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Why this site works or what needs adjustment..."
                      />
                    </label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => reviewMutation.mutate({ simulationId: activeSimulation.simulation_id, notes: reviewNotes })}
                        disabled={!reviewNotes || reviewMutation.isPending}
                      >
                        Save review
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => approveMutation.mutate(activeSimulation.simulation_id)}
                        disabled={approveMutation.isPending}
                        style={{ background: '#34C759', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Approve Scenario
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AnimatedCard>

          <AnimatedCard className="glass-card" style={{ padding: 20 }}>
            <h2 style={{ margin: '0 0 12px', fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>Decision Ledger</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {ledgerLoading ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />)}
                </div>
              ) : ledgerError ? (
                <div role="alert" style={{ color: 'var(--color-text-secondary)' }}>Decision ledger unavailable. Check the API connection and retry.</div>
              ) : safeLedger.length === 0 ? (
                <EmptyState title="Ledger is empty" description="Simulate and approve a site to start building the decision trail." />
              ) : (
                safeLedger.map((row) => (
                  <div key={row.id} style={{ padding: 12, borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.neighborhood_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.city} · {row.status}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{row.data_mode === 'heuristic_simulation' ? 'Scenario only · heuristic inputs' : 'Recorded source not verified'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{row.roi_12_months_pct ?? '—'}% scenario ROI</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.breakeven_months ?? '—'} mo scenario breakeven</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      <span>Scenario demand {row.demand_estimate ?? '—'}</span>
                      <span>Coverage estimate {row.coverage_gain_pct == null ? '—' : `+${row.coverage_gain_pct}%`}</span>
                      <span>Cannibalization estimate {row.cannibalization_risk_pct == null ? '—' : `${row.cannibalization_risk_pct}%`}</span>
                      <span>Capex ₹{Number(row.capex || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setIsAddStoreOpen(true)}
                        style={{
                          background: 'linear-gradient(135deg, #FF9F1C, #0284C7)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={12} /> Open store setup
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AnimatedCard>
        </div>
      </div>
      <AddStoreModal isOpen={isAddStoreOpen} onClose={() => setIsAddStoreOpen(false)} />
    </div>
  );
}
