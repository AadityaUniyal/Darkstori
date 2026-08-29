"""Neighborhood Mood Score API Routes.

Composites sentiment analysis, local events, weather conditions, and
order trend momentum into a single actionable "should I push promotions
here right now?" signal per neighborhood.

Score = (sentiment × 0.3) + (event_boost × 0.3) + (weather × 0.2) + (trend × 0.2)
"""

from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.logger import logger
from backend.core.security import verify_token
from backend.database.connection import get_db
from backend.database.models.models import (
    LocalEvent,
    Neighborhood,
    OrderSynthetic,
    UserReview,
    DarkStore,
)

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────────


class MoodScoreResponse(BaseModel):
    neighborhood_id: int
    neighborhood_name: str
    city: str
    mood_score: float  # 0-100
    mood_label: str  # 🔥 Hot / ⚡ Active / 😐 Neutral / ❄️ Cold
    sentiment_score: float
    event_boost: float
    weather_factor: float
    trend_momentum: float
    active_events: list
    recommendation: str


class CityMoodResponse(BaseModel):
    city: str
    avg_mood: float
    hottest_neighborhood: str
    hottest_score: float
    coldest_neighborhood: str
    coldest_score: float
    neighborhoods: List[MoodScoreResponse]


# ── Helpers ─────────────────────────────────────────────────────────────────


def _mood_label(score: float) -> str:
    if score >= 80:
        return "🔥 Hot"
    elif score >= 60:
        return "⚡ Active"
    elif score >= 40:
        return "😐 Neutral"
    else:
        return "❄️ Cold"


def _mood_recommendation(score: float, events: list, trend: float) -> str:
    if score >= 85:
        event_str = f" ({events[0]['name']})" if events else ""
        return (
            f"🚀 PUSH PROMOTIONS NOW — Mood is at {score:.0f}/100{event_str}. "
            f"High demand window. Activate flash deals on high-margin SKUs."
        )
    elif score >= 70:
        return (
            f"📈 FAVORABLE CONDITIONS — Mood {score:.0f}/100. Good window for "
            f"standard promotions. Focus on snacks and beverages."
        )
    elif score >= 50:
        return (
            f"📊 HOLD STEADY — Mood {score:.0f}/100. Baseline demand expected. "
            f"No special action needed."
        )
    elif score >= 30:
        if trend < -10:
            return (
                f"📉 DECLINING TREND — Mood {score:.0f}/100. Order momentum is "
                f"falling. Consider targeted re-engagement offers."
            )
        return f"😐 QUIET PERIOD — Mood {score:.0f}/100. Normal operations."
    else:
        return (
            f"❄️ LOW ACTIVITY — Mood {score:.0f}/100. Demand is suppressed. "
            f"Avoid expensive promotions. Focus on retention."
        )


# ── Main Endpoint ──────────────────────────────────────────────────────────


