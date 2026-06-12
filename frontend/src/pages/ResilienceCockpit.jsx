import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Leaf, RefreshCw, QrCode, Camera, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import './NotFound.css'; // Leverage basic container layout or keep styles inline/local

export default function ResilienceCockpit() {
  const [hours, setHours] = useState(6);
  const [qrCode, setQrCode] = useState('qr_ban_01');
  const [photoInfo, setPhotoInfo] = useState(null);

  // Get perishables batches
  const { data: batches, refetch, isFetching } = useQuery({
    queryKey: ['resilience-batches'],
    queryFn: () => api.getResilienceBatches(),
    staleTime: 15000,
  });

  const batchList = batches || [
    { id: 1, product_name: 'Organic Bananas', category: 'Fruits', quantity: 150, base_price: 60.0, current_price: 60.0, discount_rate: 0.0, freshness_score: 0.95, qr_code_hash: 'qr_ban_01', color_state: 'Fresh/Optimal', bruising_percent: 0.0 },
    { id: 2, product_name: 'Fresh Spinach', category: 'Vegetables', quantity: 80, base_price: 40.0, current_price: 32.0, discount_rate: 0.20, freshness_score: 0.80, qr_code_hash: 'qr_spi_02', color_state: 'Healthy', bruising_percent: 0.0 },
    { id: 3, product_name: 'Toned Milk 1L', category: 'Dairy', quantity: 200, base_price: 56.0, current_price: 56.0, discount_rate: 0.0, freshness_score: 0.99, qr_code_hash: 'qr_milk_03', color_state: 'Fresh/Optimal', bruising_percent: 0.0 },
  ];

  // Decay simulation mutation
  const decayMutation = useMutation({
    mutationFn: (h) => api.simulateDecay(h),
    onSuccess: () => refetch(),
  });

  // Verify photo quality mutation
  const photoMutation = useMutation({
    mutationFn: (payload) => api.verifyPhoto(payload),
    onSuccess: (data) => {
      setPhotoInfo(data);
      refetch();
    },
  });

  const triggerDecay = () => {
    decayMutation.mutate(hours);
  };

  const runPhotoAI = (batchId) => {
    // Simulate camera snapshot and AI freshness model scoring
    photoMutation.mutate({
      batch_id: batchId,
      photo_url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500',
      bruising_percent: 18.5,
      color_state: 'Yellowish / Spotted',
      freshness_score: 0.62,
    });
  };

  const getFreshnessColor = (score) => {
    if (score >= 0.8) return '#10b981';
    if (score >= 0.5) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ padding: '24px', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Leaf color="#10b981" /> Zero-Waste Resilience Engine
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '4px' }}>
            Predictive perishables lifecycle decay simulation and dynamic markdown scheduler
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            color: '#e2e8f0',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* Active Batches list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
              Active Fresh-Produce Batches
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {batchList.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>{b.product_name}</h3>
                    <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                      Category: {b.category} · Crate QR: {b.qr_code_hash}
                    </span>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Qty:</span>{' '}
                        <strong style={{ color: '#e2e8f0' }}>{b.quantity} kg</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Price:</span>{' '}
                        <strong style={{ color: '#e2e8f0' }}>₹{b.current_price}</strong>{' '}
                        {b.discount_rate > 0 && (
                          <span style={{ color: '#f87171', fontWeight: 700 }}>(-{b.discount_rate * 100}%)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Freshness Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>
                        Freshness: {(b.freshness_score * 100).toFixed(0)}%
                      </span>
                      <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${b.freshness_score * 100}%`, background: getFreshnessColor(b.freshness_score), borderRadius: '3px' }} />
                      </div>
                    </div>

                    <button
                      onClick={() => runPhotoAI(b.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(59,130,246,0.1)',
                        border: '1px solid rgba(59,130,246,0.25)',
                        borderRadius: '6px',
                        color: '#60a5fa',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Camera size={12} />
                      Verify AI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Decay control panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', padding: '20px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#fbbf24" /> Decay Simulator
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  ELAPSED TIME: {hours} HOURS
                </label>
                <input
                  type="range"
                  min={1}
                  max={48}
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#10b981' }}
                />
              </div>

              <button
                onClick={triggerDecay}
                disabled={decayMutation.isPending}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {decayMutation.isPending ? 'Simulating...' : 'Apply Lifecycle Decay'}
              </button>
            </div>
          </div>

          {/* AI vision response drawer */}
          {photoInfo && (
            <div style={{ background: 'rgba(30, 41, 59, 0.45)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '16px', padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={16} /> AI Vision Analysis Result
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Freshness Score:</span>{' '}
                  <strong style={{ color: getFreshnessColor(photoInfo.freshness_score) }}>
                    {(photoInfo.freshness_score * 100).toFixed(0)}%
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Color State:</span>{' '}
                  <strong style={{ color: '#ffffff' }}>{photoInfo.color_state}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Bruising:</span>{' '}
                  <strong style={{ color: '#ef4444' }}>{photoInfo.bruising_percent}%</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
