"""
Phase 1 Verification Tests: Life-Safety, Evacuation Trust & Telemetry Integrity
Tests:
1. Inundation depth calculation & physical impact tier classification (Tier 0 to Tier 3)
2. Detection of missing/unmeasured hydrological telemetry
3. Honest telemetry attribution (LIVE vs SIMULATED vs UNAVAILABLE)
4. Offline baseline tagging (no silent disguise of mock data)
5. Response schemas conformance
"""

import pytest
from datetime import datetime
from backend.models.schemas import PredictionInput, PredictionResponse, StationData, RecentPrediction
from backend.services.feature_engineering import calculate_inundation_physics, detect_missing_measurements
from backend.services.stations import STATION_METADATA


def test_inundation_physics_tier0_safe():
    params = PredictionInput(
        rainfall24h=5.0,
        rainfall72h=10.0,
        elevation=250.0,
        slope=4.5
    )
    physics = calculate_inundation_physics(params, prob_percent=12.0)
    assert physics["tier_code"] == "TIER_0"
    assert physics["depth_meters"] < 0.05
    assert "SAFE" in physics["life_safety_directive"]
    assert "High-Velocity" in physics["flow_velocity"]


def test_inundation_physics_tier2_hazardous_knee_depth():
    params = PredictionInput(
        rainfall24h=75.0,
        rainfall72h=140.0,
        elevation=12.0,
        slope=0.8,
        drainageCapacity=3.0
    )
    physics = calculate_inundation_physics(params, prob_percent=62.0)
    assert physics["tier_code"] == "TIER_2"
    assert 0.15 <= physics["depth_meters"] <= 0.49
    assert "float" in physics["life_safety_directive"].lower() or "swift water" in physics["life_safety_directive"].lower()


def test_inundation_physics_tier3_structural_submergence():
    params = PredictionInput(
        rainfall24h=190.0,
        rainfall72h=340.0,
        elevation=5.0,
        slope=0.3,
        drainageCapacity=2.0
    )
    physics = calculate_inundation_physics(params, prob_percent=88.5)
    assert physics["tier_code"] == "TIER_3"
    assert physics["depth_meters"] >= 0.50
    assert "VERTICAL EVACUATION" in physics["life_safety_directive"]
    assert "112" in physics["life_safety_directive"]


def test_detect_missing_measurements():
    # Only rainfall provided; others default to None
    partial_input = PredictionInput(
        rainfall24h=40.0,
        rainfall72h=None,
        elevation=None
    )
    missing = detect_missing_measurements(partial_input)
    assert "rainfall72h" in missing
    assert "elevation" in missing
    assert "slope" in missing
    assert "ndwi" in missing


def test_station_data_schema_honest_metadata():
    stn = StationData(
        name="Test Coastal Station",
        lat=19.29,
        lng=72.85,
        risk="severe",
        level="Severe Risk",
        prob=82.0,
        r24=95.0,
        r72=210.0,
        elev=4.5,
        temp=26.0,
        hum=88.0,
        source="Open-Meteo Global NWP & Copernicus DEM",
        last_updated=datetime.now().isoformat(),
        status="LIVE",
        missing_measurements=[],
        inundationDepthMeters=0.48,
        depthTier="Tier 2: Knee Depth (15–45 cm)"
    )
    assert stn.status == "LIVE"
    assert stn.inundationDepthMeters == 0.48
    assert "Open-Meteo" in stn.source


def test_simulated_offline_station_tagging():
    sim_stn = StationData(
        name="Offline Station",
        lat=12.97,
        lng=77.59,
        risk="moderate",
        level="Simulated Baseline (Offline)",
        prob=42.0,
        r24=15.0,
        r72=35.0,
        elev=900.0,
        temp=26.0,
        hum=75.0,
        source="Simulated Offline Baseline (Open-Meteo Offline)",
        last_updated=datetime.now().isoformat(),
        status="SIMULATED",
        missing_measurements=["precipitation", "rain"],
        inundationDepthMeters=0.10,
        depthTier="Tier 1: Ankle Depth (Simulated)"
    )
    # Critical Phase 1 invariant: Never claim offline mock data is LIVE
    assert sim_stn.status == "SIMULATED"
    assert "SIMULATED" in sim_stn.status
    assert len(sim_stn.missing_measurements) > 0


def test_recent_prediction_audit_tagging():
    demo_rec = RecentPrediction(
        time="10:20 AM",
        location="Bengaluru",
        probability=78.4,
        riskLevel="HIGH",
        status="DEMO_AUDIT",
        depthTier="Tier 2: Knee Depth"
    )
    assert demo_rec.status == "DEMO_AUDIT"
    assert demo_rec.depthTier is not None
