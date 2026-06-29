import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Layers, TrendingUp, IndianRupee, FileDown, Terminal, Globe, ShieldAlert, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import AmbientBackground from '../components/AmbientBackground';

const TRANSLATIONS = {
  en: {
    title: "Intelligence Recommendations",
    subtitle: "Complete inventory, pricing, and layout optimization recommendations.",
    selectNb: "Select Neighborhood",
    inventoryTitle: "Inventory & Allocation",
    pricingTitle: "Hyperlocal Pricing Strategy",
    layoutTitle: "Store Layout Optimization",
    exportPdf: "Export to Leadership PDF",
    apiTitle: "Enterprise API Documentation",
    apiDesc: "Integrate Darkstori recommendations into your existing OMS or ERP systems.",
    category: "Category",
    allocation: "Space Allocation",
    investment: "Investment Amount",
    confidence: "Confidence Level",
    segment: "Segment",
    targetAov: "Target AOV",
    discounts: "Discount Strategy",
    peakHours: "Peak Hour Pricing",
  },
  hi: {
    title: "इंटेलिजेंस सिफारिशें",
    subtitle: "पूर्ण इन्वेंट्री, मूल्य निर्धारण, और लेआउट अनुकूलन सिफारिशें।",
    selectNb: "पड़ोस चुनें",
    inventoryTitle: "इवेंट्री और आवंटन",
    pricingTitle: "हाइपरलोकल मूल्य निर्धारण रणनीति",
    layoutTitle: "स्टोर लेआउट अनुकूलन",
    exportPdf: "नेतृत्व पीडीएफ निर्यात करें",
    apiTitle: "एंटरप्राइज एपीआई प्रलेखन",
    apiDesc: "अपने मौजूदा OMS या ERP सिस्टम में डार्कस्टोरी सिफारिशों को एकीकृत करें।",
    category: "श्रेणी",
    allocation: "स्थान आवंटन",
    investment: "निवेश राशि",
    confidence: "विश्वास स्तर",
    segment: "वर्ग",
    targetAov: "लक्ष्य AOV",
    discounts: "छूट रणनीति",
    peakHours: "पीक ऑवर मूल्य निर्धारण",
  },
  te: {
    title: "ఇంటెలిజెన్స్ సిఫార్సులు",
    subtitle: "పూర్తి ఇన్వెంటరీ, ధరలు మరియు లేఅవుట్ ఆప్టిమైజేషన్ సిఫార్సులు.",
    selectNb: "ప్రాంతాన్ని ఎంచుకోండి",
    inventoryTitle: "ఇన్వెంటరీ & కేటాయింపు",
    pricingTitle: "హైపర్లోకల్ ధర వ్యూహం",
    layoutTitle: "స్టోర్ లేఅవుట్ ఆప్టిమైజేషన్",
    exportPdf: "నాయకత్వ PDF ఎగుమతి",
    apiTitle: "ఎంటర్‌ప్రైజ్ API డాక్యుమెంటేషన్",
    apiDesc: "మీ ప్రస్తుత OMS లేదా ERP సిస్టమ్‌లలోకి డార్క్ స్టోరీ సిఫార్సులను చేర్చండి.",
    category: "వర్గం",
    allocation: "స్థల కేటాయింపు",
    investment: "పెట్టుబడి మొత్తం",
    confidence: "నమ్మక స్థాయి",
    segment: "విభాగం",
    targetAov: "లక్ష్య AOV",
    discounts: "డిస్కౌంట్ వ్యూహం",
    peakHours: "పీక్ అవర్ ధరలు",
  },
  mr: {
    title: "इंटेलिजन्स शिफारसी",
    subtitle: "पूर्ण इन्व्हेंटरी, किंमत आणि लेआउट ऑप्टिमायझेशन शिफारसी.",
    selectNb: "परिसर निवडा",
    inventoryTitle: "इव्हेंटरी आणि वाटप",
    pricingTitle: "हायपरलोकल किंमत धोरण",
    layoutTitle: "स्टोअर लेआउट शिफारसी",
    exportPdf: "नेतृत्व PDF निर्यात करा",
    apiTitle: "एंटरप्राइज एपीआय दस्तऐवजीकरण",
    apiDesc: "तुमच्या सध्याच्या OMS किंवा ERP सिस्टीममध्ये डार्कस्टोरी शिफारसी समाकलित करा.",
    category: "श्रेणी",
    allocation: "जागा वाटप",
    investment: "गुंतवणूक रक्कम",
    confidence: "विश्वास पातळी",
    segment: "विभाग",
    targetAov: "लक्ष्य AOV",
    discounts: "सवलत धोरण",
    peakHours: "पीक अवर किंमत",
  }
};

