import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { AlertCircle, Flame, Sparkles, Sun, TrendingUp } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export default function MoodGauge({ neighborhoodId }) {
  const { data: moodData, isLoading, isError } = useQuery({
    queryKey: ['neighborhood-mood', neighborhoodId],
    queryFn: () => api.getNeighborhoodMood(neighborhoodId),
    enabled: !!neighborhoodId,
  });

  if (isLoading) return <Skeleton className="h-[80px] w-full rounded-xl" />;
  if (isError || !moodData) return null;

  const getLabelColor = (label) => {
    if (label.includes('Hot')) return 'text-[var(--spice-500)]';
    if (label.includes('Active')) return 'text-[var(--saffron-500)]';
    if (label.includes('Neutral')) return 'text-[var(--text-secondary)]';
    return 'text-[var(--peacock-500)]';
  };

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl p-5 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-[var(--text-secondary)] flex items-center gap-1.5">
          <Flame size={15} className="text-[var(--saffron-500)]" />
          Neighborhood Mood
        </h3>
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[rgba(255,255,255,0.05)] border border-[var(--glass-border)] ${getLabelColor(moodData.mood_label)}`}>
          {moodData.mood_label}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-2 border-[var(--glass-border)]">
          <span className="text-xl font-bold">{moodData.mood_score.toFixed(0)}</span>
          <span className="absolute bottom-0 text-[10px] text-[var(--text-muted)]">/100</span>
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Composite Action Signal</p>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">{moodData.recommendation}</p>
        </div>
      </div>

      {/* Mini Progress bars for composition */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-[var(--glass-border)]">
        <div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
            <span>Sentiment</span>
            <span>{moodData.sentiment_score}%</span>
          </div>
          <div className="w-full bg-[rgba(0,0,0,0.2)] h-1 rounded-full overflow-hidden">
            <div className="bg-[var(--peacock-500)] h-full" style={{ width: `${moodData.sentiment_score}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
            <span>Event Boost</span>
            <span>{moodData.event_boost}%</span>
          </div>
          <div className="w-full bg-[rgba(0,0,0,0.2)] h-1 rounded-full overflow-hidden">
            <div className="bg-[var(--saffron-500)] h-full" style={{ width: `${moodData.event_boost}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
            <span>Weather</span>
            <span>{moodData.weather_factor}%</span>
          </div>
          <div className="w-full bg-[rgba(0,0,0,0.2)] h-1 rounded-full overflow-hidden">
            <div className="bg-yellow-500 h-full" style={{ width: `${moodData.weather_factor}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-0.5">
            <span>Trend Momentum</span>
            <span>{moodData.trend_momentum}%</span>
          </div>
          <div className="w-full bg-[rgba(0,0,0,0.2)] h-1 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full" style={{ width: `${moodData.trend_momentum}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
