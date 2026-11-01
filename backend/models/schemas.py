from pydantic import BaseModel, Field
from typing import List, Optional

class PredictionInput(BaseModel):
    rainfall24h: Optional[float] = Field(0.0, description="Rainfall in the last 24 hours in mm")
    rainfall72h: Optional[float] = Field(0.0, description="Cumulative rainfall in the last 72 hours in mm")
    temperature: Optional[float] = Field(25.0, description="Temperature in Celsius")
    humidity: Optional[float] = Field(60.0, description="Relative humidity in percentage")
    windSpeed: Optional[float] = Field(10.0, description="Wind speed in km/h")
    pressure: Optional[float] = Field(1013.0, description="Atmospheric pressure in hPa")
    elevation: Optional[float] = Field(15.0, description="Elevation above sea level in meters")
    latitude: Optional[float] = Field(12.97, description="Latitude coordinate")
    longitude: Optional[float] = Field(77.59, description="Longitude coordinate")
    location: Optional[str] = Field("Selected Location", description="Location name")
    slope: Optional[float] = Field(None, description="Terrain slope in degrees")
    twi: Optional[float] = Field(None, description="Topographic wetness index")
    ndwi: Optional[float] = Field(None, description="Normalized Difference Water Index")
    ndvi: Optional[float] = Field(None, description="Normalized Difference Vegetation Index")
    drainageCapacity: Optional[float] = Field(None, description="Drainage capacity score (1-10)")
    drainage_capacity: Optional[float] = Field(None, description="Drainage capacity score (1-10)")
    urbanizationIndex: Optional[float] = Field(None, description="Urbanization index score (1-10)")
    urbanization_index: Optional[float] = Field(None, description="Urbanization index score (1-10)")
    infrastructureDecay: Optional[float] = Field(None, description="Infrastructure decay score (1-10)")
    infrastructure_decay: Optional[float] = Field(None, description="Infrastructure decay score (1-10)")
    disasterUnpreparedness: Optional[float] = Field(None, description="Disaster unpreparedness score (1-10)")
    disaster_unpreparedness: Optional[float] = Field(None, description="Disaster unpreparedness score (1-10)")
    currentRainfall: Optional[float] = Field(None, description="Active instantaneous rainfall rate in mm/h")
    current_rainfall: Optional[float] = Field(None, description="Active instantaneous rainfall rate in mm/h")
    isRaining: Optional[bool] = Field(None, description="Active precipitation occurring at location")
    is_raining: Optional[bool] = Field(None, description="Active precipitation occurring at location")
    upstreamAreaKm2: Optional[float] = Field(None, description="Upstream catchment basin area in sq km")
    upstream_area_km2: Optional[float] = Field(None, description="Upstream catchment basin area in sq km")

class RiskFactor(BaseModel):
    name: str
    value: int
    color: str

class PredictionResponse(BaseModel):
    probability: float
    riskLevel: str
    riskClass: str
    recommendation: str
    location: str
    latitude: float
    longitude: float
    riskFactors: List[RiskFactor]
    timestamp: Optional[str] = Field(None, description="ISO timestamp of prediction generation")
    status: Optional[str] = Field("LIVE", description="Data status: LIVE | DELAYED | SIMULATED | UNAVAILABLE")
    telemetrySource: Optional[str] = Field("Open-Meteo Global NWP & Copernicus DEM", description="Telemetry data provider")
    inundationDepthMeters: Optional[float] = Field(0.0, description="Estimated physical water accumulation depth in meters")
    depthTier: Optional[str] = Field("Tier 0: Surface Runoff (< 5 cm)", description="Physical water depth classification")
    depthTierCode: Optional[str] = Field("TIER_0", description="Depth tier machine identifier: TIER_0 | TIER_1 | TIER_2 | TIER_3")
    flowVelocity: Optional[str] = Field("Stagnant Urban Ponding", description="Hydrological runoff velocity description")
    lifeSafetyDirective: Optional[str] = Field("SAFE: Conditions normal. Keep drains clear.", description="Physical depth-informed emergency action directive")
    missingMeasurements: Optional[List[str]] = Field(default_factory=list, description="List of unobserved/missing telemetry inputs")

class StationData(BaseModel):
    name: str
    lat: float
    lng: float
    risk: str
    level: str
    prob: float
    r24: float
    r72: float
    elev: float
    temp: float
    hum: float
    source: Optional[str] = Field("Open-Meteo Global NWP & Copernicus DEM", description="Origin of station telemetry")
    last_updated: Optional[str] = Field(None, description="Timestamp of telemetry acquisition")
    status: Optional[str] = Field("LIVE", description="Station operational status: LIVE | DELAYED | SIMULATED | UNAVAILABLE")
    missing_measurements: Optional[List[str]] = Field(default_factory=list, description="List of missing sensor parameters")
    inundationDepthMeters: Optional[float] = Field(0.0, description="Estimated surface water depth in meters")
    depthTier: Optional[str] = Field("Tier 0: Surface Runoff", description="Physical depth tier for this station")

