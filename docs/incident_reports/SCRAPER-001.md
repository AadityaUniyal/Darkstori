# Incident Report: SCRAPER-001

**Date:** 2026-06-18  
**Author:** Darkstori Data Engineering Team  
**Status:** Resolved  

## Incident Summary
On June 18th, 2026, the weekly scheduled competitor pricing sync job (`WEEKLY_SCRAPE_JOB`) failed to collect data from Blinkit and Zepto for approximately 14 hours. The failure caused the `competitor_pricing` database table to miss its weekly snapshot for Bangalore and Delhi.

## Root Cause
Blinkit deployed a major frontend redesign that altered the CSS class names and DOM structure of their product listing pages. Our `BeautifulSoup4` scraper was tightly coupled to the old class names (e.g., `.product-price-tag`), which were obfuscated in their new React build (e.g., `.css-1x2y3z`). 
Because the parser returned `None` for the price fields, the validation layer threw a `ValueError: Missing required field: price`, causing the Celery job to hard crash without falling back.

## Impact
- **Data Loss:** 14 hours of competitor pricing data gap.
- **Model Impact:** The dynamic pricing recommendation engine (`PricingStrategy`) fell back to historical averages for the day, slightly reducing the aggression of our markdown recommendations.

## Resolution & Remediation
1. **Immediate Fix:** 
   - Manually updated the scraper selectors using Regex and data attributes (`data-testid="product-price"`) rather than fragile CSS classes.
   - Re-ran the scrape job manually for the missed windows.

2. **Long-Term Preventive Measures (Implemented):**
   - **Schema-Drift Checks:** Added a pre-flight check that samples 5 known URLs. If the expected schema is not found, the system now raises a `SchemaDriftWarning` rather than crashing, and alerts the engineering team via Slack.
   - **DOM-Structure Fallbacks:** The parser now attempts 3 different extraction strategies (Data attributes > Regex patterns > NLP-based layout parsing) before failing.
   - **Graceful Degradation:** If pricing cannot be fetched, the `WEEKLY_SCRAPE_JOB` continues to sync availability and location data instead of failing the entire batch.

## Lessons Learned
Relying on CSS classes for competitor intelligence is inherently brittle. Moving towards `data-testid` (when available) or robust regex patterns significantly increases the resilience of the data ingestion pipeline. This incident proved the necessity of our monitoring stack, as the failure was immediately visible on our Grafana dashboard via a spike in the `http_error_rate` for the background worker.
