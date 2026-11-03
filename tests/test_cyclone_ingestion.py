"""
Tests for Phase 1 Cyclone Data Ingestion, IMD Classification, Kinematics & Freshness Guards
DisasterRadar.ai - Multi-Hazard Automated Testing Suite
"""

import os
import sys
import pytest
from datetime import datetime, timedelta, timezone

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.database import init_database
from services.cyclone_ingestion import (
    classify_imd_cyclone_intensity,
    haversine_distance_km,
    compute_bearing_and_cardinal,
    compute_track_kinematics,
    find_nearest_indian_coast,
    evaluate_data_freshness,
    get_active_nio_cyclones_status,
    get_historical_nio_cyclones_list,
    get_cyclone_track_detail
)
from models.schemas import CompoundFloodRiskRequest
from services.cyclone_intelligence import (
    compute_coastal_district_exposure,
    evaluate_compound_cyclone_flood_risk
)


def test_imd_cyclone_classification_scale():
    # Official IMD 3-minute sustained wind scale verification
    assert classify_imd_cyclone_intensity(wind_kt=15)[0] == "LPA"
    assert classify_imd_cyclone_intensity(wind_kt=22)[0] == "D"
    assert classify_imd_cyclone_intensity(wind_kt=30)[0] == "DD"
    assert classify_imd_cyclone_intensity(wind_kt=40)[0] == "CS"
    assert classify_imd_cyclone_intensity(wind_kt=55)[0] == "SCS"
    assert classify_imd_cyclone_intensity(wind_kt=75)[0] == "VSCS"
    assert classify_imd_cyclone_intensity(wind_kt=105)[0] == "ESCS"
    assert classify_imd_cyclone_intensity(wind_kt=130)[0] == "SuCS"


def test_haversine_and_track_kinematics():
    # Distance between Chennai (13.08, 80.28) and Puri (19.80, 85.83) is ~945 km
    dist = haversine_distance_km(13.08, 80.28, 19.80, 85.83)
    assert 900.0 <= dist <= 990.0

    # Northward track movement: 12.0N, 80.5E -> 13.2N, 80.5E over 6 hours
    kin = compute_track_kinematics(
        12.0, 80.5, "2023-12-04T00:00:00Z",
        13.2, 80.5, "2023-12-04T06:00:00Z"
    )
    assert kin["distance_km"] > 120.0
    assert 18.0 <= kin["speed_kmh"] <= 26.0
    assert kin["cardinal"] == "N"


def test_nearest_indian_coast_lookup():
    # Point just off Chennai coast
    dist_km, ref_name = find_nearest_indian_coast(13.10, 80.80)
    assert dist_km < 80.0
    assert "Chennai" in ref_name


def test_data_freshness_provenance_guards():
    now_utc = datetime.now(timezone.utc)
    recent_iso = (now_utc - timedelta(minutes=45)).strftime("%Y-%m-%dT%H:%M:%SZ")
    delayed_iso = (now_utc - timedelta(hours=8)).strftime("%Y-%m-%dT%H:%M:%SZ")
    stale_iso = (now_utc - timedelta(hours=20)).strftime("%Y-%m-%dT%H:%M:%SZ")

    p_live = evaluate_data_freshness(recent_iso, "GDACS Live")
    assert p_live.freshnessStatus == "LIVE_CURRENT"
    assert p_live.isSimulatedOrHistorical is False

    p_delayed = evaluate_data_freshness(delayed_iso, "GDACS Cached")
    assert p_delayed.freshnessStatus == "DELAYED_CACHED"

    p_stale = evaluate_data_freshness(stale_iso, "GDACS Stale")
    assert p_stale.freshnessStatus == "STALE_ARCHIVE"

    p_hist = evaluate_data_freshness("2023-12-05T00:00:00Z", "IMD IBTrACS", is_historical=True)
    assert p_hist.freshnessStatus == "HISTORICAL_VERIFIED"
    assert p_hist.isSimulatedOrHistorical is True


def test_historical_cyclones_seeded_and_track_retrieval():
    init_database()
    hist_list = get_historical_nio_cyclones_list()
    assert len(hist_list) >= 5

    ids = {c.id for c in hist_list}
    assert "nio-2026-arnab" in ids
    assert "nio-2023-michaung" in ids
    assert "nio-2020-amphan" in ids

    detail = get_cyclone_track_detail("nio-2023-michaung")
    assert detail is not None
    assert detail.event.stormName == "MICHAUNG"
    assert detail.event.imdCategory == "SCS"
    assert len(detail.observedTrack) >= 4
    assert len(detail.forecastTrack) >= 2
    assert detail.uncertaintyConeGeoJSON is not None
    assert detail.uncertaintyConeGeoJSON["geometry"]["type"] == "Polygon"
    assert len(detail.intensityTrend.topShapDrivers) > 0
    assert detail.provenance.isSimulatedOrHistorical is True