export default function Recommendations() {
  const [selectedNbId, setSelectedNbId] = useState(1);
  const [lang, setLang] = useState('en');
  const t = TRANSLATIONS[lang];

  // Interactive Layout parameters
  const [coldStorage, setColdStorage] = useState(20);
  const [ambient, setAmbient] = useState(35);
  const [freshProduce, setFreshProduce] = useState(20);
  const [personalCare, setPersonalCare] = useState(10);
  const [packing, setPacking] = useState(10);
  const [loading, setLoading] = useState(5);

  // Fetch all neighborhoods
  const { data: nbhds } = useQuery({
    queryKey: ['neighborhoods-all'],
    queryFn: () => api.getNeighborhoods(),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs-list'],
    queryFn: () => api.getAuditLogs(),
    refetchInterval: 5000
  });

  const neighborhoodList = nbhds && nbhds.length > 0 ? nbhds : [
    { neighborhood_id: 1, neighborhood_name: 'Koramangala' },
    { neighborhood_id: 2, neighborhood_name: 'Indiranagar' },
    { neighborhood_id: 3, neighborhood_name: 'HSR Layout' },
    { neighborhood_id: 4, neighborhood_name: 'Saket' },
    { neighborhood_id: 5, neighborhood_name: 'Hitech City' },
  ];

  const { data: recData, isLoading, refetch } = useQuery({
    queryKey: ['recommendations-complete', selectedNbId],
    queryFn: () => api.getCompleteRecommendation(selectedNbId),
    enabled: !!selectedNbId
  });

  useEffect(() => {
    refetch();
  }, [selectedNbId]);

  // Bottleneck calculations
  const totalAlloc = coldStorage + ambient + freshProduce + personalCare + packing + loading;
  const packingPenalty = packing < 8 ? (8 - packing) * 10 : 0;
  const loadingPenalty = loading < 4 ? (4 - loading) * 15 : 0;
  const totalOffsetPenalty = Math.abs(100 - totalAlloc) * 5;
  const bottleneckScore = Math.min(100, Math.round(packingPenalty + loadingPenalty + totalOffsetPenalty));

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minHeight: '100vh', position: 'relative', zIndex: 1 }} className="print-area">
      <AmbientBackground />

      {/* Header controls */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles color="var(--marigold-500)" size={32} /> {t.title}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.94rem', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
            {t.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-surface)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <Globe size={16} color="var(--color-text-secondary)" />
            <select 
              value={lang} 
              onChange={(e) => setLang(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.84rem', cursor: 'pointer', outline: 'none', fontWeight: 600 }}
            >
              <option value="en" style={{ background: '#0B0D14' }}>English</option>
              <option value="hi" style={{ background: '#0B0D14' }}>हिंदी (Hindi)</option>
              <option value="te" style={{ background: '#0B0D14' }}>తెలుగు (Telugu)</option>
              <option value="mr" style={{ background: '#0B0D14' }}>मराठी (Marathi)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>{t.selectNb}:</span>
            <select
              value={selectedNbId}
              onChange={(e) => setSelectedNbId(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {neighborhoodList.map(n => (
                <option key={n.neighborhood_id} value={n.neighborhood_id} style={{ background: '#0B0D14' }}>
                  {n.neighborhood_name}
                </option>
              ))}
            </select>
          </div>

          <button onClick={handleExportPDF} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileDown size={16} />
            {t.exportPdf}
          </button>
        </div>
      </div>

      <div className="print-only-header" style={{ display: 'none', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24pt', fontWeight: 'bold', margin: '0 0 4px 0' }}>DARKSTORI INTELLIGENCE EXECUTIVE SUMMARY REPORT</h1>
        <p style={{ fontSize: '11pt', margin: 0 }}>
          Neighborhood Profile: <strong>{neighborhoodList.find(n => n.neighborhood_id === selectedNbId)?.neighborhood_name}</strong> | Generated on: {new Date().toLocaleDateString()}
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: 'var(--color-text-muted)' }}>
          Loading AI Recommendations Engine...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
            
            {/* INVENTORY ALLOCATION */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                <Layers color="var(--peacock-500)" size={20} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>{t.inventoryTitle}</h2>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    <th style={{ padding: '8px 4px' }}>{t.category}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t.allocation}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t.investment}</th>
                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t.confidence}</th>
                  </tr>
                </thead>
                <tbody>
                  {recData?.inventory?.map((inv, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 4px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{inv.category}</td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{inv.space_allocation_pct}%</td>
                      <td style={{ padding: '10px 4px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <IndianRupee size={12} /> {inv.investment_amount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                        <span className="badge" style={{
                          background: inv.confidence_level >= 0.85 ? 'rgba(14, 124, 134, 0.15)' : 'rgba(232, 163, 61, 0.15)',
                          color: inv.confidence_level >= 0.85 ? 'var(--peacock-500)' : 'var(--marigold-500)'
                        }}>
                          {Math.round(inv.confidence_level * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PRICING STRATEGY */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                <TrendingUp color="var(--saffron-500)" size={20} />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>{t.pricingTitle}</h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {recData?.pricing?.map((prc, idx) => (
                  <div key={idx} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{prc.segment} {t.segment}</span>
                      <span className="badge" style={{ background: 'rgba(255, 122, 26, 0.12)', color: 'var(--saffron-500)' }}>
                        {t.targetAov}: ₹{prc.avg_order_value_target}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                      <strong>{t.discounts}:</strong> {prc.discount_strategy}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* INTERACTIVE STORE LAYOUT OPTIMIZER */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
            
            {/* Interactive Grid Map */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>{t.layoutTitle} (1,500 sqft)</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Fulfillment Bottleneck:</span>
                  <span className="badge" style={{
                    background: bottleneckScore > 40 ? 'rgba(194, 59, 59, 0.15)' : bottleneckScore > 15 ? 'rgba(232, 163, 61, 0.15)' : 'rgba(14, 124, 134, 0.15)',
                    color: bottleneckScore > 40 ? 'var(--spice-500)' : bottleneckScore > 15 ? 'var(--marigold-500)' : 'var(--peacock-500)'
                  }}>{bottleneckScore}% {bottleneckScore > 40 ? 'HIGH' : bottleneckScore > 15 ? 'MODERATE' : 'OPTIMIZED'}</span>
                </div>
              </div>

              {totalAlloc !== 100 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(194, 59, 59, 0.12)', border: '1px solid rgba(194, 59, 59, 0.2)', padding: '8px 12px', borderRadius: '4px', fontSize: '0.78rem', color: 'var(--spice-500)' }}>
                  <AlertTriangle size={14} />
                  <span>Total allocations must equal exactly 100% (currently: {totalAlloc}%). Tweak sliders below to balance.</span>
                </div>
              )}

              {/* Grid map canvas visualization */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: '80px', gap: '8px', background: '#090a0f', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ gridColumn: 'span 4', gridRow: 'span 2', background: 'rgba(14, 124, 134, 0.15)', border: '1px solid var(--peacock-500)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--peacock-500)', fontWeight: 700 }}>COLD STORAGE ({coldStorage}%)</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Dairy, Frozen, Meat</span>
                </div>

                <div style={{ gridColumn: 'span 5', gridRow: 'span 2', background: 'rgba(232, 163, 61, 0.12)', border: '1px solid var(--marigold-500)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--marigold-500)', fontWeight: 700 }}>AMBIENT SHELVES ({ambient}%)</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>Snacks, Staples, Household</span>
                </div>

                <div style={{ gridColumn: 'span 3', gridRow: 'span 1', background: 'rgba(255, 122, 26, 0.12)', border: '1px solid var(--saffron-500)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--saffron-500)', fontWeight: 700 }}>PRODUCE ({freshProduce}%)</span>
                </div>

                <div style={{ gridColumn: 'span 3', gridRow: 'span 1', background: 'rgba(141, 148, 163, 0.15)', border: '1px solid var(--monsoon-500)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--monsoon-500)', fontWeight: 700 }}>CARE ({personalCare}%)</span>
                </div>

                <div style={{ gridColumn: 'span 8', gridRow: 'span 1', background: 'rgba(194, 59, 59, 0.12)', border: '1px solid var(--spice-500)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--spice-500)', fontWeight: 700 }}>PACKING ({packing}%)</span>
                </div>

                <div style={{ gridColumn: 'span 4', gridRow: 'span 1', background: 'rgba(14, 124, 134, 0.15)', border: '1px dotted var(--peacock-500)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--peacock-500)', fontWeight: 700 }}>LOADING ({loading}%)</span>
                </div>
              </div>
            </div>

            {/* Adjustable sliders */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700 }}>Interactive Space Allocation Tuner</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cold Storage</span><strong>{coldStorage}%</strong></div>
                  <input type="range" min={5} max={40} value={coldStorage} onChange={(e) => setColdStorage(Number(e.target.value))} style={{ accentColor: 'var(--peacock-500)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ambient Shelves</span><strong>{ambient}%</strong></div>
                  <input type="range" min={15} max={60} value={ambient} onChange={(e) => setAmbient(Number(e.target.value))} style={{ accentColor: 'var(--peacock-500)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fresh Produce</span><strong>{freshProduce}%</strong></div>
                  <input type="range" min={5} max={30} value={freshProduce} onChange={(e) => setFreshProduce(Number(e.target.value))} style={{ accentColor: 'var(--peacock-500)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Personal Care</span><strong>{personalCare}%</strong></div>
                  <input type="range" min={2} max={20} value={personalCare} onChange={(e) => setPersonalCare(Number(e.target.value))} style={{ accentColor: 'var(--peacock-500)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Packing Station</span><strong>{packing}%</strong></div>
                  <input type="range" min={2} max={20} value={packing} onChange={(e) => setPacking(Number(e.target.value))} style={{ accentColor: 'var(--peacock-500)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Loading Bay</span><strong>{loading}%</strong></div>
                  <input type="range" min={2} max={15} value={loading} onChange={(e) => setLoading(Number(e.target.value))} style={{ accentColor: 'var(--peacock-500)' }} />
                </div>
              </div>
            </div>

          </div>

          {/* HISTORICAL DECISION PROVENANCE LEDGER */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <ShieldCheck color="var(--peacock-500)" size={20} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>Leadership Decision Provenance Ledger</h2>
            </div>
            
            <span style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
              Historical audit log of approved store deployments, tracking the specific model credentials and parameters utilized at validation.
            </span>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '8px 6px' }}>Store Name</th>
                  <th style={{ padding: '8px 6px' }}>Approver</th>
                  <th style={{ padding: '8px 6px' }}>Model Version</th>
                  <th style={{ padding: '8px 6px' }}>Capex</th>
                  <th style={{ padding: '8px 6px' }}>Daily Orders (Proj)</th>
                  <th style={{ padding: '8px 6px' }}>Approved Date</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs?.map((log) => {
                  const prov = log.new_state?.decision_provenance;
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {log.new_state?.store_provisioned || "Darkstore Hub"}
                      </td>
                      <td style={{ padding: '10px 6px', color: 'var(--color-text-secondary)' }}>
                        {prov?.approver?.email || "regional_head@darkstori.com"}
                      </td>
                      <td style={{ padding: '10px 6px', fontFamily: 'var(--font-mono)' }}>
                        v{prov?.model_version || "3.1.0"}
                      </td>
                      <td style={{ padding: '10px 6px', fontFamily: 'var(--font-mono)' }}>
                        ₹{(prov?.parameters_snapshot?.investment || 1500000).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 6px', fontFamily: 'var(--font-mono)' }}>
                        {prov?.parameters_snapshot?.predicted_daily_orders || 240} orders
                      </td>
                      <td style={{ padding: '10px 6px', color: 'var(--color-text-muted)' }}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {(!auditLogs || auditLogs.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No store approval audit logs found. Approve a simulated site to seed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* DEVELOPER API SURFACE */}
          <div className="glass-card no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <Terminal color="var(--peacock-500)" size={20} />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>{t.apiTitle}</h2>
            </div>
            
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)' }}>
              {t.apiDesc}
            </p>

            <div style={{ background: '#090a0f', borderRadius: 'var(--radius-md)', padding: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '8px' }}>GET /api/recommendations/complete</span>
              <pre style={{ margin: 0, color: 'var(--peacock-500)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', overflowX: 'auto', whiteSpace: 'pre' }}>
                {`curl -X GET "${window.location.origin}/api/recommendations/complete?neighborhood_id=${selectedNbId}" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
          </div>

        </div>
      )}

      {/* Styled Print media css injection */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-area {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .glass-card {
            border: 1px solid #ddd !important;
            background: #fff !important;
            box-shadow: none !important;
            color: #000 !important;
            page-break-inside: avoid;
          }
          .print-only-header {
            display: block !important;
            color: #000 !important;
          }
          table, th, td {
            color: #000 !important;
            border-color: #ddd !important;
          }
        }
      `}</style>

    </div>
  );
}
