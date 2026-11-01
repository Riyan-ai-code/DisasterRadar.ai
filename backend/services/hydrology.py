"""
DisasterRadar.ai - Hydrological Catchment & Multi-Horizon Timeline Engine
Models:
1. Upstream Catchment Runoff Routing (Kirpich/Kinematic Wave Transit Time)
2. Multi-Horizon Inundation Timeline Forecasting (+3h, +6h, +12h, +24h, +48h)
3. Catchment Storage & Drainage Dissipation
"""

import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from models.schemas import PredictionInput, RiskFactor
from services.feature_engineering import calculate_inundation_physics, classify_risk


def calculate_catchment_lag(
    upstream_area_km2: float = 12.5,
    slope_degrees: float = 1.2,
    roughness: float = 0.035,
    rainfall_intensity_mm_hr: float = 15.0
) -> Dict[str, Any]:
    """
    Computes hydrological transit time of upstream catchment runoff.
    Based on kinematic wave time-of-concentration (Tc):
      Catchment length L ≈ 1.4 * (Area)^0.6 (Hack's Law)
      Tc ≈ 0.0663 * (L^0.77) / (Slope_fraction^0.385)
    """
    area = max(0.1, float(upstream_area_km2))
    slope_deg = max(0.1, min(60.0, float(slope_degrees)))
    slope_frac = math.tan(math.radians(slope_deg))
    
    # Hydraulic length in km
    length_km = 1.4 * (area ** 0.6)
    
    # Time of concentration in hours
    tc_hours = 0.0663 * (length_km ** 0.77) / (slope_frac ** 0.385)
    lag_hours = round(max(0.5, min(36.0, tc_hours)), 1)
    
    # Runoff coefficient (based on upstream terrain and antecedent moisture)
    runoff_coefficient = round(min(0.85, 0.35 + (0.01 * min(30.0, slope_deg))), 2)
    
    # Peak flow estimate in m^3/s (Rational Method: Q = C * I * A / 3.6)
    peak_flow_m3s = round((runoff_coefficient * rainfall_intensity_mm_hr * area) / 3.6, 2)
    
    # Surge severity tier
    if peak_flow_m3s >= 50.0 or (area >= 50.0 and rainfall_intensity_mm_hr >= 25.0):
        surge_tier = "CRITICAL UPSTREAM SURGE"
        surge_advisory = f"High upstream catchment volume ({area} km²) will surge downstream in ~{lag_hours} hours. Low-lying riverbeds will submerge."
    elif peak_flow_m3s >= 20.0 or (area >= 20.0 and rainfall_intensity_mm_hr >= 15.0):
        surge_tier = "SIGNIFICANT CATCHMENT INFLOW"
        surge_advisory = f"Catchment runoff wave will arrive in ~{lag_hours} hours. Prepare drainage diversions."
    elif peak_flow_m3s >= 5.0:
        surge_tier = "MODERATE RUNOFF INFLOW"
        surge_advisory = f"Minor upstream swell expected within ~{lag_hours} hours. Standard drainage capable."
    else:
        surge_tier = "MINIMAL UPSTREAM IMPACT"
        surge_advisory = "Upstream catchment flow within baseline channel absorption."

    return {
        "upstream_area_km2": area,
        "catchment_length_km": round(length_km, 2),
        "transit_time_hours": lag_hours,
        "peak_flow_m3s": peak_flow_m3s,
        "runoff_coefficient": runoff_coefficient,
        "surge_tier": surge_tier,
        "surge_advisory": surge_advisory
    }