def test_active_nio_cyclones_status_endpoint_contract():
    init_database()
    active_res = get_active_nio_cyclones_status()
    assert active_res.basinStatus in ("ACTIVE_CYCLONIC_DISTURBANCE", "DEPRESSION_WATCH", "CALM_BASIN")
    assert len(active_res.coastalStationsTelemetry) == 8
    assert active_res.provenance.sourceName != ""


def test_coastal_district_exposure_assessment():
    init_database()
    exp = compute_coastal_district_exposure("nio-2023-michaung")
    assert exp is not None
    assert exp.cycloneId == "nio-2023-michaung"
    assert len(exp.districts) >= 20
    # Top exposed district for Cyclone Michaung should be in Andhra Pradesh or Tamil Nadu
    top_d = exp.districts[0]
    assert top_d.state in ("Andhra Pradesh", "Tamil Nadu")
    assert top_d.exposureScore >= 50.0
    assert top_d.isValidatedImpactPrediction is False
    assert "GEOGRAPHICAL EXPOSURE ESTIMATE" in exp.methodologyDisclaimer


def test_compound_cyclone_to_flood_bridge():
    init_database()
    req = CompoundFloodRiskRequest(
        cycloneId="nio-2023-michaung",
        districtId="TN-CHN"
    )
    res = evaluate_compound_cyclone_flood_risk(req)
    assert res is not None
    assert res.cycloneId == "nio-2023-michaung"
    assert "Chennai" in res.targetLocation
    assert res.cycloneInducedRainfall24hMm > 50.0
    assert 0.0 <= res.floodModelProbability <= 100.0
    assert 0.0 <= res.compoundRiskScore <= 100.0
    assert res.compoundRiskLevel in (
        "CRITICAL_COMPOUND",
        "HIGH_COMPOUND",
        "MODERATE_COMPOUND",
        "LOW_COMPOUND"
    )
    assert len(res.floodRiskFactors) > 0
    assert len(res.compoundDrivers) == 3
    assert "VALIDATED BRIDGE ARCHITECTURE" in res.integrationArchitectureNote


def test_multi_hazard_alerts_aggregation_and_filtering():
    from main import get_active_system_alerts
    init_database()

    all_alerts = get_active_system_alerts(hazard_type="ALL")
    assert all_alerts.totalActive >= 2
    hazard_types = {a.hazardType for a in all_alerts.alerts}
    assert "FLOOD" in hazard_types
    assert "CYCLONE" in hazard_types

    flood_only = get_active_system_alerts(hazard_type="FLOOD")
    assert all(a.hazardType == "FLOOD" for a in flood_only.alerts)

    cyclone_only = get_active_system_alerts(hazard_type="CYCLONE")
    assert len(cyclone_only.alerts) >= 1
    assert all("CYCLONE" in a.hazardType for a in cyclone_only.alerts)


def test_phase6_nlp_sos_classifier_and_ner_extractor():
    from services.nlp_rag_engine import (
        classify_sos_distress_post,
        extract_disaster_ner_entities,
        get_sos_triage_feed,
        retrieve_sop_knowledge_rag
    )

    sample_sos = (
        "URGENT SOS! 6 family members including a 4-month infant and grandmother on oxygen "
        "trapped on roof near Narsapur, Kakinada. Cyclone Arnab water is 5 feet deep and live wire sparked!"
    )
    ner = extract_disaster_ner_entities(sample_sos)
    assert any("Narsapur" in loc or "Kakinada" in loc for loc in ner["extractedLocations"])
    assert ner["estimatedWaterDepthCm"] >= 150.0
    assert ner["strandedPeopleCount"] == 6
    assert "Infants / Children" in ner["vulnerableGroups"]
    assert "Critical Medical / Life-Support" in ner["vulnerableGroups"]
    assert "Rooftop / Vertical Trapping" in ner["hazardEntities"]

    classified = classify_sos_distress_post(sample_sos)
    assert classified["classification"] == "LIFE_THREATENING_SOS"
    assert classified["triagePriority"] == "CRITICAL_P1"
    assert classified["urgencyScore"] >= 85.0
    assert classified["matchedOfficialSop"] is not None

    feed = get_sos_triage_feed()
    assert len(feed) >= 4
    assert feed[0]["urgencyScore"] >= feed[-1]["urgencyScore"]

    rag = retrieve_sop_knowledge_rag(
        query="Cyclone storm surge coastal evacuation and electrical transformer isolation",
        hazard_filter="ALL",
        top_k=3
    )
    assert rag["totalCorpusSize"] >= 8
    assert len(rag["retrievedDocuments"]) == 3
    assert rag["retrievedDocuments"][0]["similarityScore"] >= rag["retrievedDocuments"][1]["similarityScore"]
    assert "Grounded NDMA / IMD Operational Briefing" in rag["synthesizedBriefing"]



