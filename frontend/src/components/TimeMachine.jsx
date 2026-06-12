import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, ShieldAlert, Award } from 'lucide-react';

const YEAR_DATA = {
  2020: {
    title: 'The Inception & COVID-19 Pivot',
    desc: 'Hyperlocal deliveries accelerate during restrictions. Early dark store skeletons established in Bangalore. Order values rise with bulk grocery stockpiling.',
    stores: 8,
    orders: '14,200',
    market_share: 'Swiggy Instamart: 82%, Local: 18%',
    event: 'Instamart pilot launches in Bangalore.',
  },
  2021: {
    title: 'Boiling Capital & Zepto Entrance',
    desc: 'The birth of 10-minute delivery. Zepto enters with custom dark store layout algorithms. VC funding floods metro cities. Platform wars begin.',
    stores: 18,
    orders: '38,000',
    market_share: 'Instamart: 48%, Zepto: 28%, Grofers: 24%',
    event: 'Grofers rebrands to Blinkit, pivoting to 10-min delivery.',
  },
  2022: {
    title: 'National Scale & Infrastructure Expansion',
    desc: 'Expansion to Pune, Hyderabad, and Delhi NCR. Pincode mapping becomes standard. Cold-chain storage constraints identified. Density beats footprint.',
    stores: 35,
    orders: '74,500',
    market_share: 'Blinkit: 38%, Instamart: 34%, Zepto: 28%',
    event: 'Blinkit acquired by Zomato in a mega quick-commerce deal.',
  },
  2023: {
    title: 'Unit Economics & Saturated Hubs',
    desc: 'Focus shifts from pure growth to contribution margin. Rent optimization and rider payout adjustments. First opportunity zone clustering attempts.',
    stores: 42,
    orders: '118,420',
    market_share: 'Zepto: 36%, Blinkit: 34%, Instamart: 30%',
    event: 'Zepto raises $200M, becoming India\'s first unicorn of 2023.',
  },
  2024: {
    title: 'The AI-Powered Decoupling Era',
    desc: 'Real-time telemetry, model drift monitoring, and zero-waste markdown engines deployed. Dark stores expand inventory to electronics, toys, and premium meat.',
    stores: 58,
    orders: '240,000',
    market_share: 'Blinkit: 42%, Zepto: 35%, Instamart: 23%',
    event: 'Flipkart Minutes and BB Now launch to enter the instant space.',
  },
};

export default function TimeMachine({ height = 360 }) {
  const [selectedYear, setSelectedYear] = useState(2023);
  const years = Object.keys(YEAR_DATA).map(Number);
  const data = YEAR_DATA[selectedYear];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: `${height}px` }}>
      {/* Slider / Scrub bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700 }}>
          <span>SCRUB MARKET TIMELINE</span>
          <span style={{ color: '#3b82f6', fontWeight: 800 }}>ACTIVE YEAR: {selectedYear}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Clock size={16} color="#94a3b8" />
          <input
            type="range"
            min={years[0]}
            max={years[years.length - 1]}
            step={1}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer',
              accentColor: '#3b82f6'
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px' }}>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              style={{
                background: 'transparent',
                border: 'none',
                color: selectedYear === y ? '#3b82f6' : '#475569',
                fontWeight: selectedYear === y ? 800 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Year content description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedYear}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.3 }}
          style={{
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            background: 'rgba(255,255,255,0.01)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.03)'
          }}
        >
          {/* Main Info */}
          <div style={{ flex: 2, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#fbbf24" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                {data.title}
              </h3>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: '1.6', margin: '4px 0 0 0' }}>
              {data.desc}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '6px', padding: '8px 12px', marginTop: '10px' }}>
              <ShieldAlert size={14} color="#f59e0b" />
              <span style={{ fontSize: '0.78rem', color: '#f59e0b', fontWeight: 600 }}>
                Major Event: {data.event}
              </span>
            </div>
          </div>

          {/* Stats Column */}
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Active Platform Stores</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{data.stores}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Cumulative Orders</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{data.orders}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #a855f7' }}>
              <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Top Competitors</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', marginTop: '4px', lineHeight: '1.4' }}>{data.market_share}</div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
