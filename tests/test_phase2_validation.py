"""
DisasterRadar.ai - Phase 2 Automated Verification Tests
Validates:
1. Catchment lag transit time & peak flow calculations
2. Multi-horizon timeline forecasting (+3h, +6h, +12h, +24h, +48h)
3. Spatial validation benchmark artifact (models/spatial_validation_benchmark.json)
4. Model comparison on held-out geographic basins (FNR, Brier score, ROC-AUC)
5. Backend API endpoints: GET /api/models/spatial-validation, POST /api/predict/timeline
"""

import os
import json
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.models.schemas import PredictionInput, TimelineForecastRequest
from backend.services.hydrology import calculate_catchment_lag, forecast_multi_horizon_timeline

client = TestClient(app)


def test_catchment_lag_calculation():
    """Verify transit time and peak flow scaling for small vs large upstream basins."""
    # Small steep catchment
    small_basin = calculate_catchment_lag(
        upstream_area_km2=5.0,
        slope_degrees=5.0,
        rainfall_intensity_mm_hr=20.0
    )
    assert small_basin["transit_time_hours"] > 0.0
    assert small_basin["transit_time_hours"] < 10.0
    assert small_basin["peak_flow_m3s"] > 0.0

    # Large flat catchment (longer lag)
    large_basin = calculate_catchment_lag(
        upstream_area_km2=100.0,
        slope_degrees=0.5,
        rainfall_intensity_mm_hr=20.0
    )
    assert large_basin["transit_time_hours"] > small_basin["transit_time_hours"]
    assert large_basin["peak_flow_m3s"] > small_basin["peak_flow_m3s"]
    assert "SURGE" in large_basin["surge_tier"] or "INFLOW" in large_basin["surge_tier"]


def test_timeline_forecast_engine():
    """Verify 5 forecast horizons (+3h, +6h, +12h, +24h, +48h) generated with physical depth."""
    sample_input = PredictionInput(
        location="Bhayandar East Basin",
        rainfall24h=75.0,
        rainfall72h=120.0,
        elevation=8.0,
        drainageCapacity=4.0
    )
    timeline = forecast_multi_horizon_timeline(
        input_data=sample_input,
        base_probability=65.0,
        upstream_area_km2=25.0,
        rainfall_trend="DECAYING"
    )
    assert len(timeline["forecast_timeline"]) == 5
    horizons = [p["horizon_hours"] for p in timeline["forecast_timeline"]]
    assert horizons == [3, 6, 12, 24, 48]

    for p in timeline["forecast_timeline"]:
        assert 0.0 <= p["probability"] <= 100.0
        assert p["inundation_depth_meters"] >= 0.0
        assert len(p["depth_tier"]) > 0
        assert len(p["life_safety_directive"]) > 0


def test_spatial_validation_benchmark_artifact():
    """Verify spatial validation benchmark exists and compares all 3 models on the same held-out basins."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    bench_file = os.path.join(base_dir, "models", "spatial_validation_benchmark.json")
    assert os.path.exists(bench_file), "Benchmark file must exist"

    with open(bench_file, "r") as f:
        data = json.load(f)

    assert "models" in data
    assert "xgboost" in data["models"]
    assert "random_forest" in data["models"]
    assert "super_stack_ensemble" in data["models"]

    for model_key in ["xgboost", "random_forest", "super_stack_ensemble"]:
        m = data["models"][model_key]
        assert "false_negative_rate" in m
        assert "recall" in m
        assert "precision" in m
        assert "brier_score" in m
        assert "roc_auc" in m
        assert "pr_auc" in m
        assert "calibration_curve" in m
        assert 0.0 <= m["false_negative_rate"] <= 1.0
        assert 0.0 <= m["brier_score"] <= 1.0


def test_spatial_validation_api_endpoint():
    """Verify GET /api/models/spatial-validation returns benchmark data successfully."""
    response = client.get("/api/models/spatial-validation")
    assert response.status_code == 200
    data = response.json()
    assert data["benchmark_name"] == "DisasterRadar.ai Spatial Basin Holdout Benchmark"
    assert data["held_out_basins_count"] > 0
    assert "super_stack_ensemble" in data["models"]


def test_timeline_prediction_api_endpoint():
    """Verify POST /api/predict/timeline returns structured multi-horizon forecast."""
    payload = {
        "input_data": {
            "location": "Mira Road Sector 4",
            "rainfall24h": 65.0,
            "rainfall72h": 110.0,
            "elevation": 9.5,
            "drainageCapacity": 4.5
        },
        "upstreamAreaKm2": 18.0,
        "rainfallTrend": "DECAYING"
    }
    response = client.post("/api/predict/timeline", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["location"] == "Mira Road Sector 4"
    assert "catchment_hydrodynamics" in data
    assert len(data["forecast_timeline"]) == 5
    assert data["peak_probability"] > 0.0
