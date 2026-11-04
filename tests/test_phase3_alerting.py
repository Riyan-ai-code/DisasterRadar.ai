"""
DisasterRadar.ai - Phase 3 Automated Verification Tests
Validates:
1. Multi-factor alert trigger evaluation (Rate of rise, duration, physical depth, ensemble confidence)
2. Anti-fatigue alert deduplication & debounce filtering
3. Severity escalation override (bypasses debounce when threat level escalates)
4. Multi-channel delivery status lifecycle simulation
5. Citizen emergency acknowledgement feedback loop
6. Persistent SQLite alert audit ledger
"""

import os
import json
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.schemas import PredictionInput, CitizenAcknowledgeRequest
from backend.services.alerts_service import evaluate_multi_factor_alert
from backend.services.database import get_alerts_audit_log, check_alert_debounce

client = TestClient(app)


def test_multi_factor_alert_triggers():
    """Verify that multiple environmental factors (rate of rise, depth, antecedent rain) trigger alerts."""
    # Scenario: Low-lying sector experiencing sudden torrential downpour
    torrential_input = PredictionInput(
        location="Bhayandar Lowland Culvert",
        rainfall24h=95.0,
        rainfall72h=160.0,
        currentRainfall=28.0, # 28 mm/h rapid cloudburst
        elevation=6.0,
        drainageCapacity=2.5, # Poor drainage
        upstreamAreaKm2=30.0
    )
    result = evaluate_multi_factor_alert(torrential_input)
    assert result["threshold_crossed"] is True
    assert result["alert_tier"] in ("CRITICAL_EMERGENCY", "HIGH_WARNING")
    
    factors = [f["factor"] for f in result["trigger_factors"]]
    assert "RAPID_RATE_OF_RISE" in factors or "ELEVATED_INTENSITY" in factors
    assert "ANTECEDENT_SATURATION" in factors
    assert result["inundation_depth_meters"] > 0.15


def test_alert_debounce_and_deduplication():
    """Verify that identical repeated alerts within the debounce window are suppressed to prevent alarm fatigue."""
    test_loc = f"Sector-Debounce-Test-{datetime.now().strftime('%M%S%f')}"
    
    alert_input = PredictionInput(
        location=test_loc,
        rainfall24h=55.0,
        rainfall72h=90.0,
        elevation=12.0,
        drainageCapacity=5.0
    )
    
    # First alert should dispatch
    first_res = evaluate_multi_factor_alert(alert_input, debounce_window_mins=60)
    assert first_res["deduplication"]["should_dispatch"] is True
    assert first_res["deduplication"]["status"] == "DISPATCHED"
    assert first_res["delivery_pipeline"]["delivery_status"] == "DELIVERED"
    
    # Second identical alert within window must be suppressed as duplicate
    second_res = evaluate_multi_factor_alert(alert_input, debounce_window_mins=60)
    assert second_res["deduplication"]["should_dispatch"] is False
    assert second_res["deduplication"]["status"] == "SUPPRESSED_DUPLICATE"
    assert "SUPPRESSED_DUPLICATE" in second_res["delivery_pipeline"]["delivery_status"]


def test_alert_escalation_bypasses_debounce():
    """Verify that if severity escalates (e.g., MODERATE -> CRITICAL), debounce is bypassed immediately."""
    test_loc = f"Sector-Escalation-Test-{datetime.now().strftime('%M%S%f')}"
    
    # 1. Initial moderate alert
    moderate_input = PredictionInput(
        location=test_loc,
        rainfall24h=35.0,
        rainfall72h=50.0,
        elevation=14.0,
        drainageCapacity=6.0
    )
    mod_res = evaluate_multi_factor_alert(moderate_input, debounce_window_mins=60)
    
    # 2. Catastrophic surge arrives (escalates to CRITICAL)
    catastrophic_input = PredictionInput(
        location=test_loc,
        rainfall24h=140.0,
        rainfall72h=220.0,
        currentRainfall=45.0,
        elevation=5.0,
        drainageCapacity=2.0
    )
    cat_res = evaluate_multi_factor_alert(catastrophic_input, debounce_window_mins=60)
    
    # Escalation must dispatch immediately despite debounce window
    assert cat_res["alert_tier"] == "CRITICAL_EMERGENCY"
    assert cat_res["deduplication"]["should_dispatch"] is True
    assert "ESCALATION" in cat_res["deduplication"]["reason"] or cat_res["deduplication"]["status"] == "DISPATCHED"


def test_citizen_acknowledgement_flow():
    """Verify citizen emergency confirmation feedback loop updates the alert ledger."""
    test_loc = f"Citizen-Sector-{datetime.now().strftime('%M%S%f')}"
    alert_input = PredictionInput(
        location=test_loc,
        rainfall24h=80.0,
        rainfall72h=140.0,
        elevation=8.0,
        drainageCapacity=3.5
    )
    alert = evaluate_multi_factor_alert(alert_input, debounce_window_mins=60)
    alert_id = alert["id"]
    
    # Citizen confirms they are safe
    ack_payload = {
        "citizen_status": "SAFE",
        "comments": "Evacuated to 2nd floor, water rising on street",
        "device_id": "citizen_mobile_app_test"
    }
    response = client.post(f"/api/alerts/{alert_id}/acknowledge", json=ack_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "recorded"
    assert data["citizen_status"] == "SAFE"


def test_alerts_audit_log_endpoint():
    """Verify GET /api/alerts/audit-log returns historical dispatch ledger."""
    response = client.get("/api/alerts/audit-log?limit=10")
    assert response.status_code == 200
    ledger = response.json()
    assert isinstance(ledger, list)
    if len(ledger) > 0:
        item = ledger[0]
        assert "id" in item
        assert "location" in item
        assert "delivery_status" in item
        assert "channels" in item
        assert "citizen_confirms" in item
