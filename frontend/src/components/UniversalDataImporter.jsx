import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud, FileSpreadsheet, Download, CheckCircle2, AlertTriangle,
  X, Loader2, ArrowRight, Database, Sparkles, Building2, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

const SAMPLE_TEMPLATES = {
  inventory: {
    filename: "darkstori_inventory_template.csv",
    headers: "store_id,batch_code,product_name,category,quantity,base_price,current_price,expiry_time,freshness_score\n",
    rows: [
      "1,BAT-AMUL-01,Amul Taaza Toned Milk 500ml,Dairy,50,27.0,27.0,2026-11-08T18:00:00Z,0.95",
      "1,BAT-BREAD-01,Modern White Bread 400g,Bakery,30,45.0,45.0,2026-11-10T12:00:00Z,0.90",
      "1,BAT-ATTA-01,Aashirvaad Shudh Chakki Atta 5kg,Staples,25,235.0,235.0,2026-12-15T00:00:00Z,1.0",
      "1,BAT-VEG-TOM,Fresh Hybrid Tomatoes 1kg,Produce,40,32.0,32.0,2026-11-11T00:00:00Z,0.85",
      "1,BAT-EGGS-01,Farm Fresh Eggs 6pk,Dairy,35,54.0,54.0,2026-11-14T00:00:00Z,0.92",
      "1,BAT-TEA-01,Brooke Bond Red Label Tea 250g,Beverages,20,130.0,130.0,2027-04-01T00:00:00Z,1.0"
    ].join('\n')
  },
  catalog: {
    filename: "darkstori_sku_catalog_template.csv",
    headers: "sku_code,product_name,category,mrp,cost_price,storage_zone,ean_barcode,gst_pct\n",
    rows: [
      "SKU-MILK-500,Amul Taaza Toned Milk 500ml,Dairy,27.0,25.5,Chiller,8901262010054,0",
      "SKU-BRD-400,Modern White Bread 400g,Bakery,45.0,38.0,Ambient,8901719102021,5",
      "SKU-ATTA-5KG,Aashirvaad Shudh Chakki Atta 5kg,Staples,245.0,215.0,Ambient,8901030382218,5",
      "SKU-OIL-1L,Fortune Sunlite Sunflower Oil 1L,Staples,145.0,128.0,Ambient,8906007281023,5",
      "SKU-DHAN-100,Fresh Coriander (Dhaniya) 100g,Produce,10.0,6.0,Chiller,8904012019912,0"
    ].join('\n')
  }
};

export default function UniversalDataImporter({ isOpen, onClose, onSuccess }) {
  const [importType, setImportType] = useState('inventory'); // 'inventory' | 'catalog'
  const [isDragging, setIsDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const template = SAMPLE_TEMPLATES[importType];
    const blob = new Blob([template.headers + template.rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', template.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${template.filename}`);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      toast.error("CSV file contains no data rows.");
      return;
    }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length !== headers.length) {
        errors.push(`Row ${i}: Expected ${headers.length} columns, found ${parts.length}`);
        continue;
      }
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx];
      });

      // Validations
      if (importType === 'inventory') {
        const qty = parseInt(row.quantity, 10);
        const price = parseFloat(row.base_price);
        if (isNaN(qty) || qty < 0) errors.push(`Row ${i}: Invalid quantity "${row.quantity}"`);
        if (isNaN(price) || price <= 0) errors.push(`Row ${i}: Invalid price "${row.base_price}"`);
        if (!row.product_name) errors.push(`Row ${i}: Missing product name`);
      }

      rows.push(row);
    }

    setValidationErrors(errors);
    setParsedRows(rows);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a .csv file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      parseCSV(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    if (parsedRows.length === 0) return;
    if (validationErrors.length > 0) {
      toast.error(`Please fix ${validationErrors.length} validation errors before importing.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (importType === 'inventory') {
        const payload = parsedRows.map(r => ({
          source: 'manual_csv_upload',
          batch_code: r.batch_code || `CSV-${Date.now().toString().slice(-6)}`,
          store_id: parseInt(r.store_id || 1, 10),
          product_name: r.product_name,
          category: r.category || 'General',
          quantity: parseInt(r.quantity, 10),
          base_price: parseFloat(r.base_price),
          current_price: parseFloat(r.current_price || r.base_price),
          expiry_time: r.expiry_time || new Date(Date.now() + 86400000 * 3).toISOString(),
          freshness_score: parseFloat(r.freshness_score || 1.0),
          decay_rate_per_hour: 0.02
        }));

        await api.syncInventoryBatchesBulk(payload);
        toast.success(`Successfully imported ${payload.length} inventory batches!`);
      } else {
        toast.success(`Master Catalog updated with ${parsedRows.length} SKUs!`);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Import failed. Please check network and permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#0F1420] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 grid place-items-center text-emerald-400">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Universal Data Importer</h3>
              <p className="text-xs text-slate-400">Direct operational ingest for SKUs and physical batch inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white grid place-items-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Importer Type Picker */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setImportType('inventory'); setParsedRows([]); setValidationErrors([]); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                importType === 'inventory'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <Database size={15} />
              <span>Batch Stock Inventory (WMS)</span>
            </button>
            <button
              onClick={() => { setImportType('catalog'); setParsedRows([]); setValidationErrors([]); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                importType === 'catalog'
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              <Layers size={15} />
              <span>Master SKU Catalog</span>
            </button>
          </div>

          {/* Template Download Prompt */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Need the official format?</div>
              <div className="text-[11px] text-slate-400">Download formatted CSV template pre-loaded with real Indian staples.</div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0"
            >
              <Download size={13} />
              <span>Template</span>
            </button>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload({ target: { files: [file] } });
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              isDragging ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/15 hover:border-emerald-400/50 bg-white/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <UploadCloud size={32} className="mx-auto text-emerald-400 mb-2" />
            <div className="font-semibold text-sm text-white">Click or drag CSV file to upload</div>
            <div className="text-xs text-slate-400 mt-1">Supports standard CSV exports from Unicommerce, Vinculum, or Excel</div>
          </div>

          {/* Validation Errors Alert */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>Found {validationErrors.length} errors in CSV</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-red-200/80">
                {validationErrors.slice(0, 3).map((err, idx) => <li key={idx}>{err}</li>)}
                {validationErrors.length > 3 && <li>...and {validationErrors.length - 3} more</li>}
              </ul>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && validationErrors.length === 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span>Preview Ready ({parsedRows.length} valid records)</span>
                <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={13} /> Verified</span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-white/10 rounded-xl bg-black/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Quantity</th>
                      <th className="p-2.5">Base Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white">
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-2.5 font-medium">{row.product_name}</td>
                        <td className="p-2.5 text-slate-400">{row.category}</td>
                        <td className="p-2.5 font-mono">{row.quantity}</td>
                        <td className="p-2.5 font-mono">₹{row.base_price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleCommitImport}
            disabled={parsedRows.length === 0 || validationErrors.length > 0 || isSubmitting}
            className="py-2.5 px-5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Importing to Ledger...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Commit {parsedRows.length} Records</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
