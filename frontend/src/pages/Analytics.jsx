import { useState, useEffect, useRef } from 'react';
import {
  BarChart2, TrendingUp, Leaf, Zap, Users, Store,
  Clock, DollarSign, Download,
} from 'lucide-react';
import './Analytics.css';

// ── Mock Data ────────────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MONTHLY_ORDERS = [3200, 3850, 4100, 4480, 5200, 5850, 6100, 6800, 7200, 7900, 8400, 9100];
const MONTHLY_WASTE  = [820,  750,  680,  640,  590,  510,  480,  440,  400,  360,  310,  280];
const MONTHLY_REVENUE = [5.8, 6.9, 7.4, 8.1, 9.3, 10.5, 11.0, 12.1, 12.9, 14.2, 15.1, 16.4];

const PLATFORM_DATA = [
  { name: 'Instamart', orders: 28400, share: 34, color: '#fc8019', margin: 22.4, nps: 68 },
  { name: 'Zepto',     orders: 22100, share: 26, color: '#a855f7', margin: 24.1, nps: 72 },
  { name: 'Blinkit',  orders: 19800, share: 23, color: '#f59e0b', margin: 20.8, nps: 61 },
  { name: 'Swiggy',   orders: 14200, share: 17, color: '#ef4444', margin: 18.2, nps: 54 },
];

const CITY_PERFORMANCE = [
  { city: 'Bangalore', orders: 34200, growth: 22, waste_kg: 1240, co2: 2480, stores: 12 },
  { city: 'Mumbai',    orders: 29800, growth: 18, waste_kg: 980,  co2: 1960, stores: 10 },
  { city: 'Delhi',     orders: 21400, growth: 14, waste_kg: 820,  co2: 1640, stores: 8  },
  { city: 'Hyderabad', orders: 18900, growth: 28, waste_kg: 720,  co2: 1440, stores: 7  },
  { city: 'Pune',      orders: 10700, growth: 16, waste_kg: 410,  co2: 820,  stores: 5  },
];

// ── Canvas Charts ─────────────────────────────────────────────────────────────

function LineChart({ data, color, label, suffix = '', prefix = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const PAD = { t: 16, r: 16, b: 32, l: 48 };
    const pw = W - PAD.l - PAD.r, ph = H - PAD.t - PAD.b;

    ctx.clearRect(0, 0, W, H);

    const max = Math.max(...data) * 1.15;
    const min = Math.min(...data) * 0.85;

    const xOf = i => PAD.l + (i / (data.length - 1)) * pw;
    const yOf = v => PAD.t + ph - ((v - min) / (max - min)) * ph;

    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = PAD.t + (i / 4) * ph;
      const val = max - (i / 4) * (max - min);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(PAD.l + pw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.font = '8px Inter';
      ctx.textAlign = 'right';
      ctx.fillText(`${prefix}${val.toFixed(suffix === '%' ? 0 : 0)}${suffix}`, PAD.l - 4, y + 3);
    }

    // Month labels
    MONTHS.forEach((m, i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.font = '8px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(m, xOf(i), H - PAD.b + 12);
    });

    // Area fill
    const grad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + ph);
    grad.addColorStop(0, color + '44');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(xOf(0), yOf(data[0]));
    data.forEach((v, i) => { if (i > 0) ctx.lineTo(xOf(i), yOf(v)); });
    ctx.lineTo(xOf(data.length - 1), PAD.t + ph);
    ctx.lineTo(xOf(0), PAD.t + ph);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v, i) => { if (i === 0) ctx.moveTo(xOf(i), yOf(v)); else ctx.lineTo(xOf(i), yOf(v)); });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    data.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(xOf(i), yOf(v), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }, [data, color, prefix, suffix]);

  return (
    <div className="ana-chart-wrap">
      <div className="ana-chart-label">{label}</div>
      <canvas ref={canvasRef} width={700} height={180} style={{ width: '100%', height: 180 }} />
    </div>
  );
}

