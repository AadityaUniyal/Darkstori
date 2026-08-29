import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, Play, Pause, Trash2, TestTube, ChevronDown,
  ChevronRight, Activity, Clock, CheckCircle2, XCircle,
  AlertTriangle, SkipForward, Settings2, Workflow
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import AmbientBackground from '../components/AmbientBackground';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import './Playbooks.css';

const TRIGGER_ICONS = {
  competitor_store_opened: '🛡️',
  sla_breach: '⏱️',
  temp_breach: '🧊',
  demand_spike: '📈',
  drift_detected: '🎯',
  price_war: '⚔️',
  order_placed: '📦',
  stock_change: '📊',
};

const STATUS_COLORS = {
  success: 'var(--peacock-500)',
  failed: 'var(--spice-500)',
  skipped: 'var(--monsoon-500)',
};

export default function Playbooks() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedExec, setExpandedExec] = useState(null);

  // Form state for creating a new playbook
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger_type: 'competitor_store_opened',
    conditions: [],
    action_type: 'send_alert',
    action_config: {},
    cooldown_minutes: 60,
  });
  const [condField, setCondField] = useState('');
  const [condOp, setCondOp] = useState('eq');
  const [condValue, setCondValue] = useState('');

  // Queries
  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ['playbooks'],
    queryFn: () => api.getPlaybooks(),
  });

  const { data: stats } = useQuery({
    queryKey: ['playbook-stats'],
    queryFn: api.getPlaybookStats,
  });

  const { data: executions = [], isLoading: execsLoading } = useQuery({
    queryKey: ['playbook-executions'],
    queryFn: () => api.getPlaybookExecutions({ limit: 20 }),
  });

  const { data: triggers = [] } = useQuery({
    queryKey: ['playbook-triggers'],
    queryFn: api.getPlaybookTriggers,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ['playbook-actions'],
    queryFn: api.getPlaybookActions,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => api.createPlaybook(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      queryClient.invalidateQueries({ queryKey: ['playbook-stats'] });
      toast.success('Playbook created successfully');
      setShowCreate(false);
      setForm({ name: '', description: '', trigger_type: 'competitor_store_opened', conditions: [], action_type: 'send_alert', action_config: {}, cooldown_minutes: 60 });
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create playbook'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => api.togglePlaybook(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      toast.success(`Playbook ${data.is_active ? 'activated' : 'paused'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deletePlaybook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playbooks'] });
      queryClient.invalidateQueries({ queryKey: ['playbook-stats'] });
      toast.success('Playbook deleted');
    },
  });

  const addCondition = () => {
    if (!condField || !condValue) return;
    setForm(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: condField, op: condOp, value: condValue }],
    }));
    setCondField('');
    setCondValue('');
  };

  const removeCondition = (idx) => {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== idx),
    }));
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    createMutation.mutate(form);
  };

  return (
    <div className="playbooks-page">
      <AmbientBackground />

      {/* Header */}
      <div className="playbooks-header">
        <div className="playbooks-header-left">
          <Workflow size={28} className="playbooks-header-icon" />
          <div>
            <h1>Automation Playbooks</h1>
            <p className="playbooks-subtitle">
              If This → Then That for Dark Store Operations
            </p>
          </div>
        </div>
        <motion.button
          className="btn-primary playbook-create-btn"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus size={18} />
          New Playbook
        </motion.button>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="playbook-stats-bar">
          <div className="playbook-stat">
            <Workflow size={16} />
            <span className="playbook-stat-value">{stats.total_playbooks}</span>
            <span className="playbook-stat-label">Total</span>
          </div>
          <div className="playbook-stat">
            <Activity size={16} style={{ color: 'var(--peacock-500)' }} />
            <span className="playbook-stat-value">{stats.active_playbooks}</span>
            <span className="playbook-stat-label">Active</span>
          </div>
          <div className="playbook-stat">
            <Zap size={16} style={{ color: 'var(--marigold-500)' }} />
            <span className="playbook-stat-value">{stats.total_executions}</span>
            <span className="playbook-stat-label">Executions</span>
          </div>
          <div className="playbook-stat">
            <CheckCircle2 size={16} style={{ color: 'var(--peacock-500)' }} />
            <span className="playbook-stat-value">{stats.success_rate}%</span>
            <span className="playbook-stat-label">Success Rate</span>
          </div>
        </div>
      )}

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="playbook-create-form-card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h3><Settings2 size={18} /> Create New Playbook</h3>
            <form onSubmit={handleCreate} className="playbook-create-form">
              <div className="playbook-form-row">
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Competitor Store Alert"
                />
              </div>
              <div className="playbook-form-row">
                <label>Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What does this playbook do?"
                />
              </div>
              <div className="playbook-form-row-split">
                <div>
                  <label>Trigger</label>
                  <select
                    value={form.trigger_type}
                    onChange={(e) => setForm(p => ({ ...p, trigger_type: e.target.value }))}
                  >
                    {triggers.map(t => (
                      <option key={t.key} value={t.key}>
                        {TRIGGER_ICONS[t.key] || '📋'} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Action</label>
                  <select
                    value={form.action_type}
                    onChange={(e) => setForm(p => ({ ...p, action_type: e.target.value }))}
                  >
                    {actions.map(a => (
                      <option key={a.key} value={a.key}>{a.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Cooldown (min)</label>
                  <input
                    type="number"
                    value={form.cooldown_minutes}
                    onChange={(e) => setForm(p => ({ ...p, cooldown_minutes: parseInt(e.target.value) || 60 }))}
                    min={1}
                    max={1440}
                  />
                </div>
              </div>

              {/* Conditions Builder */}
              <div className="playbook-conditions-section">
                <label>Conditions (optional — all must match)</label>
                <div className="playbook-condition-builder">
                  <input
                    type="text"
                    placeholder="field (e.g. city)"
                    value={condField}
                    onChange={(e) => setCondField(e.target.value)}
                  />
                  <select value={condOp} onChange={(e) => setCondOp(e.target.value)}>
                    <option value="eq">equals</option>
                    <option value="neq">not equals</option>
                    <option value="gt">greater than</option>
                    <option value="lt">less than</option>
                    <option value="contains">contains</option>
                  </select>
                  <input
                    type="text"
                    placeholder="value"
                    value={condValue}
                    onChange={(e) => setCondValue(e.target.value)}
                  />
                  <button type="button" className="btn-outline-sm" onClick={addCondition}>
                    <Plus size={14} /> Add
                  </button>
                </div>
                {form.conditions.length > 0 && (
                  <div className="playbook-conditions-list">
                    {form.conditions.map((c, i) => (
                      <span key={i} className="playbook-condition-chip">
                        {c.field} {c.op} {String(c.value)}
                        <button type="button" onClick={() => removeCondition(i)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Playbook'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playbooks Grid */}
      <div className="playbooks-grid">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[160px] w-full rounded-xl" />
            ))}
          </>
        ) : playbooks.length === 0 ? (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState
              title="No playbooks configured"
              description="Create an automation playbook to run automated trigger actions."
            />
          </div>
        ) : (
          playbooks.map((pb, idx) => (
            <motion.div
              key={pb.id || idx}
              className={`playbook-card ${pb.is_active ? '' : 'playbook-paused'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <div className="playbook-card-header">
                <span className="playbook-trigger-icon">
                  {TRIGGER_ICONS[pb.trigger_type] || '📋'}
                </span>
                <div className="playbook-card-title">
                  <h3>{pb.name}</h3>
                  <span className={`playbook-status-badge ${pb.is_active ? 'active' : 'paused'}`}>
                    {pb.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
              {pb.description && (
                <p className="playbook-description">{pb.description}</p>
              )}
              <div className="playbook-card-meta">
                <span className="playbook-meta-item">
                  <Zap size={13} /> {pb.trigger_type.replace(/_/g, ' ')}
                </span>
                <span className="playbook-meta-item">
                  <ChevronRight size={13} /> {pb.action_type.replace(/_/g, ' ')}
                </span>
                <span className="playbook-meta-item">
                  <Clock size={13} /> {pb.cooldown_minutes}m cooldown
                </span>
              </div>
              {pb.conditions && pb.conditions.length > 0 && (
                <div className="playbook-conditions-preview">
                  {pb.conditions.map((c, i) => (
                    <span key={i} className="playbook-condition-chip-sm">
                      {c.field} {c.op} {String(c.value)}
                    </span>
                  ))}
                </div>
              )}
              <div className="playbook-card-actions">
                <button
                  className={`playbook-action-btn ${pb.is_active ? 'pause' : 'play'}`}
                  onClick={() => pb.id && toggleMutation.mutate(pb.id)}
                  title={pb.is_active ? 'Pause' : 'Activate'}
                >
                  {pb.is_active ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button
                  className="playbook-action-btn delete"
                  onClick={() => pb.id && deleteMutation.mutate(pb.id)}
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Execution History */}
      <div className="playbook-executions-section">
        <h2><Activity size={20} /> Recent Executions</h2>
        <div className="playbook-executions-list">
          {execsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[48px] w-full rounded-lg" />
              ))}
            </div>
          ) : executions.length === 0 ? (
            <EmptyState
              title="No executions recorded"
              description="No playbook execution logs found."
            />
          ) : (
            executions.map((exec, idx) => (
              <motion.div
                key={exec.id || idx}
                className="playbook-exec-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => setExpandedExec(expandedExec === idx ? null : idx)}
              >
                <div className="exec-row-main">
                  <span className="exec-status-dot" style={{ background: STATUS_COLORS[exec.status] || STATUS_COLORS.skipped }} />
                  <span className="exec-playbook-name">{exec.playbook_name}</span>
                  <span className="exec-status-badge" data-status={exec.status}>
                    {exec.status === 'success' && <CheckCircle2 size={13} />}
                    {exec.status === 'failed' && <XCircle size={13} />}
                    {exec.status === 'skipped' && <SkipForward size={13} />}
                    {exec.status}
                  </span>
                  <span className="exec-time">{exec.executed_at?.slice(0, 16).replace('T', ' ')}</span>
                  {expandedExec === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </div>
                <AnimatePresence>
                  {expandedExec === idx && (
                    <motion.div
                      className="exec-detail"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="exec-detail-grid">
                        <div>
                          <strong>Trigger Event</strong>
                          <pre>{JSON.stringify(exec.trigger_event, null, 2)}</pre>
                        </div>
                        <div>
                          <strong>Action Result</strong>
                          <pre>{JSON.stringify(exec.action_result, null, 2)}</pre>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
