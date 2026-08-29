import { describe, it, expect } from 'vitest';
import {
  FALLBACK_DASHBOARD_METRICS,
  FALLBACK_RESILIENCE_ALERTS,
  FALLBACK_MODEL_REGISTRY,
  FALLBACK_SHAP_FEATURES,
  FALLBACK_RUN_COMPARISON,
  FALLBACK_COVERAGE_GAPS,
  FALLBACK_ORDER_TRENDS,
  FALLBACK_FORECAST_ZONES,
  FALLBACK_FOCUS_CITIES,
  FALLBACK_NEIGHBORHOODS,
  FALLBACK_SIMULATOR_NEIGHBORHOODS
} from './fallbacks';

describe('Fallback Datasets', () => {
  it('should export DASHBOARD METRICS with is_fallback flag', () => {
    expect(FALLBACK_DASHBOARD_METRICS.is_fallback).toBe(true);
    expect(FALLBACK_DASHBOARD_METRICS.summary.total_stores).toBeGreaterThan(0);
    expect(FALLBACK_DASHBOARD_METRICS.city_overview.length).toBeGreaterThan(0);
  });

  it('should export RESILIENCE ALERTS array with valid severity levels', () => {
    expect(Array.isArray(FALLBACK_RESILIENCE_ALERTS)).toBe(true);
    expect(FALLBACK_RESILIENCE_ALERTS.length).toBeGreaterThan(0);
    FALLBACK_RESILIENCE_ALERTS.forEach(alert => {
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(alert.severity);
      expect(alert.is_fallback).toBe(true);
    });
  });

  it('should export MODEL REGISTRY and SHAP FEATURES', () => {
    expect(FALLBACK_MODEL_REGISTRY.length).toBeGreaterThan(0);
    expect(FALLBACK_MODEL_REGISTRY[0].name).toBe('demand_forecasting_model');
    expect(FALLBACK_SHAP_FEATURES.length).toBeGreaterThan(0);
    expect(FALLBACK_RUN_COMPARISON.metrics.length).toBeGreaterThan(0);
  });

  it('should export COVERAGE GAPS and ORDER TRENDS for Recharts', () => {
    expect(FALLBACK_COVERAGE_GAPS.length).toBeGreaterThan(0);
    expect(FALLBACK_ORDER_TRENDS.length).toBeGreaterThan(0);
    FALLBACK_ORDER_TRENDS.forEach(item => {
      expect(item.date).toBeDefined();
      expect(item.orders).toBeGreaterThan(0);
    });
  });

  it('should export FORECAST ZONES, CITIES, NEIGHBORHOODS, and SIMULATOR fallbacks', () => {
    expect(FALLBACK_FORECAST_ZONES.length).toBeGreaterThan(0);
    expect(FALLBACK_FOCUS_CITIES.length).toBeGreaterThan(0);
    expect(FALLBACK_NEIGHBORHOODS.length).toBeGreaterThan(0);
    expect(FALLBACK_SIMULATOR_NEIGHBORHOODS.length).toBeGreaterThan(0);
  });
});