class ConfusionMatrix(BaseModel):
    actualNoFlood_predictedNoFlood: int
    actualNoFlood_predictedFlood: int
    actualFlood_predictedNoFlood: int
    actualFlood_predictedFlood: int

class ModelMetrics(BaseModel):
    modelName: str
    accuracy: float
    precision: float
    recall: float
    f1Score: float
    rocAuc: float
    confusionMatrix: ConfusionMatrix

class RecentPrediction(BaseModel):
    time: str
    location: str
    probability: float
    riskLevel: str
    status: Optional[str] = Field("LIVE_AUDIT", description="LIVE_AUDIT or DEMO_AUDIT")
    depthTier: Optional[str] = Field(None, description="Physical depth tier")

class ModelPrediction(BaseModel):
    modelId: str
    modelName: str
    probability: float
    riskLevel: str
    riskClass: str
    recommendation: str

class PredictionCompareResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    predictions: List[ModelPrediction]
    agreement: str
    probabilityDelta: float

class ActiveAlertItem(BaseModel):
    id: str
    location: str
    latitude: float
    longitude: float
    probability: float
    riskLevel: str
    alertTier: str
    headline: str
    actionRequired: str
    rainfall24h: float
    rainfall72h: float
    waterDepthEstCm: float
    timestamp: str
    status: Optional[str] = "ACTIVE"
    deliveryStatus: Optional[str] = "DELIVERED"
    channels: Optional[List[str]] = Field(default_factory=lambda: ["SMS", "WhatsApp", "CAP"])
    citizenConfirms: Optional[int] = 0
    citizenAssistanceNeeded: Optional[int] = 0
    triggerFactors: Optional[List[dict]] = None

class CitizenAcknowledgeRequest(BaseModel):
    citizen_status: str = Field(..., description="SAFE | CONFIRMED_FLOOD_ON_GROUND | NEED_ASSISTANCE")
    comments: Optional[str] = None
    device_id: Optional[str] = None

class AlertsListResponse(BaseModel):
    totalActive: int
    threshold: float
    alerts: List[ActiveAlertItem]
    generatedAt: str

class CitizenReportCreate(BaseModel):
    location: str
    latitude: float
    longitude: float
    waterDepthCm: float = Field(..., ge=0, le=1000)
    severity: str = Field("MODERATE", description="LOW, MODERATE, HIGH, CRITICAL")
    description: str
    reporterName: Optional[str] = "Anonymous Citizen"
    photoUrl: Optional[str] = None

class CitizenReportResponse(BaseModel):
    id: int
    timestamp: str
    location: str
    latitude: float
    longitude: float
    waterDepthCm: float
    severity: str
    description: str
    reporterName: str
    photoUrl: Optional[str]
    status: str

class TelemetryIngestRequest(BaseModel):
    stationId: str
    stationName: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rainfall24h: float
    rainfall72h: float
    elevation: Optional[float] = 15.0
    waterLevelMeters: float = 0.0
    temperature: Optional[float] = 26.0
    humidity: Optional[float] = 75.0
    status: Optional[str] = "ONLINE"

class TelemetryIngestResponse(BaseModel):
    status: str
    stationId: str
    recordedAt: str
    evaluatedRiskProbability: float
    evaluatedRiskLevel: str

class UserRegisterRequest(BaseModel):
    email: str
    password: str
    fullName: Optional[str] = "Citizen User"

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    fullName: str
    createdAt: str

class AuthTokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    user: UserResponse

class AssistantChatRequest(BaseModel):
    prompt: str
    telemetry: Optional[dict] = None
    history: Optional[List[dict]] = None
    apiKey: Optional[str] = None

class TimelineHorizonPoint(BaseModel):
    horizon_hours: int
    horizon_label: str
    forecast_timestamp: str
    probability: float
    risk_level: str
    inundation_depth_meters: float
    depth_tier: str
    flow_velocity: str
    life_safety_directive: str
    surge_inflow_active: bool
    simulated_rainfall_mm: float

class CatchmentHydrodynamics(BaseModel):
    upstream_area_km2: float
    catchment_length_km: float
    transit_time_hours: float
    peak_flow_m3s: float
    runoff_coefficient: float
    surge_tier: str
    surge_advisory: str

class TimelineForecastRequest(BaseModel):
    input_data: PredictionInput
    upstreamAreaKm2: Optional[float] = 15.0
    rainfallTrend: Optional[str] = "DECAYING"

class TimelineForecastResponse(BaseModel):
    location: str
    generated_at: str
    rainfall_trend: str
    peak_threat_horizon: str
    peak_probability: float
    peak_depth_meters: float
    catchment_hydrodynamics: CatchmentHydrodynamics
    forecast_timeline: List[TimelineHorizonPoint]