function DonutChart({ data }) {
  const canvasRef = useRef(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const outerR = Math.min(W, H) / 2 - 10;
    const innerR = outerR * 0.6;

    ctx.clearRect(0, 0, W, H);

    let startAngle = -Math.PI / 2;
    const total = data.reduce((s, d) => s + d.share, 0);

    data.forEach((d, i) => {
      const angle = (d.share / total) * Math.PI * 2;
      const isHov = hovered === i;
      const r = isHov ? outerR + 6 : outerR;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + angle);
      ctx.closePath();
      ctx.fillStyle = d.color + (isHov ? 'ff' : 'cc');
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle += angle;
    });

    // Inner circle
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Center label
    const hovItem = hovered !== null ? data[hovered] : null;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(hovItem ? `${hovItem.share}%` : `${total}%`, cx, cy - 4);
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px Inter';
    ctx.fillText(hovItem ? hovItem.name : 'Market Share', cx, cy + 12);
  }, [data, hovered]);

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
    const outerR = Math.min(canvas.width, canvas.height) / 2 - 10;
    const innerR = outerR * 0.6;
    if (dist < innerR || dist > outerR) { setHovered(null); return; }

    let angle = Math.atan2(my - cy, mx - cx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    let start = 0;
    const total = data.reduce((s, d) => s + d.share, 0);
    for (let i = 0; i < data.length; i++) {
      const span = (data[i].share / total) * Math.PI * 2;
      if (angle >= start && angle < start + span) { setHovered(i); return; }
      start += span;
    }
    setHovered(null);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <canvas
        ref={canvasRef} width={180} height={180}
        style={{ width: 180, height: 180, cursor: 'pointer' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: hovered === null || hovered === i ? 1 : 0.4, transition: 'opacity 0.2s' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{d.name}</div>
              <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>{d.orders.toLocaleString()} orders · NPS {d.nps}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '0.82rem', fontWeight: 800, color: d.color }}>{d.share}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Analytics() {
  const [period, setPeriod] = useState('12m');
  const [tab, setTab] = useState('overview');

  const totalOrders = MONTHLY_ORDERS.reduce((a, b) => a + b, 0);
  const totalRevenue = MONTHLY_REVENUE.reduce((a, b) => a + b, 0);
  const totalWasteSaved = MONTHLY_WASTE.reduce((a, b) => a + b, 0);
  const totalCO2 = (totalWasteSaved * 2.0).toFixed(0);

  return (
    <div className="ana-page">
      {/* Header */}
      <header className="ana-header">
        <div>
          <h1 className="ana-title">Analytics & Reporting</h1>
          <p className="ana-subtitle">End-to-end performance metrics across all cities, platforms & zero-waste operations</p>
        </div>
        <div className="ana-header-actions">
          <div className="ana-period-tabs">
            {['3m', '6m', '12m'].map(p => (
              <button key={p} className={`ana-period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <button className="ana-export-btn"><Download size={14} /> Export CSV</button>
        </div>
      </header>

      {/* Top KPI Strip */}
      <div className="ana-kpi-strip">
        {[
          { icon: <Zap size={20} />, label: 'Total Orders', value: totalOrders.toLocaleString(), delta: '+22%', color: '#10b981' },
          { icon: <DollarSign size={20} />, label: 'Total Revenue', value: `₹${totalRevenue.toFixed(1)}Cr`, delta: '+31%', color: '#3b82f6' },
          { icon: <Leaf size={20} />, label: 'Food Waste Saved', value: `${totalWasteSaved} kg`, delta: '-66%↓', color: '#10b981' },
          { icon: <BarChart2 size={20} />, label: 'CO₂ Offset', value: `${totalCO2} kg`, delta: '2.0× food', color: '#a855f7' },
          { icon: <Store size={20} />, label: 'Active Stores', value: '42', delta: '+12 YoY', color: '#f97316' },
          { icon: <Users size={20} />, label: 'Avg NPS', value: '63.8', delta: '+8.2 pts', color: '#f59e0b' },
        ].map((k, i) => (
          <div key={i} className="ana-kpi-card">
            <div className="ana-kpi-icon" style={{ background: k.color + '18', color: k.color }}>{k.icon}</div>
            <div className="ana-kpi-val" style={{ color: k.color }}>{k.value}</div>
            <div className="ana-kpi-label">{k.label}</div>
            <div className="ana-kpi-delta">{k.delta}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="ana-tabs">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'platforms', label: '🏪 Platforms' },
          { id: 'cities', label: '🏙 Cities' },
          { id: 'waste', label: '🌿 Zero-Waste' },
        ].map(t => (
          <button key={t.id} className={`ana-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && (
        <div className="ana-content">
          <div className="ana-charts-row">
            <LineChart data={MONTHLY_ORDERS} color="#10b981" label="📦 Monthly Orders (FY 2025)" />
            <LineChart data={MONTHLY_REVENUE} color="#3b82f6" label="💰 Monthly Revenue (₹ Cr)" prefix="₹" suffix="Cr" />
          </div>
          <LineChart data={MONTHLY_WASTE} color="#f97316" label="🗑 Waste Reduction Index (kg/month — decreasing is good)" suffix=" kg" />
        </div>
      )}

      {tab === 'platforms' && (
        <div className="ana-content">
          <div className="ana-section-title">Platform Market Share & Performance</div>
          <DonutChart data={PLATFORM_DATA} />
          <div className="ana-platform-table">
            <table className="ana-table">
              <thead>
                <tr>
                  <th>Platform</th><th>Orders</th><th>Market Share</th><th>Gross Margin</th><th>NPS</th><th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM_DATA.map((p, i) => (
                  <tr key={i}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
                      <strong style={{ color: '#fff' }}>{p.name}</strong>
                    </td>
                    <td>{p.orders.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 60, height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.share * 2.5}%`, background: p.color, borderRadius: 3 }} />
                        </div>
                        <span style={{ color: p.color, fontWeight: 700 }}>{p.share}%</span>
                      </div>
                    </td>
                    <td style={{ color: p.margin > 22 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{p.margin}%</td>
                    <td style={{ color: p.nps > 65 ? '#10b981' : p.nps > 55 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>{p.nps}</td>
                    <td><TrendingUp size={14} style={{ color: '#10b981' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'cities' && (
        <div className="ana-content">
          <div className="ana-section-title">City-Level Performance Dashboard</div>
          <div className="ana-city-grid">
            {CITY_PERFORMANCE.map((c, i) => {
              const maxOrders = Math.max(...CITY_PERFORMANCE.map(x => x.orders));
              const colors = ['#10b981', '#3b82f6', '#f97316', '#a855f7', '#f59e0b'];
              const col = colors[i % colors.length];
              return (
                <div key={c.city} className="ana-city-card">
                  <div className="ana-city-card-header">
                    <span className="ana-city-name">{c.city}</span>
                    <span className="ana-city-growth" style={{ color: '#10b981' }}>+{c.growth}%</span>
                  </div>
                  <div className="ana-city-metric-bar">
                    <div style={{ height: '100%', width: `${(c.orders / maxOrders) * 100}%`, background: col, borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                  <div className="ana-city-stats">
                    <div className="ana-city-stat"><Zap size={11} style={{ color: col }} />{c.orders.toLocaleString()} orders</div>
                    <div className="ana-city-stat"><Store size={11} style={{ color: col }} />{c.stores} stores</div>
                    <div className="ana-city-stat"><Leaf size={11} style={{ color: '#10b981' }} />{c.waste_kg} kg saved</div>
                    <div className="ana-city-stat"><Clock size={11} style={{ color: '#6b7280' }} />CO₂: {c.co2} kg</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'waste' && (
        <div className="ana-content">
          <div className="ana-section-title">🌱 Zero-Waste Impact Report</div>
          <div className="ana-waste-grid">
            {[
              { label: 'Total Food Rescued', value: `${totalWasteSaved} kg`, sub: 'Across all cities FY 2025', color: '#10b981', icon: '🥦' },
              { label: 'CO₂ Emissions Avoided', value: `${totalCO2} kg`, sub: '= Food rescued × 2.0 factor', color: '#3b82f6', icon: '🌍' },
              { label: 'Trees Equivalent', value: `${(parseInt(totalCO2) / 21.77).toFixed(1)}`, sub: 'CO₂ absorbed per tree/year', color: '#a855f7', icon: '🌳' },
              { label: 'Revenue Recovered', value: '₹38.2L', sub: 'From near-expiry markdowns', color: '#f97316', icon: '💰' },
              { label: 'Households Served', value: '18,400+', sub: 'Via B2C rescue bundles', color: '#f59e0b', icon: '🏠' },
              { label: 'Green Points Issued', value: '2.4M pts', sub: 'Customer reward ecosystem', color: '#10b981', icon: '⭐' },
            ].map((w, i) => (
              <div key={i} className="ana-waste-card" style={{ borderColor: w.color + '28' }}>
                <div className="ana-waste-emoji">{w.icon}</div>
                <div className="ana-waste-val" style={{ color: w.color }}>{w.value}</div>
                <div className="ana-waste-label">{w.label}</div>
                <div className="ana-waste-sub">{w.sub}</div>
              </div>
            ))}
          </div>
          <LineChart data={MONTHLY_WASTE} color="#10b981" label="📉 Waste Reduction Trend — Continuous improvement month-over-month" suffix=" kg" />
        </div>
      )}
    </div>
  );
}
