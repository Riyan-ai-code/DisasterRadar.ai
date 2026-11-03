"""
Shared Hydrological Feature Engineering
Builds the 15-feature vector consumed by every model (XGBoost, Random Forest,
FloodNet) from the same raw telemetry inputs, and applies the shared decision
thresholds so predictions across models stay directly comparable.
"""

import math
from models.schemas import PredictionInput, RiskFactor


def build_feature_row(params: PredictionInput) -> dict:
    r24 = max(0.0, float(params.rainfall24h if params.rainfall24h is not None else 0.0))
    r72 = max(0.0, float(params.rainfall72h if params.rainfall72h is not None else 0.0))

    # Use actual telemetry values without artificial inflation

    hum = max(0.0, min(100.0, float(params.humidity if params.humidity is not None else 60.0)))
    elev = max(0.0, float(params.elevation if params.elevation is not None else 15.0))

    # Slope: respect parameter or calculate based on natural elevation
    # Floodplains & coastal lowlands have low slope (0.2° - 0.8°); hills have steeper slope
    if getattr(params, 'slope', None) is not None and params.slope is not None:
        slope = round(max(0.01, min(89.0, float(params.slope))), 2)
    else:
        slope = round(max(0.2, min(25.0, 0.25 + (elev / 250.0))), 2)

    slope_rad = math.radians(max(0.05, slope))
    
    # Topographic Wetness Index (TWI)
    if getattr(params, 'twi', None) is not None and params.twi is not None:
        twi = round(float(params.twi), 2)
    else:
        try:
            twi = round(math.log(max(10.0, (100.0 - min(elev, 95.0)) * 5.0) / max(0.01, math.tan(slope_rad))), 2)
            twi = max(0.1, min(15.0, twi))
        except Exception:
            twi = 2.5

    # Remote sensing spectral indices (NDWI, NDVI)
    if getattr(params, 'ndwi', None) is not None and params.ndwi is not None:
        ndwi = round(float(params.ndwi), 3)
    else:
        ndwi = round(max(-0.6, min(0.6, (hum - 50.0) / 75.0)), 3)

    if getattr(params, 'ndvi', None) is not None and params.ndvi is not None:
        ndvi = round(float(params.ndvi), 3)
    else:
        ndvi = round(max(0.1, min(0.85, 0.55 - (r24 / 400.0))), 3)

    # Socioeconomic & Infrastructure Proxies
    drain_cap_param = getattr(params, 'drainageCapacity', None) or getattr(params, 'drainage_capacity', None)
    drainage_capacity = round(float(drain_cap_param), 1) if drain_cap_param is not None else 4.5

    urban_param = getattr(params, 'urbanizationIndex', None) or getattr(params, 'urbanization_index', None)
    urbanization_index = round(float(urban_param), 1) if urban_param is not None else 7.0

    decay_param = getattr(params, 'infrastructureDecay', None) or getattr(params, 'infrastructure_decay', None)
    infrastructure_decay = round(float(decay_param), 1) if decay_param is not None else 5.5

    unprep_param = getattr(params, 'disasterUnpreparedness', None) or getattr(params, 'disaster_unpreparedness', None)
    disaster_unpreparedness = round(float(unprep_param), 1) if unprep_param is not None else 5.5

    precip_ratio = round(r72 / (r24 + 1.0), 3)
    # Physically, surface ponding requires precipitation. In dry conditions, ponding represents residual or baseline susceptibility.
    rain_weight = min(1.0, (r24 * 1.5 + r72 * 0.4) / 25.0) if (r24 > 0.0 or r72 > 5.0) else 0.05
    raw_ponding = float((100.0 - min(elev, 100.0)) / (slope + 0.1))
    ponding_hazard = round(min(100.0, max(0.0, raw_ponding * rain_weight)), 3)
    water_contrast = round(ndwi - ndvi, 3)
    drainage_stress = round(r24 / (drainage_capacity * 10.0), 3)

    return {
        'rainfall_24h': r24,
        'rainfall_72h': r72,
        'elevation': elev,
        'slope': slope,
        'twi': twi,
        'ndwi': ndwi,
        'ndvi': ndvi,
        'drainage_capacity': drainage_capacity,
        'urbanization_index': urbanization_index,
        'infrastructure_decay': infrastructure_decay,
        'disaster_unpreparedness': disaster_unpreparedness,
        'precip_ratio': precip_ratio,
        'ponding_hazard': ponding_hazard,
        'water_contrast': water_contrast,
        'drainage_stress': drainage_stress,
    }


def classify_risk(prob_percent: float) -> tuple[str, str, str]:
    """Shared decision tiers so every model's output maps to the same advisory language."""
    if prob_percent >= 70.0:
        return (
            "CRITICAL", "high",
            "EMERGENCY: High likelihood of inundation. Low-lying basements and underpasses flooding imminent. Deploy NDRF and dewatering pumps."
        )
    elif prob_percent >= 50.0:
        return (
            "HIGH", "high",
            "WARNING: Heavy storm runoff exceeding storm drain capacity. Issue citizen safety alert and clear blocked culverts."
        )
    elif prob_percent >= 30.0:
        return (
            "MODERATE", "moderate",
            "CAUTION: Water accumulation likely at known chronic bottlenecks. Municipal road crews should inspect drains."
        )
    else:
        return (
            "LOW", "low",
            "SAFE: Environmental conditions well within absorption thresholds. Continue routine hydrological monitoring."
        )


