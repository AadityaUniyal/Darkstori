import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCity } from '../context/CityContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, Scan, Package, Clock, ShieldAlert,
  ThermometerSnowflake, Zap, ArrowRight, RefreshCw, Volume2, Globe,
  Barcode, Check, X, Building2, Truck, Loader2, Bike, Wallet, UserCheck, KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import { floorAudio } from '../utils/floorAudio';
import RowActionMenu from './RowActionMenu';

const FLOOR_LANGUAGES = {
  en: {
    modeTitle: "Dark Store Floor Terminal",
    subtitle: "High-contrast mobile interface for store pickers and hub supervisors",
    pickingTab: "Pick Queue (Live)",
    inboundTab: "Inbound Dock (GRN)",
    dispatchTab: "Rider Dispatch & COD",
    shrinkageTab: "Bin Audit & Shrinkage",
    coldChainTab: "Cold Chain & Power",
    orderSla: "SLA Deadline",
    itemCount: "items to pick",
    scanPrompt: "Scan Barcode or Tap to Confirm",
    binLocation: "Bin Location",
    picked: "Picked",
    pending: "Pending",
    completePick: "Dispatch to Packing Bay",
    physicalCount: "Physical Count",
    systemCount: "System Count",
    shrinkageReason: "Reason for Variance",
    recordShrinkage: "Commit Stock Ledger Adjustment",
    freezerStatus: "Dairy & Ice Cream Chillers",
    powerStatus: "Grid Power & Backup DG",
    normal: "Normal (3.8°C)",
    backupReady: "DG Diesel at 92% • Auto-cutover Active"
  },
  hi: {
    modeTitle: "डार्क स्टोर फ्लोर टर्मिनल",
    subtitle: "स्टोर पिकर्स और हब सुपरवाइजर के लिए हाई-कंट्रास्ट इंटरफ़ेस",
    pickingTab: "पिकिंग कतार (लाइव)",
    inboundTab: "इनबाउंड डॉक (GRN)",
    dispatchTab: "राइडर डिस्पैच और कैश (COD)",
    shrinkageTab: "बिन ऑडिट और नुकसान",
    coldChainTab: "कोल्ड चेन और बिजली",
    orderSla: "समय सीमा (SLA)",
    itemCount: "आइटम उठाने हैं",
    scanPrompt: "बारकोड स्कैन करें या पुष्टि करें",
    binLocation: "रैक और बिन स्थान",
    picked: "उठा लिया",
    pending: "बाकी है",
    completePick: "पैकिंग बे में भेजें",
    physicalCount: "मौजूदा भौतिक गिनती",
    systemCount: "सिस्टम में गिनती",
    shrinkageReason: "कमी का कारण",
    recordShrinkage: "स्टॉक लेजर में दर्ज करें",
    freezerStatus: "दूध और आइसक्रीम चिलर",
    powerStatus: "बिजली और बैकअप जनरेटर",
    normal: "सामान्य (3.8°C)",
    backupReady: "डीजल 92% • ऑटो-कटओवर सक्रिय"
  },
  kn: {
    modeTitle: "ಡಾರ್ಕ್ ಸ್ಟೋರ್ ಫ್ಲೋರ್ ಟರ್ಮಿನಲ್",
    subtitle: "ಸ್ಟೋರ್ ಪಿಕರ್ಸ್ ಮತ್ತು ಹಬ್ ಮೇಲ್ವಿಚಾರಕರಿಗಾಗಿ ಮೊಬೈಲ್ ಇಂಟರ್ಫೇಸ್",
    pickingTab: "ಪಿಕ್ಕಿಂಗ್ ಕ್ಯೂ (ಲೈವ್)",
    inboundTab: "ಇನ್‌ಬೌಂಡ್ ಡಾಕ್ (GRN)",
    dispatchTab: "ರೈಡರ್ ರವಾನೆ & ನಗದು",
    shrinkageTab: "ಬಿನ್ ಆಡಿಟ್ ಮತ್ತು ವ್ಯತ್ಯಾಸ",
    coldChainTab: "ಕೋಲ್ಡ್ ಚೈನ್ ಮತ್ತು ವಿದ್ಯುತ್",
    orderSla: "ಸಮಯ ಮಿತಿ (SLA)",
    itemCount: "ಆಯ್ಕೆ ಮಾಡಬೇಕಾದ ವಸ್ತುಗಳು",
    scanPrompt: "ಬಾರ್‌ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ ದೃಢೀಕರಿಸಿ",
    binLocation: "ಬಿನ್ ಸ್ಥಳ",
    picked: "ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ",
    pending: "ಬಾಕಿ ಇದೆ",
    completePick: "ಪ್ಯಾಕಿಂಗ್ ಬೇಗೆ ರವಾನಿಸಿ",
    physicalCount: "ನಿಜವಾದ ಸಂಖ್ಯೆ",
    systemCount: "ಸಿಸ್ಟಮ್ ಸಂಖ್ಯೆ",
    shrinkageReason: "ವ್ಯತ್ಯಾಸಕ್ಕೆ ಕಾರಣ",
    recordShrinkage: "ಸ್ಟಾಕ್ ಲೆಡ್ಜರ್‌ಗೆ ನಮೂದಿಸಿ",
    freezerStatus: "ಹಾಲು ಮತ್ತು ಐಸ್‌ಕ್ರೀಮ್ ಚಿಲ್ಲರ್",
    powerStatus: "ವಿದ್ಯುತ್ ಮತ್ತು ಜನರೇಟರ್",
    normal: "ಸಾಮಾನ್ಯ (3.8°C)",
    backupReady: "ಡೀಸೆಲ್ 92% • ಸ್ವಯಂಚಾಲಿತ ಆನ್"
  },
  te: {
    modeTitle: "డార్క్ స్టోర్ ఫ్లోర్ టెర్మినల్",
    subtitle: "స్టోర్ పికర్స్ మరియు హబ్ పర్యవేక్షకుల కోసం మొబైల్ ఇంటర్ఫేస్",
    pickingTab: "పికింగ్ క్యూ (లైవ్)",
    inboundTab: "ఇన్‌బౌండ్ డాక్ (GRN)",
    dispatchTab: "రైడర్ డిస్పాచ్ & క్యాష్",
    shrinkageTab: "బిన్ ఆడిట్ & నష్టం",
    coldChainTab: "కోల్డ్ చైన్ & పవర్",
    orderSla: "సమయ పరిమితి (SLA)",
    itemCount: "ఎంచుకోవాల్సిన వస్తువులు",
    scanPrompt: "బార్‌కోడ్ స్కాన్ చేయండి లేదా నిర్ధారించండి",
    binLocation: "బిన్ స్థానం",
    picked: "ఎంచుకోబడింది",
    pending: "పెండింగ్",
    completePick: "ప్యాకింగ్ బేకి పంపండి",
    physicalCount: "భౌతిక లెక్కింపు",
    systemCount: "సిస్టమ్ లెక్కింపు",
    shrinkageReason: "వ్యత్యాసానికి కారణం",
    recordShrinkage: "స్టాక్ లెడ్జర్‌లో నమోదు చేయండి",
    freezerStatus: "డైరీ & ఐస్ క్రీమ్ చిల్లర్స్",
    powerStatus: "కరెంట్ & బ్యాకప్ జనరేటర్",
    normal: "సాధారణం (3.8°C)",
    backupReady: "డీజిల్ 92% • ఆటో బ్యాకప్ సిద్ధం"
  },
  mr: {
    modeTitle: "डार्क स्टोअर फ्लोअर टर्मिनल",
    subtitle: "स्टोअर पिकर्स आणि हब सुपरवायझरसाठी मोबाईल इंटरफेस",
    pickingTab: "पिकिंग रांग (थेट)",
    inboundTab: "इनबाउंड डॉक (GRN)",
    dispatchTab: "राइडर डिस्पैच और कैश (COD)",
    shrinkageTab: "बिन ऑडिट आणि नुकसान",
    coldChainTab: "कोल्ड चेन आणि वीज",
    orderSla: "वेळ मर्यादा (SLA)",
    itemCount: "वस्तू उचलायच्या आहेत",
    scanPrompt: "बारकोड स्कॅन करा किंवा पुष्टी करा",
    binLocation: "बिन स्थान",
    picked: "उचलले",
    pending: "प्रलंबित",
    completePick: "पॅकिंग बेकडे पाठवा",
    physicalCount: "प्रत्यक्ष मोजणी",
    systemCount: "सिस्टीम मोजणी",
    shrinkageReason: "फरकाचे कारण",
    recordShrinkage: "स्टॉक लेजरमध्ये नोंदवा",
    freezerStatus: "दूध व आईस्क्रीम चिलर्स",
    powerStatus: "वीज व बॅकअप जनरेटर",
    normal: "सामान्य (3.8°C)",
    backupReady: "डिझेल 92% • ऑटो-कटओव्हर सुरू"
  }
};

