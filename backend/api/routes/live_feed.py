"""API routes for live delivery feed."""

import logging
from datetime import date, datetime
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.core.rate_limiter import rate_limit
from backend.data_sources.live_delivery_feed import live_feed
from backend.security.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/live-feed", tags=["Live Feed"])


@router.get("/availability/{pincode}")
@rate_limit(calls_per_minute=30)
async def check_platform_availability(
    pincode: str, current_user: dict = Depends(get_current_user)
) -> Dict[str, bool]:
    """
    Check which platforms are currently serving a PIN code.

    **Use Case**: Real-time platform availability for customers

    Args:
        pincode: 6-digit Indian PIN code

    Returns:
        Dictionary with platform availability status
    """
    try:
        if len(pincode) != 6 or not pincode.isdigit():
            raise HTTPException(status_code=400, detail="Invalid PIN code format")

        availability = await live_feed.fetch_platform_availability(pincode)

        return {
            "pincode": pincode,
            "timestamp": datetime.now().isoformat(),
            "platforms": availability,
            "available_count": sum(1 for v in availability.values() if v),
        }

    except Exception as e:
        logger.error(f"Error checking availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/delivery-times/{pincode}")
@rate_limit(calls_per_minute=30)
async def get_estimated_delivery_times(
    pincode: str, current_user: dict = Depends(get_current_user)
) -> Dict:
    """
    Get estimated delivery times for all platforms.

    **Use Case**: Help customers choose fastest platform

    Args:
        pincode: 6-digit Indian PIN code

    Returns:
        Estimated delivery times in minutes
    """
    try:
        if len(pincode) != 6 or not pincode.isdigit():
            raise HTTPException(status_code=400, detail="Invalid PIN code format")

        delivery_times = await live_feed.estimate_delivery_times(pincode)

        # Find fastest platform
        available_times = {k: v for k, v in delivery_times.items() if v is not None}
        fastest_platform = (
            min(available_times, key=available_times.get) if available_times else None
        )

        return {
            "pincode": pincode,
            "timestamp": datetime.now().isoformat(),
            "delivery_times": delivery_times,
            "fastest_platform": fastest_platform,
            "fastest_time": (
                available_times.get(fastest_platform) if fastest_platform else None
            ),
        }

    except Exception as e:
        logger.error(f"Error estimating delivery times: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/live")
@rate_limit(calls_per_minute=60)
async def get_live_metrics(current_user: dict = Depends(get_current_user)) -> Dict:
    """
    Get real-time delivery metrics across all platforms.

    **Use Case**: Live dashboard for monitoring market activity

    Returns:
        Current delivery metrics and trends
    """
    try:
        metrics = live_feed.get_live_metrics()

        if not metrics:
            return {
                "status": "no_data",
                "message": "No recent delivery data available",
                "timestamp": datetime.now().isoformat(),
            }

        return {
            "status": "active",
            "metrics": metrics,
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error(f"Error fetching live metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/report/daily")
@rate_limit(calls_per_minute=10)
async def get_daily_report(
    report_date: Optional[date] = Query(
        None, description="Date for report (YYYY-MM-DD)"
    ),
    current_user: dict = Depends(get_current_user),
) -> Dict:
    """
    Generate comprehensive daily delivery report.

    **Use Case**: Daily briefing for stakeholders

    Args:
        report_date: Date for report (defaults to today)

    Returns:
        Detailed daily report with insights
    """
    try:
        target_date = report_date if report_date else datetime.now().date()

        report = await live_feed.generate_daily_report(
            datetime.combine(target_date, datetime.min.time())
        )

        if not report:
            return {
                "status": "no_data",
                "date": target_date.isoformat(),
                "message": "No delivery data available for this date",
            }

        return {"status": "success", "report": report}

    except Exception as e:
        logger.error(f"Error generating daily report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sentiment/{platform}")
@rate_limit(calls_per_minute=20)
async def get_platform_sentiment(
    platform: str, current_user: dict = Depends(get_current_user)
) -> Dict:
    """
    Get social media sentiment for a platform.

    **Use Case**: Monitor customer satisfaction and issues

    Args:
        platform: Platform name (blinkit, zepto, instamart, dunzo)

    Returns:
        Sentiment analysis and trending issues
    """
    try:
        valid_platforms = ["blinkit", "zepto", "instamart", "dunzo"]
        if platform.lower() not in valid_platforms:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid platform. Must be one of: {', '.join(valid_platforms)}",
            )

        sentiment = await live_feed.monitor_social_sentiment(platform.lower())

        return {
            "platform": platform,
            "timestamp": datetime.now().isoformat(),
            "sentiment": sentiment,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sentiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/event")
@rate_limit(calls_per_minute=100)
async def log_delivery_event(
    event: Dict, current_user: dict = Depends(get_current_user)
) -> Dict:
    """
    Log a delivery event (for crowdsourced data collection).

    **Use Case**: Collect real delivery data from users

    Args:
        event: Delivery event data

    Returns:
        Confirmation message
    """
    try:
        required_fields = ["platform", "pincode", "delivery_time"]
        missing_fields = [f for f in required_fields if f not in event]

        if missing_fields:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields: {', '.join(missing_fields)}",
            )

        live_feed.add_delivery_event(event)

        return {
            "status": "success",
            "message": "Delivery event logged successfully",
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check() -> Dict:
    """Check if live feed service is operational."""
    return {
        "status": "healthy",
        "service": "live_delivery_feed",
        "timestamp": datetime.now().isoformat(),
        "data_points": len(live_feed.delivery_stream),
    }