def forecast_multi_horizon_timeline(
    input_data: PredictionInput,
    base_probability: float,
    upstream_area_km2: float = 15.0,
    rainfall_trend: str = "DECAYING" # "INTENSIFYING", "PERSISTENT", "DECAYING"
) -> Dict[str, Any]:
    """
    Simulates multi-horizon flood progression at +3h, +6h, +12h, +24h, and +48h horizons.
    Couples acute rainfall with upstream runoff transit lag and drainage dissipation.
    """
    horizons = [3, 6, 12, 24, 48]
    start_time = datetime.now()
    
    # Compute catchment transit characteristics
    catchment = calculate_catchment_lag(
        upstream_area_km2=upstream_area_km2,
        slope_degrees=getattr(input_data, 'slope', 1.5) or 1.5,
        rainfall_intensity_mm_hr=float(input_data.rainfall24h or 10.0) / 24.0
    )
    lag_hours = catchment["transit_time_hours"]
    
    drain_cap = float(input_data.drainageCapacity or 5.0)
    drainage_discharge_rate_mm_hr = drain_cap * 1.5 # mm per hour discharged
    
    forecast_points = []
    peak_horizon = 0
    max_prob = 0.0
    max_depth = 0.0
    
    r24_base = float(input_data.rainfall24h or 0.0)
    r72_base = float(input_data.rainfall72h or 0.0)
    
    for h in horizons:
        point_time = start_time + timedelta(hours=h)
        
        # 1. Rainfall Evolution
        if rainfall_trend == "INTENSIFYING":
            r_factor = 1.0 + (0.15 * math.sin(h / 6.0)) + (h / 48.0 * 0.3)
        elif rainfall_trend == "PERSISTENT":
            r_factor = 1.0 + (0.05 * math.cos(h / 8.0))
        else: # DECAYING
            r_factor = math.exp(-0.06 * h)
            
        future_r24 = max(0.0, r24_base * r_factor)
        
        # 2. Catchment Wave Arrival (Gaussian pulse centered around lag_hours)
        wave_width = max(3.0, lag_hours * 0.4)
        surge_impulse = math.exp(-0.5 * ((h - lag_hours) / wave_width) ** 2)
        surge_added_prob = surge_impulse * min(35.0, catchment["peak_flow_m3s"] * 0.8)
        
        # 3. Drainage Dissipation
        dissipation = min(40.0, (drainage_discharge_rate_mm_hr * h) / 10.0)
        
        # Net horizon probability
        h_prob = base_probability * (0.4 + 0.6 * r_factor) + surge_added_prob - (dissipation * 0.3)
        h_prob = round(max(1.0, min(99.0, h_prob)), 1)
        
        # Temporary input for physics calculation
        temp_input = PredictionInput(
            location=input_data.location,
            rainfall24h=future_r24,
            rainfall72h=max(future_r24, r72_base * (0.8 + 0.2 * r_factor)),
            elevation=input_data.elevation,
            humidity=input_data.humidity,
            drainageCapacity=input_data.drainageCapacity
        )
        
        physics = calculate_inundation_physics(temp_input, h_prob)
        risk_level, _, directive = classify_risk(h_prob)
        
        depth_val = physics["depth_meters"]
        tier_str = physics["tier_label"]

        if h_prob > max_prob:
            max_prob = h_prob
            peak_horizon = h
            max_depth = depth_val
            
        forecast_points.append({
            "horizon_hours": h,
            "horizon_label": f"+{h}h",
            "forecast_timestamp": point_time.strftime("%Y-%m-%d %H:%M"),
            "probability": h_prob,
            "risk_level": risk_level,
            "inundation_depth_meters": depth_val,
            "depth_tier": tier_str,
            "flow_velocity": physics["flow_velocity"],
            "life_safety_directive": directive,
            "surge_inflow_active": bool(surge_impulse > 0.4),
            "simulated_rainfall_mm": round(future_r24, 1)
        })

    return {
        "location": input_data.location or "Monitored Basin",
        "generated_at": start_time.strftime("%Y-%m-%d %H:%M:%S"),
        "rainfall_trend": rainfall_trend,
        "peak_threat_horizon": f"+{peak_horizon}h",
        "peak_probability": max_prob,
        "peak_depth_meters": max_depth,
        "catchment_hydrodynamics": catchment,
        "forecast_timeline": forecast_points
    }