const INITIAL_PICK_ORDERS = [
  {
    orderId: "BLNK-8821",
    slaSeconds: 260,
    items: [
      { id: "item-1", name: "Amul Taaza Toned Milk 500ml", qty: 2, bin: "AISLE 1 · CHILLER BAY · TRAY 02", ean: "8901262010054", picked: false },
      { id: "item-2", name: "Modern White Bread 400g", qty: 1, bin: "AISLE 2 · RACK A · SHELF 01", ean: "8901719102021", picked: false },
      { id: "item-3", name: "Fresh Coriander (Dhaniya) 100g", qty: 1, bin: "AISLE 1 · VEG RACK · BIN 04", ean: "8904012019912", picked: false },
    ]
  },
  {
    orderId: "ZEPT-4109",
    slaSeconds: 480,
    items: [
      { id: "item-4", name: "Aashirvaad Shudh Chakki Atta 5kg", qty: 1, bin: "AISLE 4 · HEAVY FLOOR BAY 01", ean: "8901030382218", picked: false },
      { id: "item-5", name: "Fortune Sunlite Sunflower Oil 1L", qty: 2, bin: "AISLE 3 · RACK C · SHELF 02", ean: "8906007281023", picked: false },
      { id: "item-6", name: "Tata Salt 1kg", qty: 1, bin: "AISLE 3 · RACK A · SHELF 03", ean: "8901015000015", picked: false },
    ]
  }
];

