import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, Edit, MapPin, AlertCircle, Save, X } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { api } from '../services/api';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';

export default function LocalEvents() {
  const { selectedCity } = useCity();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Form State
  const [name, setName] = useState('');
  const [pincode, setPincode] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState('Other');
  const [expectedImpactPct, setExpectedImpactPct] = useState(10);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['local-events', selectedCity],
    queryFn: () => api.getEvents({ city: selectedCity }),
    enabled: !!selectedCity,
  });

  // Create Event Mutation
  const createMutation = useMutation({
    mutationFn: api.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-events'] });
      resetForm();
    },
    onError: (err) => setErrorMsg(err.message || 'Failed to create event'),
  });

  // Update Event Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.updateEvent(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-events'] });
      resetForm();
    },
    onError: (err) => setErrorMsg(err.message || 'Failed to update event'),
  });

  // Delete Event Mutation
  const deleteMutation = useMutation({
    mutationFn: api.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['local-events'] });
    },
  });

  const resetForm = () => {
    setName('');
    setPincode('');
    setEventDate('');
    setEventTime('');
    setEventType('Other');
    setExpectedImpactPct(10);
    setEditingEvent(null);
    setIsFormOpen(false);
    setErrorMsg('');
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setName(event.name);
    setPincode(event.pincode || '');
    setEventDate(event.event_date);
    setEventTime(event.event_time || '');
    setEventType(event.event_type);
    setExpectedImpactPct(event.expected_impact_pct);
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !eventDate) {
      setErrorMsg('Name and Date are required');
      return;
    }

    const payload = {
      name,
      city: selectedCity,
      pincode: pincode || null,
      event_date: eventDate,
      event_time: eventTime || null,
      event_type: eventType,
      expected_impact_pct: parseFloat(expectedImpactPct),
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(id);
    }
  };

  const getImpactColor = (pct) => {
    if (pct >= 25) return 'var(--spice-500)';
    if (pct >= 15) return 'var(--saffron-500)';
    return 'var(--peacock-500)';
  };

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', margin: 0 }}>
            Local Demand Calendar
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            Plan resources, restock levels, and driver payouts around local concerts, matches, and college exams.
            <span style={{ marginLeft: '8px', fontSize: '0.74rem', background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-secondary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
              [Owner-Managed Input]
            </span>
          </p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsFormOpen(true); }}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
        >
          <Plus size={16} /> Add Event
        </button>
      </div>

      {/* Form / Modal Container */}
      {isFormOpen && (
        <div className="glass-card" style={{ padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.15rem' }}>
              {editingEvent ? 'Edit Event Details' : 'Register New Local Event'}
            </h3>
            <button onClick={resetForm} className="icon-button" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
              <X size={18} color="var(--color-text-muted)" />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Event Name *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Coldplay Concert, IPL Match"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px', color: 'var(--color-text-primary)' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Pincode (Optional)</label>
              <input 
                type="text" 
                value={pincode} 
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 560034"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px', color: 'var(--color-text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Event Date *</label>
              <input 
                type="date" 
                value={eventDate} 
                onChange={(e) => setEventDate(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px', color: 'var(--color-text-primary)' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Event Time (Optional)</label>
              <input 
                type="time" 
                value={eventTime} 
                onChange={(e) => setEventTime(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px', color: 'var(--color-text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Event Type</label>
              <select 
                value={eventType} 
                onChange={(e) => setEventType(e.target.value)}
                style={{ background: '#0B0D14', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px', color: 'var(--color-text-primary)' }}
              >
                <option value="Concert">Concert / Performance</option>
                <option value="Match">Sports Match</option>
                <option value="Exam">Exam Period</option>
                <option value="Festival">Festival / Holiday</option>
                <option value="Other">Other Event</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Expected Order Impact (%)</label>
              <input 
                type="number" 
                value={expectedImpactPct} 
                onChange={(e) => setExpectedImpactPct(e.target.value)}
                min="0"
                max="200"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '10px', color: 'var(--color-text-primary)' }}
              />
            </div>

            {errorMsg && (
              <div style={{ gridColumn: '1 / -1', color: 'var(--spice-500)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} /> {errorMsg}
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="button" onClick={resetForm} className="btn btn-outline" style={{ padding: '8px 16px' }}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
                <Save size={14} /> Save Event
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events Table / List */}
      <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px' }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[48px] w-full rounded-md" />)}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No events registered yet"
            description="Add neighborhood level local events to adjust dynamic safety stocks."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '16px', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Event Details</th>
                  <th style={{ padding: '16px', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '16px', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>City / Pincode</th>
                  <th style={{ padding: '16px', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Impact Rating</th>
                  <th style={{ padding: '16px', fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.2s' }} className="table-row-hover">
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{event.name}</span>
                        <span style={{ fontSize: '0.68rem', alignSelf: 'flex-start', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--color-border)' }}>
                          {event.event_type}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: 'var(--color-text-primary)', fontSize: '0.88rem' }}>
                      {event.event_date} {event.event_time && `at ${event.event_time.slice(0, 5)}`}
                    </td>
                    <td style={{ padding: '16px', fontSize: '0.88rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-primary)' }}>
                        <MapPin size={14} color="var(--peacock-500)" />
                        <span>{event.city}</span>
                        {event.pincode && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>({event.pincode})</span>}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span 
                        style={{
                          fontWeight: 700,
                          color: getImpactColor(event.expected_impact_pct),
                          fontSize: '0.88rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${getImpactColor(event.expected_impact_pct)}`
                        }}
                      >
                        +{event.expected_impact_pct}% Demand
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(event)} className="icon-button" style={{ color: 'var(--peacock-500)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Edit Event">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="icon-button" style={{ color: 'var(--spice-500)', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Delete Event">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
