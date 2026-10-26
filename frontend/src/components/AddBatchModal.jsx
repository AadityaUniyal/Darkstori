import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Leaf, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useCity } from '../context/CityContext';

export default function AddBatchModal({ isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const { selectedCity } = useCity();

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [basePrice, setBasePrice] = useState(40.0);
  const [quantity, setQuantity] = useState(50);
  const [shelfLifeHours, setShelfLifeHours] = useState(36);
  const decayRate = 0.02;
  const [storeId, setStoreId] = useState('');
  const [error, setError] = useState(null);
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ['stores-list', selectedCity, 'physical-stores-only'],
    queryFn: () => api.getStores({ city: selectedCity, include_competitors: false }),
    enabled: isOpen && Boolean(selectedCity),
  });

  useEffect(() => {
    if (!stores.some((store) => String(store.id) === storeId)) {
      setStoreId(stores[0] ? String(stores[0].id) : '');
    }
  }, [stores, storeId]);

  const createBatchMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.createBatch(payload);
    },
    onSuccess: (data) => {
      toast.success(`Product Batch "${data.product_name || productName}" added to inventory!`);
      queryClient.invalidateQueries({ queryKey: ['resilience-batches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      onSuccess?.(data);
      onClose();
    },
    onError: (err) => {
      setError(err?.response?.data?.detail || err?.message || 'Failed to add batch.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!productName.trim()) {
      setError('Product SKU name is required.');
      return;
    }
    if (!storeId) {
      setError('Choose a store before adding this batch.');
      return;
    }

    createBatchMutation.mutate({
      product_name: productName.trim(),
      category,
      store_id: Number(storeId),
      base_price: Number(basePrice),
      quantity: Number(quantity),
      shelf_life_hours: Number(shelfLifeHours),
      decay_rate_per_hour: Number(decayRate),
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
        className="w-full max-w-md bg-[#0E121A] border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden relative backdrop-blur-2xl"
      >
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF9F1C]/15 border border-[#FF9F1C]/30 flex items-center justify-center text-[#38BDF8]">
              <Leaf size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white font-display">Add Perishable Inventory Batch</h3>
              <p className="text-xs text-[#86868B]">Track dynamic Sigmoid markdown decay</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#86868B] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Dark store · {selectedCity}</label>
            {storesLoading ? (
              <div className="rounded-xl border border-white/10 bg-[#141A24] px-3.5 py-2.5 text-xs text-[#86868B]">Loading stores…</div>
            ) : stores.length === 0 ? (
              <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5 text-xs leading-relaxed text-amber-200/80">There are no connected stores in {selectedCity}. Add a store before recording inventory.</p>
            ) : (
              <select
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#FF9F1C] text-xs"
                required
              >
                {stores.map((store) => <option key={store.id} value={store.id}>{store.store_name || `Store ${store.id}`}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Product SKU / Produce Name</label>
            <input
              type="text"
              placeholder="e.g. Organic Roma Tomatoes (1kg)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#FF9F1C] focus:ring-1 focus:ring-[#FF9F1C]/50 transition-colors text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#FF9F1C] text-xs"
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Dairy">Dairy & Eggs</option>
                <option value="Bakery">Bakery & Bread</option>
                <option value="Meat">Meat & Seafood</option>
                <option value="Prepared">Ready Meals</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Base Price (INR ₹)</label>
              <input
                type="number"
                step="0.5"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#FF9F1C] text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Quantity (Units/Kg)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#FF9F1C] text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#86868B] mb-1.5">Shelf Life (Hours)</label>
              <input
                type="number"
                value={shelfLifeHours}
                onChange={(e) => setShelfLifeHours(e.target.value)}
                className="w-full bg-[#141A24] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#FF9F1C] text-xs"
                required
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
              disabled={createBatchMutation.isPending || storesLoading || stores.length === 0}
              className="px-5 py-2 rounded-xl bg-[#FF9F1C] text-white font-semibold text-xs shadow-lg shadow-[#FF9F1C]/25 hover:bg-[#0A84FF] transition-all flex items-center gap-1.5"
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Adding Batch...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>Add Produce Batch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
