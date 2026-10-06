import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Leaf, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { toast } from 'sonner';

export default function AddBatchModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [basePrice, setBasePrice] = useState(40.0);
  const [quantity, setQuantity] = useState(50);
  const [shelfLifeHours, setShelfLifeHours] = useState(36);
  const [decayRate, setDecayRate] = useState(0.02);
  const [error, setError] = useState(null);

  const createBatchMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.createBatch(payload);
    },
    onSuccess: (data) => {
      toast.success(`Product Batch "${data.product_name || productName}" added to inventory!`);
      queryClient.invalidateQueries({ queryKey: ['resilience-batches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
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

    createBatchMutation.mutate({
      product_name: productName.trim(),
      category,
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
        className="w-full max-w-md bg-[#121826] border border-border/80 rounded-2xl p-6 shadow-2xl overflow-hidden relative"
      >
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Leaf size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground">Add Perishable Inventory Batch</h3>
              <p className="text-xs text-muted-foreground">Track dynamic Sigmoid markdown decay</p>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Product SKU / Produce Name</label>
            <input
              type="text"
              placeholder="e.g. Organic Roma Tomatoes (1kg)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-amber-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-amber-500"
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
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Base Price (INR ₹)</label>
              <input
                type="number"
                step="0.5"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Quantity (Units/Kg)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Shelf Life (Hours)</label>
              <input
                type="number"
                value={shelfLifeHours}
                onChange={(e) => setShelfLifeHours(e.target.value)}
                className="w-full bg-[#0b0f17] border border-border/80 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 mt-2 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createBatchMutation.isPending}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold text-xs shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center gap-1.5"
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