def compute_risk_factors(params: PredictionInput) -> list[RiskFactor]:
    r24 = float(params.rainfall24h)
    r72 = float(params.rainfall72h)
    hum = float(params.humidity)
    elev = float(params.elevation)

    denom = r72 + r24 + hum + 50.0
    factor_72h = min(50, round((r72 / denom) * 68.0))
    factor_24h = min(40, round((r24 / denom) * 52.0))
    factor_hum = min(25, round((hum / 100.0) * 15.0))
    factor_elev = min(20, round(max(0, 1100 - elev) / 1100 * 12.0))
    factor_temp = 8

    return [
        RiskFactor(name="Rainfall (72h)", value=max(5, factor_72h), color="#ef4444"),
        RiskFactor(name="Rainfall (24h)", value=max(4, factor_24h), color="#f97316"),
        RiskFactor(name="Humidity", value=max(3, factor_hum), color="#eab308"),
        RiskFactor(name="Elevation", value=max(2, factor_elev), color="#a3e635"),
        RiskFactor(name="Temperature", value=factor_temp, color="#84cc16"),
    ]


def calculate_inundation_physics(params: PredictionInput, prob_percent: float) -> dict:
    """
    Hydrological physical inundation depth and velocity estimation.
    Translates raw statistical probability, acute precipitation, elevation, and terrain slope
    into tangible physical flood depths, impact tiers, and life-safety directives.
    """
    r24 = max(0.0, float(params.rainfall24h if params.rainfall24h is not None else 0.0))
    r72 = max(0.0, float(params.rainfall72h if params.rainfall72h is not None else 0.0))
    elev = max(0.0, float(params.elevation if params.elevation is not None else 15.0))
    slope = max(0.1, float(params.slope if params.slope is not None else 1.5))
    drainage_cap = float(
        getattr(params, 'drainageCapacity', None) or 
        getattr(params, 'drainage_capacity', None) or 4.5
    )

    # Physical accumulation model:
    # Low-elevation basins (<25m) with flat slopes (<1.0 deg) suffer ponding surcharge
    ponding_factor = max(0.2, min(3.0, (40.0 - min(elev, 38.0)) / 12.0))
    slope_retention = max(0.3, min(2.5, 2.0 / (slope + 0.5)))
    drainage_relief = max(0.5, drainage_cap / 5.0)

    if prob_percent >= 75.0 or (r24 > 120.0 and elev < 25.0):
        raw_depth = 0.55 + ((r24 - 50.0) * 0.008 * ponding_factor * slope_retention) / drainage_relief + (prob_percent - 70.0) * 0.015
        depth_m = round(min(3.2, max(0.50, raw_depth)), 2)
        tier_code = "TIER_3"
        tier_label = "Tier 3: Structural / Waist Submergence (> 0.5m - 2.5m+)"
        directive = "MANDATORY VERTICAL EVACUATION: Ground floors, basements, and subterranean electrical rooms submerging. Move immediately to 2nd floor or concrete roof. NEVER walk or drive through water. Call Emergency 112 for swift-water boat rescue."
    elif prob_percent >= 50.0 or r24 >= 60.0:
        raw_depth = 0.16 + ((r24 - 30.0) * 0.0035 * ponding_factor) / drainage_relief + (prob_percent - 50.0) * 0.008
        depth_m = round(min(0.49, max(0.15, raw_depth)), 2)
        tier_code = "TIER_2"
        tier_label = "Tier 2: Knee Depth (15–45 cm)"
        directive = "HIGH DANGER: Swift water active. Passenger cars lose tire traction and float in 30cm of water. Engine air intake hydraulic lock imminent. Turn around, do not cross flooded underpasses. Disconnect ground floor power."
    elif prob_percent >= 28.0 or r24 >= 25.0:
        raw_depth = 0.05 + ((r24 - 15.0) * 0.002) + (prob_percent - 25.0) * 0.003
        depth_m = round(min(0.14, max(0.05, raw_depth)), 2)
        tier_code = "TIER_1"
        tier_label = "Tier 1: Ankle Depth (5–15 cm)"
        directive = "CAUTION: Water accumulation in roadside gutters and low intersections. Slow vehicular traffic. Check roadside storm drains for trash blockages."
    else:
        depth_m = round(max(0.0, (r24 * 0.001)), 2)
        tier_code = "TIER_0"
        tier_label = "Tier 0: Surface Runoff (< 5 cm)"
        directive = "SAFE: Environmental moisture within normal infiltration capacity. Continue routine monitoring."

    # Flow velocity estimation:
    if slope >= 3.5:
        velocity_desc = "High-Velocity Swift Runoff (Severe wash-away hazard)"
    elif slope >= 1.2:
        velocity_desc = "Moderate Channelized Drainage Runoff"
    else:
        velocity_desc = "Stagnant Urban Ponding / Low Infiltration Surcharge"

    return {
        "depth_meters": depth_m,
        "tier_code": tier_code,
        "tier_label": tier_label,
        "flow_velocity": velocity_desc,
        "life_safety_directive": directive
    }


def detect_missing_measurements(params: PredictionInput) -> list[str]:
    """Identifies which hydrological telemetry parameters were unmeasured or defaulted."""
    missing = []
    if params.rainfall24h is None:
        missing.append("rainfall24h")
    if params.rainfall72h is None:
        missing.append("rainfall72h")
    if params.elevation is None:
        missing.append("elevation")
    if getattr(params, 'slope', None) is None:
        missing.append("slope")
    if getattr(params, 'ndwi', None) is None:
        missing.append("ndwi")
    if getattr(params, 'drainageCapacity', None) is None and getattr(params, 'drainage_capacity', None) is None:
        missing.append("drainage_capacity")
    return missing
