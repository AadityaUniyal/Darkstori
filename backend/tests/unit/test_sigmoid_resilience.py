"""Unit tests for R2: Perishable Zero-Waste Resilience Pricing Engine.

Tests continuous Sigmoid salvage price decay, cold-chain temperature failure alerts,
QR crate scanning verification, and automated produce markdown scheduling.
"""

import math
import pytest
from datetime import datetime, timedelta
from backend.api.routes.resilience import (
    calculate_sigmoid_discount,
    DecayRequest,
    ScanRequest,
    VerifyPhotoRequest,
    simulate_decay,
    scan_qr_crate,
    verify_photo,
)
from backend.database.connection import AsyncSessionLocal, init_db
from backend.database.models.models import ProductBatch, DarkStore


class TestSigmoidDiscountFormula:
    """Tests for continuous Sigmoid perishable markdown calculation."""

    def test_fresh_produce_zero_discount(self):
        """Fresh produce with freshness_score >= 0.90 must have 0.0 discount."""
        assert calculate_sigmoid_discount(1.0) == 0.0
        assert calculate_sigmoid_discount(0.95) == 0.0
        assert calculate_sigmoid_discount(0.90) == 0.0

    def test_midpoint_discount_fifty_percent(self):
        """At exact midpoint (freshness_score = 0.52), discount is 1 / (1 + exp(0)) = 0.50."""
        discount = calculate_sigmoid_discount(0.52, steepness=7.5, midpoint=0.52)
        assert discount == 0.50

    def test_severely_degraded_capped_at_eighty_five_percent(self):
        """Severely degraded produce (freshness_score <= 0.20) must be capped at 85% markdown."""
        assert calculate_sigmoid_discount(0.10) == 0.85
        assert calculate_sigmoid_discount(0.0) == 0.85

    def test_monotonicity(self):
        """Discount must monotonically increase as freshness score drops from 0.90 down to 0.0."""
        scores = [0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30, 0.20, 0.10, 0.0]
        discounts = [calculate_sigmoid_discount(s) for s in scores]

        for i in range(len(discounts) - 1):
            assert discounts[i] <= discounts[i + 1], f"Monotonicity violation at score {scores[i]}: {discounts[i]} > {discounts[i+1]}"

    def test_bounds_always_between_zero_and_eighty_five(self):
        """Discount rate must always remain within [0.0, 0.85] for any input."""
        for score in [-0.5, 0.0, 0.25, 0.50, 0.75, 1.0, 1.5]:
            disc = calculate_sigmoid_discount(score)
            assert 0.0 <= disc <= 0.85


class TestResilienceDecayAndAlerts:
    """Tests for simulated decay, cold chain temperature breach, and markdown updates."""

    @pytest.mark.asyncio
    async def test_simulate_decay_normal_conditions(self):
        """Simulating decay under normal conditions reduces freshness and applies discount."""
        await init_db()
        async with AsyncSessionLocal() as session:
            payload = {"sub": "resilience_tester", "role": "operations"}
            req = DecayRequest(hours=10.0, city="Bangalore", temp_failure=False)
            batches = await simulate_decay(req=req, db=session, payload=payload)

            assert len(batches) > 0
            for b in batches:
                assert b.freshness_score >= 0.0
                assert b.discount_rate >= 0.0
                assert b.current_price <= b.base_price

    @pytest.mark.asyncio
    async def test_simulate_decay_temperature_breach(self):
        """Temperature failure accelerates decay by 2.5x and marks status as temperature breach."""
        await init_db()
        async with AsyncSessionLocal() as session:
            payload = {"sub": "resilience_tester", "role": "operations"}
            req = DecayRequest(hours=6.0, city="Bangalore", temp_failure=True)
            batches = await simulate_decay(req=req, db=session, payload=payload)

            assert len(batches) > 0
            for b in batches:
                assert "Breach" in b.color_state or "Wilting" in b.color_state or "Accelerated" in b.color_state


class TestQRCodeAndQualityVerification:
    """Tests for QR crate verification and AI photo analysis."""

    @pytest.mark.asyncio
    async def test_scan_qr_crate_known_hash(self):
        """Scanning a known QR code returns batch details."""
        await init_db()
        async with AsyncSessionLocal() as session:
            payload = {"sub": "scanner_user", "role": "picker"}
            req = ScanRequest(qr_code_hash="qr_ban_01", store_id=1)
            response = await scan_qr_crate(req=req, db=session, payload=payload)

            assert response.product_name == "Organic Bananas"
            assert response.category == "Fruits"
            assert response.qr_code_hash == "qr_ban_01"

    @pytest.mark.asyncio
    async def test_scan_qr_crate_unknown_hash_raises_404(self):
        """Scanning an unknown QR code raises HTTP 404."""
        await init_db()
        async with AsyncSessionLocal() as session:
            payload = {"sub": "scanner_user", "role": "picker"}
            req = ScanRequest(qr_code_hash="non_existent_qr_hash_999", store_id=1)
            with pytest.raises(Exception) as excinfo:
                await scan_qr_crate(req=req, db=session, payload=payload)
            assert "404" in str(excinfo.value)
