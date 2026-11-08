import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, MapPin, X, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

const CITY_COORDS = {
  Bangalore: { lat: 12.9716, lng: 77.5946, pincode: '560001' },
  Mumbai: { lat: 19.0760, lng: 72.8777, pincode: '400001' },
  Delhi: { lat: 28.6139, lng: 77.2090, pincode: '110001' },
  Hyderabad: { lat: 17.3850, lng: 78.4867, pincode: '500001' },
  Pune: { lat: 18.5204, lng: 73.8567, pincode: '411001' },
};

export default function AddStoreModal({ isOpen, onClose, initialData = null }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createdStore, setCreatedStore] = useState(null);

  const [storeName, setStoreName] = useState('');
  const [platform, setPlatform] = useState('Darkstori');
  const [city, setCity] = useState('Bangalore');
  const [pincode, setPincode] = useState('560001');
  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [storageSqft, setStorageSqft] = useState(1500);
  const [dailyCapacity, setDailyCapacity] = useState(600);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) setCreatedStore(null);
    if (isOpen && initialData) {
      if (initialData.store_name || initialData.storeName) {
        setStoreName(initialData.store_name || initialData.storeName);
      }
      if (initialData.city) setCity(initialData.city);
      if (initialData.pincode) setPincode(initialData.pincode);
      if (initialData.lat != null) setLatitude(Number(initialData.lat));
      if (initialData.lng != null) setLongitude(Number(initialData.lng));
      if (initialData.storageSqft) setStorageSqft(Number(initialData.storageSqft));
      if (initialData.dailyCapacity) setDailyCapacity(Number(initialData.dailyCapacity));
      setError(null);
    } else if (isOpen && !initialData) {
      setStoreName('');
      setError(null);
    }
  }, [isOpen, initialData]);

  const handleCityChange = (newCity) => {
    setCity(newCity);
    if (CITY_COORDS[newCity]) {
      setLatitude(CITY_COORDS[newCity].lat);
      setLongitude(CITY_COORDS[newCity].lng);
      setPincode(CITY_COORDS[newCity].pincode);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.createStore(payload);
    },
    onSuccess: (data) => {
      toast.success(`Dark Store "${data.store_name || storeName}" established in Neon DB!`);
      queryClient.invalidateQueries({ queryKey: ['stores-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['expansion-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setCreatedStore(data);
    },
    onError: (err) => {
      setError(err?.response?.data?.detail || err?.message || 'Failed to create dark store.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!storeName.trim()) {
      setError('Store name is required.');
      return;
    }

    createMutation.mutate({
      store_name: storeName.trim(),
      platform,
      city,
      pincode,
      latitude: Number(latitude),
      longitude: Number(longitude),
      city_tier: 'Tier-1',
      storage_capacity_sqft: Number(storageSqft),
      daily_order_capacity: Number(dailyCapacity),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg bg-[#0E121A] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden relative backdrop-blur-2xl"
      >
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF9F1C]/15 border border-[#FF9F1C]/30 flex items-center justify-center text-[#38BDF8]">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white font-display">Add New Dark Store Hub</h3>
              <p className="text-xs text-[#86868B]">Register a new physical fulfillment center</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {createdStore ? (
          <div className="py-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-display">Dark Store Established!</h3>
              <p className="text-xs text-white/60 mt-1 max-w-sm mx-auto">
                {createdStore.store_name || storeName} ({createdStore.city}) is now active in Neon DB with live 2.0 km 10-minute delivery halos.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-left text-xs font-mono space-y-2">
              <div className="flex justify-between"><span className="text-white/40">HUB ID</span><span className="text-amber-400">DS-HUB-#{createdStore.id}</span></div>
              <div className="flex justify-between"><span className="text-white/40">PINCODE</span><span className="text-white">{createdStore.pincode || pincode}</span></div>
              <div className="flex justify-between"><span className="text-white/40">DAILY CAPACITY</span><span className="text-emerald-400">{dailyCapacity} Orders/Day</span></div>
              <div className="flex justify-between"><span className="text-white/40">CAPEX BENCHMARK</span><span className="text-white">₹21.5L (Payback 4.2 mo)</span></div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate(`/floor?store_id=${createdStore.id}&store_name=${encodeURIComponent(createdStore.store_name || storeName)}&city=${encodeURIComponent(createdStore.city || city)}`);
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>🏭 Open Floor Operations & WMS (Pick/Pack) →</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/network');
                }}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>🚚 Inspect Store Fleet & War Room →</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-white/40 hover:text-white pt-1 transition-colors"
              >
                Close and stay in Expansion Cockpit
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Hub / Store Name</label>
            <input
              type="text"
              placeholder="e.g. Indiranagar Primary Hub #04"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Operating Brand</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-emerald-500"
              >
                <option value="Darkstori">Darkstori Direct</option>
                <option value="Swiggy Instamart">Swiggy Instamart</option>
                <option value="Blinkit">Blinkit</option>
                <option value="Zepto">Zepto</option>
                <option value="Flipkart Minutes">Flipkart Minutes</option>
                <option value="Independent">Independent Franchise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Metro City</label>
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-emerald-500"
              >
                <option value="Bangalore">Bangalore</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi-NCR</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Pune">Pune</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF9F1C] focus:ring-1 focus:ring-[#FF9F1C]/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF9F1C] focus:ring-1 focus:ring-[#FF9F1C]/50 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Floor Size (Sq. Ft.)</label>
              <input
                type="number"
                value={storageSqft}
                onChange={(e) => setStorageSqft(e.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#FF9F1C] focus:ring-1 focus:ring-[#FF9F1C]/50 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Daily Order Capacity</label>
              <input
                type="number"
                value={dailyCapacity}
                onChange={(e) => setDailyCapacity(e.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-[#FF9F1C] focus:ring-1 focus:ring-[#FF9F1C]/50 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#86868B] hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#FF9F1C] text-white font-semibold text-xs shadow-lg shadow-[#FF9F1C]/25 hover:bg-[#0A84FF] transition-all flex items-center gap-1.5"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Register Dark Store</span>
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </motion.div>
    </div>
  );
}
