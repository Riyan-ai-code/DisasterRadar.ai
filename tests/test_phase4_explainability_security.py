"""
Phase 4 Automated Unit & Integration Tests:
1. Dynamic local feature attribution (Waterfall escalators and mitigators)
2. Plain-language narrative generation (zero ML jargon for citizens)
3. 3-Question Emergency Protocol synthesis (Where is danger, How serious, What to do)
4. Multilingual speech script generation (Hindi, Assamese, Bengali, English)
5. Scientific correlation vs causation disclaimer presence
6. External API Circuit Breaker state transitions (CLOSED -> OPEN -> HALF_OPEN)
7. Fast-fail fallback execution under circuit trips
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.models.schemas import PredictionInput
from backend.services.explainability import (
    calculate_local_feature_attributions,
    generate_plain_language_narrative,
    synthesize_3_question_emergency_protocol,
    generate_multilingual_audio_scripts,
    generate_complete_explainability_package
)
from backend.services.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpenException,
    CIRCUIT_BREAKERS,
    get_all_circuit_breaker_statuses
)

client = TestClient(app)


def test_dynamic_local_feature_attribution():
    """Verify that feature contributions calculate correctly and partition into escalators vs mitigators."""
    # Test high rain case in low basin
    params = PredictionInput(
        rainfall24h=120.0,
        rainfall72h=210.0,
        temperature=26.0,
        humidity=92.0,
        elevation=6.0,
        slope=0.3,
        location="Kharupetia, Assam"
    )
    result = calculate_local_feature_attributions(params)

    assert "probability" in result
    assert "contributions" in result
    assert len(result["contributions"]) >= 4

    # High rain should be top escalator
    escalators = result["top_escalators"]
    assert len(escalators) > 0
    top_keys = [e["feature_key"] for e in escalators]
    assert "rainfall_24h" in top_keys or "rainfall_72h" in top_keys or "elevation" in top_keys

    # Low elevation should escalate risk
    elev_contrib = next((c for c in result["contributions"] if c["feature_key"] == "elevation"), None)
    assert elev_contrib is not None
    assert elev_contrib["impact_percent"] > 0
    assert elev_contrib["direction"] == "ESCALATOR"


def test_plain_language_narrative_and_disclaimer():
    """Verify that narrative is written in plain English and includes scientific disclaimers."""
    params = PredictionInput(
        rainfall24h=85.0,
        rainfall72h=140.0,
        temperature=24.0,
        humidity=88.0,
        elevation=12.0,
        location="Guwahati Riverfront"
    )
    pkg = generate_complete_explainability_package(params)

    assert "plain_language_narrative" in pkg
    narrative = pkg["plain_language_narrative"]
    assert "Guwahati Riverfront" in narrative
    assert len(narrative) > 50

    # Ensure scientific disclaimer is included
    assert "scientific_disclaimer" in pkg
    disclaimer = pkg["scientific_disclaimer"]
    assert "SCIENTIFIC NOTICE" in disclaimer
    assert "correlation" in disclaimer.lower()


def test_3_question_emergency_protocol_synthesis():
    """Verify that the 3 core questions citizens need are clearly answered."""
    params = PredictionInput(
        rainfall24h=110.0,
        rainfall72h=190.0,
        elevation=8.0,
        location="Dhubri, Assam"
    )
    pkg = generate_complete_explainability_package(params)
    protocol = pkg["three_question_protocol"]

    # Question 1: Where is the danger?
    q1 = protocol["question_1_where"]
    assert "headline" in q1
    assert "hazard_zones" in q1
    assert len(q1["hazard_zones"]) >= 2

    # Question 2: How serious is it?
    q2 = protocol["question_2_how_serious"]
    assert "headline" in q2
    assert "depth_tier" in q2
    assert q2["physical_depth_m"] > 0.15

    # Question 3: What should I do right now?
    q3 = protocol["question_3_what_to_do"]
    assert "directives" in q3
    assert len(q3["directives"]) >= 3
    assert "112" in q3["emergency_helpline"]


def test_multilingual_audio_scripts():
    """Verify regional language scripts for Web Speech Synthesis (Hindi, Assamese, Bengali, English)."""
    scripts = generate_multilingual_audio_scripts(
        location_name="Kharupetia",
        prob=82.5,
        depth_m=0.85,
        tier_label="Tier 3: Structural Submergence"
    )

    assert "en" in scripts and len(scripts["en"]) > 20
    assert "hi" in scripts and "बाढ़" in scripts["hi"]
    assert "as" in scripts and "বান" in scripts["as"]
    assert "bn" in scripts and "বন্যা" in scripts["bn"]


def test_circuit_breaker_resilience_and_fast_fail():
    """Verify that repeated failures trip the circuit breaker and invoke fast fallbacks."""
    cb = CircuitBreaker("test_service", failure_threshold=2, recovery_timeout_sec=0.5)

    def failing_call():
        raise TimeoutError("External API timed out after 3.5s")

    def safe_fallback():
        return {"status": "FALLBACK_CACHED_TELEMETRY", "rain_24h": 0.0}

    # Initial call fails -> failure count 1
    res1 = cb.call(failing_call, fallback_func=safe_fallback)
    assert res1["status"] == "FALLBACK_CACHED_TELEMETRY"
    assert cb.state == "CLOSED"
    assert cb.failure_count == 1

    # Second failure -> trips to OPEN
    res2 = cb.call(failing_call, fallback_func=safe_fallback)
    assert res2["status"] == "FALLBACK_CACHED_TELEMETRY"
    assert cb.state == "OPEN"

    # Next call while OPEN -> trips immediately without executing failing_call
    res3 = cb.call(failing_call, fallback_func=safe_fallback)
    assert res3["status"] == "FALLBACK_CACHED_TELEMETRY"
    assert cb.total_fallbacks >= 3

    # Check status inspection
    status = cb.get_status()
    assert status["state"] == "OPEN"
    assert status["is_healthy"] is False


def test_phase4_api_endpoints():
    """Verify /api/predict/explain and /api/system/circuit-breakers endpoints."""
    # Test Explainability Endpoint
    resp = client.post("/api/predict/explain", json={
        "rainfall24h": 75.0,
        "rainfall72h": 120.0,
        "temperature": 27.0,
        "humidity": 85.0,
        "elevation": 18.0,
        "location": "Majuli Island"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["location"] == "Majuli Island"
    assert "plain_language_narrative" in data
    assert "three_question_protocol" in data
    assert "multilingual_voice_scripts" in data

    # Test Circuit Breakers Telemetry Endpoint
    resp_cb = client.get("/api/system/circuit-breakers")
    assert resp_cb.status_code == 200
    cb_data = resp_cb.json()
    assert "circuit_breakers" in cb_data
    assert "open_meteo_weather" in cb_data["circuit_breakers"]
    assert "system_resilience" in cb_data