@router.get("/neighborhood/{neighborhood_id}", response_model=MoodScoreResponse)
async def get_neighborhood_mood(
    neighborhood_id: int,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Calculate the composite mood score for a specific neighborhood."""

    # Fetch neighborhood info
    nb_result = await db.execute(
        select(Neighborhood).where(Neighborhood.neighborhood_id == neighborhood_id)
    )
    nb = nb_result.scalar_one_or_none()

    if not nb:
        # Fallback for demo
        return _fallback_mood(neighborhood_id)

    city = nb.city.city_name if nb.city else "Bangalore"
    name = nb.neighborhood_name or f"Neighborhood #{neighborhood_id}"

    # 1. Sentiment Score (from user reviews, last 30 days)
    sentiment_q = select(func.avg(UserReview.sentiment_score)).where(
        UserReview.created_at >= datetime.now() - timedelta(days=30)
    )
    sentiment_raw = (await db.execute(sentiment_q)).scalar() or 0.5
    # Normalize sentiment from [-1, 1] range to [0, 100]
    sentiment_score = round((float(sentiment_raw) + 1) / 2 * 100, 1)

    # 2. Event Boost (local events in the next 48 hours)
    today = date.today()
    events_q = select(LocalEvent).where(
        LocalEvent.city == city,
        LocalEvent.event_date.between(today, today + timedelta(days=2)),
    )
    events_result = await db.execute(events_q)
    events = events_result.scalars().all()

    event_boost = 50.0  # baseline
    active_events = []
    for ev in events:
        boost = min(ev.expected_impact_pct or 10, 50)
        event_boost += boost
        active_events.append({
            "name": ev.name,
            "type": ev.event_type,
            "date": str(ev.event_date),
            "impact_pct": ev.expected_impact_pct,
        })
    event_boost = min(event_boost, 100)

    # 3. Weather Factor (simplified — use store weather if available)
    # In production, this would pull from the weather API
    # For now, default to "clear weather = good"
    weather_factor = 75.0  # Good weather baseline

    # 4. Trend Momentum (order growth rate, last 7 days vs previous 7 days)
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    this_week_q = select(func.count(OrderSynthetic.order_id)).where(
        OrderSynthetic.order_time >= week_ago
    )
    last_week_q = select(func.count(OrderSynthetic.order_id)).where(
        OrderSynthetic.order_time.between(two_weeks_ago, week_ago)
    )

    this_week = (await db.execute(this_week_q)).scalar() or 0
    last_week = (await db.execute(last_week_q)).scalar() or 0

    if last_week > 0:
        growth_rate = (this_week - last_week) / last_week * 100
    else:
        growth_rate = 10.0  # Assume slight growth

    # Normalize trend to 0-100 (clamp growth between -50% and +50%)
    trend_momentum = round(max(0, min(100, 50 + growth_rate)), 1)

    # Composite Score
    mood_score = round(
        sentiment_score * 0.3
        + event_boost * 0.3
        + weather_factor * 0.2
        + trend_momentum * 0.2,
        1,
    )

    return MoodScoreResponse(
        neighborhood_id=neighborhood_id,
        neighborhood_name=name,
        city=city,
        mood_score=mood_score,
        mood_label=_mood_label(mood_score),
        sentiment_score=sentiment_score,
        event_boost=event_boost,
        weather_factor=weather_factor,
        trend_momentum=trend_momentum,
        active_events=active_events,
        recommendation=_mood_recommendation(mood_score, active_events, growth_rate),
    )


@router.get("/city/{city}", response_model=CityMoodResponse)
async def get_city_mood(
    city: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token),
):
    """Get mood scores for all neighborhoods in a city."""
    nb_q = select(Neighborhood).where(Neighborhood.city.has(city_name=city)).limit(20)
    result = await db.execute(nb_q)
    neighborhoods = result.scalars().all()

    if not neighborhoods:
        return _fallback_city_mood(city)

    scores = []
    for nb in neighborhoods:
        try:
            score = await get_neighborhood_mood(nb.neighborhood_id, db, payload)
            scores.append(score)
        except Exception:
            continue

    if not scores:
        return _fallback_city_mood(city)

    avg_mood = round(sum(s.mood_score for s in scores) / len(scores), 1)
    hottest = max(scores, key=lambda s: s.mood_score)
    coldest = min(scores, key=lambda s: s.mood_score)

    return CityMoodResponse(
        city=city,
        avg_mood=avg_mood,
        hottest_neighborhood=hottest.neighborhood_name,
        hottest_score=hottest.mood_score,
        coldest_neighborhood=coldest.neighborhood_name,
        coldest_score=coldest.mood_score,
        neighborhoods=scores,
    )


@router.get("/summary")
async def get_mood_summary(
    payload: dict = Depends(verify_token),
):
    """Quick summary of mood across all focus cities (no DB needed)."""
    cities = [
        {"city": "Bangalore", "avg_mood": 78.4, "hottest": "Koramangala", "hottest_score": 92.1, "trend": "↑"},
        {"city": "Delhi", "avg_mood": 65.2, "hottest": "Saket", "hottest_score": 81.0, "trend": "→"},
        {"city": "Mumbai", "avg_mood": 72.8, "hottest": "Andheri West", "hottest_score": 85.3, "trend": "↑"},
        {"city": "Hyderabad", "avg_mood": 69.5, "hottest": "Hitech City", "hottest_score": 88.7, "trend": "↑"},
        {"city": "Pune", "avg_mood": 61.3, "hottest": "Viman Nagar", "hottest_score": 74.2, "trend": "↓"},
    ]
    overall = round(sum(c["avg_mood"] for c in cities) / len(cities), 1)
    return {
        "overall_mood": overall,
        "overall_label": _mood_label(overall),
        "cities": cities,
        "best_city": max(cities, key=lambda c: c["avg_mood"])["city"],
        "worst_city": min(cities, key=lambda c: c["avg_mood"])["city"],
    }


# ── Fallbacks ──────────────────────────────────────────────────────────────


def _fallback_mood(neighborhood_id: int) -> MoodScoreResponse:
    """Realistic demo mood score."""
    moods = {
        1: ("Koramangala", "Bangalore", 88.5, 72.0, 95.0, 85.0, 92.0, [{"name": "IPL Match — RCB vs MI", "type": "match", "date": "2026-07-26", "impact_pct": 25}]),
        2: ("Indiranagar", "Bangalore", 74.2, 68.0, 70.0, 80.0, 78.0, []),
        3: ("HSR Layout", "Bangalore", 81.0, 75.0, 85.0, 78.0, 86.0, [{"name": "Weekend Flea Market", "type": "festival", "date": "2026-07-26", "impact_pct": 15}]),
        4: ("Saket", "Delhi", 71.5, 62.0, 75.0, 72.0, 76.0, []),
        5: ("Hitech City", "Hyderabad", 85.3, 70.0, 90.0, 82.0, 88.0, [{"name": "Tech Conference — Cyberabad", "type": "concert", "date": "2026-07-26", "impact_pct": 20}]),
    }

    data = moods.get(neighborhood_id, ("Unknown Area", "Bangalore", 55.0, 50.0, 50.0, 60.0, 60.0, []))
    name, city, mood, sent, ev_b, weath, trend, events = data

    return MoodScoreResponse(
        neighborhood_id=neighborhood_id,
        neighborhood_name=name,
        city=city,
        mood_score=mood,
        mood_label=_mood_label(mood),
        sentiment_score=sent,
        event_boost=ev_b,
        weather_factor=weath,
        trend_momentum=trend,
        active_events=events,
        recommendation=_mood_recommendation(mood, events, trend - 50),
    )


def _fallback_city_mood(city: str) -> CityMoodResponse:
    """Realistic demo city mood."""
    fallbacks = {
        "Bangalore": [
            _fallback_mood(1),
            _fallback_mood(2),
            _fallback_mood(3),
        ],
        "Delhi": [_fallback_mood(4)],
        "Hyderabad": [_fallback_mood(5)],
    }
    scores = fallbacks.get(city, [_fallback_mood(1)])
    avg = round(sum(s.mood_score for s in scores) / len(scores), 1)
    hottest = max(scores, key=lambda s: s.mood_score)
    coldest = min(scores, key=lambda s: s.mood_score)

    return CityMoodResponse(
        city=city,
        avg_mood=avg,
        hottest_neighborhood=hottest.neighborhood_name,
        hottest_score=hottest.mood_score,
        coldest_neighborhood=coldest.neighborhood_name,
        coldest_score=coldest.mood_score,
        neighborhoods=scores,
    )
