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

function MetricCard({ label, value, sublabel, icon: Icon }) {
  return (
    <div className="glass-card" style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 110 }}>
      <div style={{ width: 42, height: 42, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(14, 124, 134, 0.12)', color: 'var(--peacock-500)' }}>
        <Icon size={18} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{sublabel}</div>
      </div>
    </div>
  );
}

export default function ExpansionCockpit() {
  const { selectedCity } = useCity();
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [capex, setCapex] = useState(1500000);
  const [storeSize, setStoreSize] = useState(1500);
  const [routingMins, setRoutingMins] = useState(15);
  const [reviewNotes, setReviewNotes] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [resolvedPoint, setResolvedPoint] = useState(null);
  const [activeTab, setActiveTab] = useState('sites');

  const { data: opportunities = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['expansion-opportunities', selectedCity],
    queryFn: () => api.getExpansionOpportunities(selectedCity, 8),
    staleTime: 120000,
  });

  const { data: ledger = [], isLoading: ledgerLoading, refetch: refetchLedger } = useQuery({
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
    onSuccess: () => refetchLedger(),
  });

  const activeOpportunity = selectedOpportunity || opportunities[0] || null;
  const activeSimulation = activeOpportunity?.simulation;
  const analysisCenter = locationAnalysis ? [locationAnalysis.lat, locationAnalysis.lng] : [20.0, 77.0];

  const mapNeighborhoods = useMemo(
    () =>
      opportunities.map((o) => ({
        neighborhood_id: o.neighborhood_id,
        neighborhood_name: o.neighborhood_name,
        city: o.city,
        opportunity_score: o.opportunity_score,
      })),
    [opportunities]
  );

  const handleResolveLocation = async () => {
    if (!locationQuery.trim()) return;
    try {
      const resolved = await api.resolveLocation(locationQuery.trim());
      if (resolved && resolved.lat && resolved.lng && resolved.lat !== 0) {
        setResolvedPoint(resolved);
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
    simulateMutation.mutate({
      neighborhoodId: activeOpportunity.neighborhood_id,
      payload: { capex, store_size_sqft: storeSize, routing_mins: routingMins },
    });
  };

  const analysisNeighborhoods = locationAnalysis?.coverage?.length
    ? locationAnalysis.coverage.map((c, idx) => ({
        neighborhood_id: idx + 1,
        neighborhood_name: c.pincode,
        city: c.city,
        opportunity_score: c.market_potential_score,
        lat: locationAnalysis.lat,
        lng: locationAnalysis.lng,
      }))
    : mapNeighborhoods;

  const locationSummary = locationAnalysis || resolvedPoint;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <AmbientBackground />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '2.3rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Regional Expansion Cockpit
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)' }}>
            Find the best place to open next using free geo intelligence, ROI simulation, and auditable approvals.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => { refetch(); refetchLedger(); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={14} /> Refresh market view
        </button>
      </div>

      <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 320px' }}>
          <Search size={16} color="var(--color-text-muted)" />
          <input
            className="input-field"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleResolveLocation();
            }}
            placeholder="Search any city, neighborhood, pin code, or landmark"
            style={{ flex: 1 }}
          />
        </div>
        <button className="btn-secondary" onClick={handleResolveLocation} disabled={!locationQuery.trim()}>
          {isAnalyzing ? 'Resolving...' : 'Resolve location'}
        </button>
        {locationSummary && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {locationAnalysis?.query || resolvedPoint?.display_name || locationQuery}
            {locationAnalysis?.opportunity_score != null ? ` - Score ${locationAnalysis.opportunity_score}` : ''}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard label="Shortlisted Sites" value={isLoading ? <Skeleton className="h-7 w-12 rounded inline-block" /> : opportunities.length} sublabel="Live expansion candidates" icon={MapPin} />
        <MetricCard
          label="Avg Opportunity"
          value={isLoading ? <Skeleton className="h-7 w-16 rounded inline-block" /> : `${opportunities.length ? Math.round(opportunities.reduce((a, b) => a + (b.opportunity_score || 0), 0) / opportunities.length) : 0}/100`}
          sublabel="Weighted market fit"
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
                Sites
              </button>
              <button className="btn-secondary" onClick={() => setActiveTab('ledger')} style={{ opacity: activeTab === 'ledger' ? 1 : 0.7 }}>
                Ledger
              </button>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="w-full h-[420px]" />
          ) : isError || opportunities.length === 0 ? (
            <EmptyState title="No opportunity data yet" description="Seed data or connect live neighborhood data to rank expansion sites." />
          ) : (
            <LazyMapView
              neighborhoods={analysisNeighborhoods}
              height="420px"
              center={analysisCenter}
              zoom={locationAnalysis ? 11 : 5}
              liveOrders={locationAnalysis?.stores?.map((s) => ({
                lat: s.lat,
                lng: s.lng,
                platform: s.platform,
                store_name: s.name,
              })) || []}
              showHeatmap={true}
              onSelect={(nb) => setSelectedOpportunity(opportunities.find((o) => o.neighborhood_id === nb.neighborhood_id) || opportunities[0])}
            />
          )}

          <div style={{ marginTop: 16, display: activeTab === 'sites' ? 'grid' : 'none', gap: 10 }}>
            {isLoading ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[60px] w-full rounded-2xl" />)}
              </div>
            ) : (
              opportunities.slice(0, 4).map((opp, idx) => (
                <button
                  key={`${opp.neighborhood_id}-${idx}`}
                  onClick={() => setSelectedOpportunity(opp)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: selectedOpportunity?.neighborhood_id === opp.neighborhood_id ? '1px solid var(--peacock-500)' : '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{opp.neighborhood_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{opp.city} - PIN {opp.pincode || 'NA'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{opp.opportunity_score}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Opportunity</div>
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
                    Demand {activeOpportunity.demand_estimate} - Coverage +{activeOpportunity.coverage_gain_pct}% - Cannibalization {activeOpportunity.cannibalization_risk_pct}%
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Capex
                    <input className="input-field" type="number" value={capex} onChange={(e) => setCapex(Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Store size sqft
                    <input className="input-field" type="number" value={storeSize} onChange={(e) => setStoreSize(Number(e.target.value))} />
                  </label>
                  <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    Routing constraint mins
                    <input className="input-field" type="number" value={routingMins} onChange={(e) => setRoutingMins(Number(e.target.value))} />
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

                <button className="btn-primary" onClick={runSimulation} disabled={simulateMutation.isPending}>
                  {simulateMutation.isPending ? 'Running simulation...' : 'Simulate economics'}
                </button>

                {activeSimulation && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="glass-card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>12-month ROI</div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{activeSimulation.roi_12_months_pct}%</div>
                    </div>
                    <div className="glass-card" style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Breakeven</div>
                      <div style={{ fontSize: 28, fontWeight: 700 }}>{activeSimulation.break_even_month} mo</div>
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
                        className="btn-secondary"
                        onClick={() => approveMutation.mutate(activeSimulation.simulation_id)}
                        disabled={approveMutation.isPending}
                        style={{ background: 'var(--peacock-500)', color: '#0b0d14', border: 'none' }}
                      >
                        Approve site
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
              ) : ledger.length === 0 ? (
                <EmptyState title="Ledger is empty" description="Simulate and approve a site to start building the decision trail." />
              ) : (
                ledger.map((row) => (
                  <div key={row.id} style={{ padding: 12, borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{row.neighborhood_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.city} · {row.status}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{row.roi_12_months_pct}% ROI</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{row.breakeven_months} mo breakeven</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      <span>Demand {row.demand_estimate}</span>
                      <span>Coverage +{row.coverage_gain_pct}%</span>
                      <span>Cannibalization {row.cannibalization_risk_pct}%</span>
                      <span>Capex ₹{Number(row.capex || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}