export default function DarkStoreFloorMode({ city = "Bangalore", activeStoreId = null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedCity: contextCity } = useCity();

  const effectiveCity = searchParams.get('city') || city || contextCity || 'Bangalore';
  const urlStoreId = searchParams.get('store_id');
  const urlStoreName = searchParams.get('store_name');
  const effectiveStoreId = urlStoreId || activeStoreId || 1;
  const storeDisplayTitle = urlStoreName ? decodeURIComponent(urlStoreName) : `${effectiveCity} Micro-Warehouse Hub`;
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('picking'); // 'picking' | 'audit' | 'coldchain'
  const [orders, setOrders] = useState(INITIAL_PICK_ORDERS);
  const [activeOrderIdx, setActiveOrderIdx] = useState(0);
  const [isScanning, setIsScanning] = useState(false);

  // Shrinkage state
  const [auditItem, setAuditItem] = useState("Amul Taaza Toned Milk 500ml");
  const [systemUnits, setSystemUnits] = useState(24);
  const [countedUnits, setCountedUnits] = useState(21);
  const [shrinkageReason, setShrinkageReason] = useState("Leaked Pouch in Transit Crate");

  // Inbound Receiving state
  const [inboundSupplier, setInboundSupplier] = useState('Amul Dairy Gujarat Co-op');
  const [inboundPoNumber, setInboundPoNumber] = useState(`PO-2026-${Date.now().toString().slice(-4)}`);
  const [inboundItem, setInboundItem] = useState('Amul Taaza Toned Milk 500ml');
  const [inboundCategory, setInboundCategory] = useState('Dairy');
  const [inboundQty, setInboundQty] = useState(100);
  const [inboundPrice, setInboundPrice] = useState(27.0);
  const [inboundExpiry, setInboundExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [inboundTargetBay, setInboundTargetBay] = useState('CHILLER BAY 02');
  const [isReceiving, setIsReceiving] = useState(false);

  const handleConfirmInboundGRN = async () => {
    setIsReceiving(true);
    try {
      await api.createBatch({
        product_name: inboundItem,
        category: inboundCategory,
        store_id: activeStoreId || 1,
        quantity: parseInt(inboundQty, 10),
        base_price: parseFloat(inboundPrice),
        current_price: parseFloat(inboundPrice),
        discount_rate: 0.0,
        freshness_score: 1.0,
        expiry_time: `${inboundExpiry}T23:59:59Z`,
        decay_rate_per_hour: 0.02,
        qr_code_hash: `GRN-${inboundPoNumber}-${Date.now().toString().slice(-4)}`
      });
      toast.success(`GRN Completed: Booked ${inboundQty} units to ${inboundTargetBay} & StockLedger.`);
      setInboundPoNumber(`PO-2026-${Date.now().toString().slice(-4)}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Inbound receiving failed.");
    } finally {
      setIsReceiving(false);
    }
  };

  const t = FLOOR_LANGUAGES[lang] || FLOOR_LANGUAGES.en;
  const currentOrder = orders[activeOrderIdx] || orders[0];

  const handleToggleItemPicked = (itemId) => {
    setOrders(prev => prev.map((ord, idx) => {
      if (idx !== activeOrderIdx) return ord;
      return {
        ...ord,
        items: ord.items.map(it => {
          if (it.id === itemId) {
            const nextVal = !it.picked;
            if (nextVal) {
              floorAudio.playSuccessPick();
            }
            return { ...it, picked: nextVal };
          }
          return it;
        })
      };
    }));
  };

  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      // Pick first unpicked item in current order
      const unpicked = currentOrder.items.find(it => !it.picked);
      if (unpicked) {
        handleToggleItemPicked(unpicked.id);
        floorAudio.playSuccessPick();
        toast.success(`Scanned EAN ${unpicked.ean}: ${unpicked.name}`);
      } else {
        floorAudio.playErrorMismatch();
        toast.info("All items in this order are already picked!");
      }
    }, 500);
  };

  const handleDispatchOrder = () => {
    const allPicked = currentOrder.items.every(it => it.picked);
    if (!allPicked) {
      floorAudio.playErrorMismatch();
      toast.warning("Please pick and scan all items before dispatching to packing bay!");
      return;
    }
    floorAudio.playDispatchSuccess();
    toast.success(`Order ${currentOrder.orderId} dispatched to Bagging & Rider Hand-off!`);
    setOrders(prev => prev.filter((_, idx) => idx !== activeOrderIdx));
    setActiveOrderIdx(0);
  };

  const handleCommitShrinkage = () => {
    const variance = countedUnits - systemUnits;
    if (variance === 0) {
      toast.info("No discrepancy detected. Stock balance confirmed.");
      return;
    }
    floorAudio.playSuccessPick();
    toast.success(`Recorded ${Math.abs(variance)} units variance (${shrinkageReason}) to Double-Entry StockLedger.`);
    setSystemUnits(countedUnits);
  };

  // Rider Fleet & COD Floating State
  const [riders, setRiders] = useState([
    {
      id: "RDR-101",
      name: "Ramesh Kumar",
      phone: "+91 98450 21983",
      vehicle: "Ather 450X · KA-01-EQ-4412",
      bay: "DOCK BAY 01",
      assignedOrder: "BLNK-8821",
      bags: 2,
      amount: 342,
      paymentMode: "Cash on Delivery (COD)",
      status: "Waiting for Bags",
      expectedOtp: "4819",
      enteredOtp: ""
    },
    {
      id: "RDR-102",
      name: "Suresh Patel",
      phone: "+91 97401 88321",
      vehicle: "Hero Splendor · KA-05-MK-9910",
      bay: "DOCK BAY 02",
      assignedOrder: "ZEPT-4109",
      bags: 1,
      amount: 560,
      paymentMode: "Prepaid Online (UPI)",
      status: "Waiting for Bags",
      expectedOtp: "7731",
      enteredOtp: ""
    },
    {
      id: "RDR-103",
      name: "Imran Khan",
      phone: "+91 99002 44109",
      vehicle: "Ola S1 Pro · KA-03-TR-2187",
      bay: "DOCK BAY 03",
      assignedOrder: "BLNK-9014",
      bags: 1,
      amount: 185,
      paymentMode: "Prepaid Online (UPI)",
      status: "Waiting for Bags",
      expectedOtp: "3194",
      enteredOtp: ""
    }
  ]);
  const [hubSafeCash, setHubSafeCash] = useState(14850);
  const [pendingCodCash, setPendingCodCash] = useState(342);

  const handleRiderOtpChange = (riderId, val) => {
    setRiders(prev => prev.map(r => r.id === riderId ? { ...r, enteredOtp: val } : r));
  };

  const handleVerifyRiderOtp = (riderId) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;

    if (rider.enteredOtp.trim() !== rider.expectedOtp) {
      floorAudio.playErrorMismatch();
      toast.error(`OTP Mismatch for ${rider.name} (Entered: ${rider.enteredOtp || 'empty'})! Do NOT release order bags.`);
      return;
    }

    floorAudio.playDispatchSuccess();
    toast.success(`OTP ${rider.expectedOtp} Verified! Order ${rider.assignedOrder} handed over to ${rider.name}.`);
    setRiders(prev => prev.map(r => r.id === riderId ? { ...r, status: "Out for 10-Min Delivery", enteredOtp: "" } : r));
  };

  const handleDepositCodCash = () => {
    if (pendingCodCash <= 0) {
      toast.info("No floating COD cash pending reconciliation.");
      return;
    }
    floorAudio.playDispatchSuccess();
    setHubSafeCash(prev => prev + pendingCodCash);
    toast.success(`Deposited ₹${pendingCodCash} COD cash into Hub Safe & recorded on Cash Ledger.`);
    setPendingCodCash(0);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-[#0A0E17] text-white p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
      {/* Top Bar: Title & Vernacular Language Pill */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-base sm:text-lg font-bold font-display text-white tracking-tight">
              {t.modeTitle}
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              HIGH CONTRAST FLOOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
          <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 w-fit text-xs">
            <Building2 size={13} className="text-amber-400" />
            <span className="font-semibold text-white">{storeDisplayTitle}</span>
            <span className="text-white/30">•</span>
            <span className="text-emerald-400 font-mono">{effectiveCity}</span>
            <span className="text-white/30">•</span>
            <span className="text-white/50 font-mono">Hub #{effectiveStoreId}</span>
          </div>
        </div>

        {/* Vernacular Language Selector */}
        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 px-3 py-1.5 rounded-xl">
          <Globe size={15} className="text-emerald-400" />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
          >
            <option value="en" className="bg-[#0A0E17]">English</option>
            <option value="hi" className="bg-[#0A0E17]">हिन्दी (Hindi)</option>
            <option value="kn" className="bg-[#0A0E17]">ಕನ್ನಡ (Kannada)</option>
            <option value="te" className="bg-[#0A0E17]">తెలుగు (Telugu)</option>
            <option value="mr" className="bg-[#0A0E17]">मराठी (Marathi)</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mt-4 pb-2 border-b border-white/5">
        <button
          onClick={() => setActiveTab('picking')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'picking'
              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Package size={14} />
          {t.pickingTab}
        </button>
        <button
          onClick={() => setActiveTab('inbound')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'inbound'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Truck size={14} />
          {t.inboundTab}
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'dispatch'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <Bike size={14} />
          {t.dispatchTab}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <ShieldAlert size={14} />
          {t.shrinkageTab}
        </button>
        <button
          onClick={() => setActiveTab('coldchain')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'coldchain'
              ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/20'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          <ThermometerSnowflake size={14} />
          {t.coldChainTab}
        </button>
        <button
          onClick={() => navigate('/vision-pack')}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-[#00F0FF]/15 text-[#00F0FF] hover:bg-[#00F0FF]/25 border border-[#00F0FF]/30 shadow-[0_0_10px_rgba(0,240,255,0.2)] ml-auto"
        >
          <Scan size={14} className="animate-pulse" />
          <span>VisionPack AI™ Dock ↗</span>
        </button>
      </div>

      {/* Content 1: Picking Queue */}
      {activeTab === 'picking' && (
        <div className="mt-4 space-y-4">
          {orders.length === 0 ? (
            <div className="p-8 text-center bg-white/[0.02] rounded-xl border border-white/5">
              <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-2" />
              <div className="font-bold text-sm text-white">All Active Waves Dispatched!</div>
              <div className="text-xs text-slate-400 mt-1">Ready for incoming OMS order stream.</div>
            </div>
          ) : (
            <div>
              {/* Order Selector Chips */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {orders.map((ord, idx) => (
                  <button
                    key={ord.orderId}
                    onClick={() => setActiveOrderIdx(idx)}
                    className={`px-3 py-2 rounded-xl text-left border shrink-0 transition-all ${
                      idx === activeOrderIdx
                        ? 'bg-emerald-500/20 border-emerald-500 text-white'
                        : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <div className="font-mono font-bold text-xs">{ord.orderId}</div>
                    <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {Math.floor(ord.slaSeconds / 60)}m {ord.slaSeconds % 60}s left
                    </div>
                  </button>
                ))}
              </div>

              {/* Active Order Items List */}
              <div className="space-y-2.5 mt-3">
                {currentOrder.items.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItemPicked(item.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      item.picked
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-slate-300'
                        : 'bg-white/[0.04] border-white/10 hover:border-emerald-400/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide ${
                          item.picked ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'
                        }`}>
                          {item.bin}
                        </span>
                        <span className="text-xs font-mono text-slate-400">EAN {item.ean}</span>
                      </div>
                      <div className="font-bold text-sm text-white">{item.name}</div>
                      <div className="text-xs text-slate-400">Quantity: <strong className="text-white text-sm">{item.qty} units</strong></div>
                    </div>

                    <div className="pt-1 flex items-center gap-1.5">
                      <RowActionMenu
                        item={{
                          barcode: item.ean,
                          ean: item.ean,
                          name: item.name,
                          bin: item.bin,
                          qty: item.qty
                        }}
                        onSpotAudit={(sku) => {
                          setActiveTab('audit');
                          toast.info(`Spot Audit initiated for Bin ${sku.bin} (EAN ${sku.barcode})`);
                        }}
                        onViewLedger={(sku) => {
                          toast.success(`Ledger Verified: ${sku.name} | System Stock: ${sku.qty * 4} units | Shrinkage: 0.0%`);
                        }}
                        onPrintLabel={(sku) => {
                          toast.success(`Thermal 58mm label queued for ${sku.name}`);
                        }}
                      />
                      <div className={`w-7 h-7 rounded-lg grid place-items-center border ${
                        item.picked
                          ? 'bg-emerald-500 border-emerald-400 text-black'
                          : 'border-white/20 bg-white/5 text-transparent'
                      }`}>
                        <Check size={16} className={item.picked ? 'stroke-[3]' : ''} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-white/10">
                <button
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/20 flex items-center justify-center gap-2"
                >
                  <Scan size={18} className={isScanning ? 'animate-spin text-emerald-400' : ''} />
                  <span>{isScanning ? 'Scanning...' : t.scanPrompt}</span>
                </button>
                <button
                  onClick={handleDispatchOrder}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                >
                  <CheckCircle2 size={18} />
                  <span>{t.completePick}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content 1.5: Inbound Receiving Dock (GRN) */}
      {activeTab === 'inbound' && (
        <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-blue-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <Truck size={16} className="text-blue-400" />
              <span>Vendor Delivery Receiving & Put-Away (GRN)</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
              GATEWAY DOCK
            </span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Distributor / Vendor</label>
                <select
                  value={inboundSupplier}
                  onChange={(e) => setInboundSupplier(e.target.value)}
                  className="w-full bg-[#141A24] text-white text-xs p-2.5 rounded-lg border border-white/10"
                >
                  <option value="Amul Dairy Gujarat Co-op">Amul Gujarat Co-op (Daily Milk Crates)</option>
                  <option value="Mother Dairy Delhi">Mother Dairy (Fresh Pouches)</option>
                  <option value="Britannia Industries Ltd">Britannia Industries (Bakery & Breads)</option>
                  <option value="ITC Limited Foods Division">ITC Ltd (Aashirvaad Atta / Staples)</option>
                  <option value="Direct Mandi Local Hub">Direct Mandi Hub (Fresh Vegetables & Produce)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">PO / Challan Reference</label>
                <input
                  type="text"
                  value={inboundPoNumber}
                  onChange={(e) => setInboundPoNumber(e.target.value)}
                  className="w-full bg-[#141A24] text-white text-xs p-2.5 rounded-lg border border-white/10 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Product SKU</label>
                <select
                  value={inboundItem}
                  onChange={(e) => {
                    setInboundItem(e.target.value);
                    if (e.target.value.includes('Milk') || e.target.value.includes('Dahi')) {
                      setInboundCategory('Dairy');
                      setInboundTargetBay('CHILLER BAY 02');
                    } else if (e.target.value.includes('Bread')) {
                      setInboundCategory('Bakery');
                      setInboundTargetBay('RACK A-01');
                    } else if (e.target.value.includes('Atta')) {
                      setInboundCategory('Staples');
                      setInboundTargetBay('HEAVY FLOOR BAY 01');
                    } else {
                      setInboundCategory('Produce');
                      setInboundTargetBay('VEG RACK 01');
                    }
                  }}
                  className="w-full bg-[#141A24] text-white text-xs p-2.5 rounded-lg border border-white/10"
                >
                  <option value="Amul Taaza Toned Milk 500ml">Amul Taaza Toned Milk 500ml</option>
                  <option value="Modern White Bread 400g">Modern White Bread 400g</option>
                  <option value="Aashirvaad Shudh Chakki Atta 5kg">Aashirvaad Shudh Chakki Atta 5kg</option>
                  <option value="Fresh Hybrid Tomatoes 1kg">Fresh Hybrid Tomatoes 1kg</option>
                  <option value="Farm Fresh Eggs 6pk">Farm Fresh Eggs 6pk</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Crates / Units Received</label>
                <input
                  type="number"
                  value={inboundQty}
                  onChange={(e) => setInboundQty(e.target.value)}
                  className="w-full bg-[#141A24] text-white text-xs p-2.5 rounded-lg border border-white/10 font-mono font-bold"
                  min="1"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Best-Before / Expiry Date</label>
                <input
                  type="date"
                  value={inboundExpiry}
                  onChange={(e) => setInboundExpiry(e.target.value)}
                  className="w-full bg-[#141A24] text-white text-xs p-2.5 rounded-lg border border-white/10"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 flex items-center justify-between text-xs">
              <span className="text-blue-300 font-semibold">Directed Put-Away Location:</span>
              <span className="font-mono font-bold text-white bg-black/40 px-2.5 py-1 rounded border border-blue-400/30">
                {inboundTargetBay}
              </span>
            </div>

            <button
              onClick={handleConfirmInboundGRN}
              disabled={isReceiving}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs flex items-center justify-center gap-2 mt-2 shadow-lg shadow-blue-500/25"
            >
              {isReceiving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Booking to Stock Ledger...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Confirm Inbound GRN & Add {inboundQty} Units to Stock</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Content 1.8: Rider Dispatch Bay & COD Handoff */}
      {activeTab === 'dispatch' && (
        <div className="mt-4 space-y-4">
          {/* COD Float & Safe Reconciliation Banner */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Wallet size={20} />
              </div>
              <div>
                <div className="text-xs text-purple-300 font-bold uppercase tracking-wider">COD Cash Floating & Hub Safe</div>
                <div className="text-sm text-slate-300 mt-0.5">
                  Floating with Fleet: <strong className="text-amber-300">₹{pendingCodCash}</strong> · Hub Safe Balance: <strong className="text-emerald-400">₹{hubSafeCash}</strong>
                </div>
              </div>
            </div>
            <button
              onClick={handleDepositCodCash}
              disabled={pendingCodCash <= 0}
              className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 shrink-0"
            >
              <CheckCircle2 size={14} />
              <span>Reconcile & Deposit to Hub Safe</span>
            </button>
          </div>

          {/* Active Rider Dock Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Bike size={14} className="text-purple-400" />
                <span>Active Delivery Riders at Dispatch Bays ({riders.length})</span>
              </span>
              <span>10-Minute SLA Handoff Protocol</span>
            </div>

            {riders.map((rider) => (
              <div
                key={rider.id}
                className={`p-4 rounded-xl border transition-all ${
                  rider.status.includes('Delivery')
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-white/[0.03] border-white/10 hover:border-purple-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white border border-white/10">
                      {rider.bay}
                    </span>
                    <span className="font-bold text-sm text-white">{rider.name}</span>
                    <span className="text-xs text-slate-400 font-mono hidden md:inline">({rider.vehicle})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      rider.status.includes('Delivery')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    }`}>
                      {rider.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Assigned Order</span>
                    <strong className="text-white font-mono text-sm">{rider.assignedOrder}</strong>
                    <span className="text-slate-400 text-[11px] block">{rider.bags} Sealed Bag(s)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Mode & Amount</span>
                    <strong className="text-white text-sm">₹{rider.amount}</strong>
                    <span className={`text-[11px] block font-semibold ${rider.paymentMode.includes('COD') ? 'text-amber-400' : 'text-cyan-400'}`}>
                      {rider.paymentMode}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Rider Phone</span>
                    <span className="text-slate-300 font-mono text-xs">{rider.phone}</span>
                  </div>
                </div>

                {rider.status !== "Out for 10-Min Delivery" ? (
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <div className="w-full sm:w-auto flex items-center gap-2">
                      <KeyRound size={15} className="text-purple-400 shrink-0" />
                      <input
                        type="text"
                        maxLength={4}
                        placeholder={`Enter OTP (${rider.expectedOtp})`}
                        value={rider.enteredOtp}
                        onChange={(e) => handleRiderOtpChange(rider.id, e.target.value)}
                        className="w-full sm:w-44 bg-[#141A26] border border-white/20 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-purple-400 text-center tracking-widest font-bold"
                      />
                    </div>
                    <button
                      onClick={() => handleVerifyRiderOtp(rider.id)}
                      className="w-full sm:w-auto flex-1 py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all"
                    >
                      <UserCheck size={14} />
                      <span>Verify OTP & Authorize Bag Release</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Bags Released & Handshake Verified at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Order en-route.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content 2: Bin Audit & Shrinkage */}
      {activeTab === 'audit' && (
        <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="font-bold text-sm text-white">Physical Bin Count Reconciliation</div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Product Batch</label>
              <select
                value={auditItem}
                onChange={(e) => setAuditItem(e.target.value)}
                className="w-full bg-[#141A24] text-white text-sm p-2.5 rounded-lg border border-white/10"
              >
                <option value="Amul Taaza Toned Milk 500ml">Amul Taaza Toned Milk 500ml (Chiller Bay 02)</option>
                <option value="Modern White Bread 400g">Modern White Bread 400g (Rack A-01)</option>
                <option value="Fresh Hybrid Tomatoes 1kg">Fresh Hybrid Tomatoes 1kg (Crate V-03)</option>
                <option value="Farm Fresh Eggs 6pk">Farm Fresh Eggs 6pk (Egg Rack 01)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="text-xs text-slate-400">{t.systemCount}</div>
                <div className="text-xl font-black text-white mt-1">{systemUnits} units</div>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <div className="text-xs text-emerald-300 font-semibold">{t.physicalCount}</div>
                <input
                  type="number"
                  value={countedUnits}
                  onChange={(e) => setCountedUnits(Number(e.target.value))}
                  className="w-full bg-transparent text-xl font-black text-white mt-1 outline-none"
                  min="0"
                />
              </div>
            </div>

            {countedUnits !== systemUnits && (
              <div className="space-y-1">
                <label className="text-xs text-amber-300 font-semibold block">{t.shrinkageReason}</label>
                <select
                  value={shrinkageReason}
                  onChange={(e) => setShrinkageReason(e.target.value)}
                  className="w-full bg-[#141A24] text-white text-xs p-2 rounded-lg border border-white/10"
                >
                  <option value="Leaked Pouch in Transit Crate">Leaked Pouch in Transit Crate</option>
                  <option value="Crushed Package / Transit Damage">Crushed Package / Transit Damage</option>
                  <option value="Expired / Past Best-Before Date">Expired / Past Best-Before Date</option>
                  <option value="Misplaced in Wrong Aisle Bin">Misplaced in Wrong Aisle Bin</option>
                  <option value="Floor Pilferage / Missing Count">Floor Pilferage / Missing Count</option>
                </select>
              </div>
            )}

            <button
              onClick={handleCommitShrinkage}
              className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs flex items-center justify-center gap-2 mt-2"
            >
              <ShieldAlert size={15} />
              <span>{t.recordShrinkage}</span>
            </button>
          </div>
        </div>
      )}

      {/* Content 3: Cold Chain & Power Telemetry */}
      {activeTab === 'coldchain' && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-cyan-500/30 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase">
              <ThermometerSnowflake size={16} />
              <span>{t.freezerStatus}</span>
            </div>
            <div className="text-2xl font-black text-white">3.8°C <span className="text-xs text-emerald-400 font-normal">Target: 2°C - 5°C</span></div>
            <p className="text-xs text-slate-400">All 4 Chiller evaporators running within food safety standards. No spoilage alert.</p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
              <Zap size={16} />
              <span>{t.powerStatus}</span>
            </div>
            <div className="text-xl font-black text-white">Grid Online <span className="text-xs text-emerald-400 font-normal">230V Stable</span></div>
            <p className="text-xs text-slate-400">{t.backupReady}</p>
          </div>
        </div>
      )}
    </div>
  );
}
