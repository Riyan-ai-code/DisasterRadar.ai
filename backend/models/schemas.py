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

# ==============================================================================
# CYCLONE INTELLIGENCE & MULTI-HAZARD SCHEMAS (PHASE 1)
# ==============================================================================

class DataProvenance(BaseModel):
    sourceName: str = Field(..., description="Primary meteorological data source")
    bulletinAuthority: str = Field("IMD RSMC New Delhi / WMO / GDACS", description="Authoritative meteorological agency")
    fetchedAt: str = Field(..., description="ISO-8601 UTC timestamp when data was retrieved")
    sourceIssuedAt: str = Field(..., description="ISO-8601 UTC timestamp when upstream bulletin was issued")
    dataAgeMinutes: int = Field(0, description="Age of upstream data in minutes")
    freshnessStatus: str = Field("LIVE_CURRENT", description="LIVE_CURRENT, DELAYED_CACHED, or STALE_ARCHIVE")
    isOfficialForecast: bool = Field(True, description="True if track/intensity is from official meteorological agency")
    isSimulatedOrHistorical: bool = Field(False, description="True if replaying historical archive event")
    disclaimer: str = Field(
        "Official cyclone track and intensity parameters sourced from WMO/GDACS/IMD bulletins. "
        "Geospatial exposure and ML Rapid Intensification scores are decision-support estimates.",
        description="Mandatory transparency and safety disclaimer"
    )

class CycloneTrackPoint(BaseModel):
    pointType: str = Field(..., description="OBSERVED or OFFICIAL_FORECAST")
    forecastHour: int = Field(0, description="0 for observed points; +12, +24, +48, +72, etc. for forecast")
    timestampUtc: str
    latitude: float
    longitude: float
    windSpeedKmh: float
    windSpeedKt: float
    pressureHpa: Optional[float] = 1000.0
    imdCategory: str = Field(..., description="Official IMD classification code: LPA, D, DD, CS, SCS, VSCS, ESCS, SuCS")
    imdClassification: str = Field(..., description="Full official IMD classification label")
    uncertaintyRadiusKm: float = Field(0.0, description="Forecast cone radius in km (0 for observed)")

class CycloneIntensityTrend(BaseModel):
    windChange12hKt: float = 0.0
    windChange24hKt: float = 0.0
    pressureChange12hHpa: float = 0.0
    rapidIntensificationActive: bool = Field(False, description="True if 24h wind increase >= 30 knots (55 km/h)")
    riProbabilityPercent: float = Field(0.0, description="Experimental XGBoost-SHIPS Rapid Intensification probability (0-100%)")
    riRiskTier: str = Field("LOW", description="LOW, MODERATE, HIGH, EXTREME")
    topShapDrivers: List[dict] = Field(default_factory=list, description="SHAP feature attributions for intensity change")

class CycloneEventSummary(BaseModel):
    id: str
    stormName: str
    basin: str = Field("BOB", description="BOB (Bay of Bengal), ARB (Arabian Sea), or NIO")
    basinFullName: str = "Bay of Bengal"
    seasonYear: int
    status: str = Field(..., description="ACTIVE, DISSIPATED, or HISTORICAL_ARCHIVE")
    imdCategory: str
    imdClassification: str
    maxSustainedWindKmh: float
    maxSustainedWindKt: float
    minCentralPressureHpa: Optional[float] = 998.0
    movementSpeedKmh: Optional[float] = 12.0
    movementDirectionDeg: Optional[float] = 330.0
    movementDirectionCardinal: Optional[str] = "NNW"
    currentLatitude: float
    currentLongitude: float
    distanceToIndianCoastKm: float
    nearestCoastalReference: str
    landfallLocation: Optional[str] = None
    landfallTimeUtc: Optional[str] = None
    peakRainfall24hMm: Optional[float] = None
    peakRainfall72hMm: Optional[float] = None
    affectedStates: List[str] = Field(default_factory=list)
    impactSummary: Optional[str] = None
    sourceAuthority: str
    lastBulletinUtc: str

class CoastalStationWindTelemetry(BaseModel):
    stationName: str
    state: str
    basin: str
    latitude: float
    longitude: float
    windSpeedKmh: float
    windGustsKmh: float
    windDirectionDeg: float
    surfacePressureHpa: float
    rainfall24hMm: float
    imdWindStatus: str

class ActiveCyclonesResponse(BaseModel):
    basinStatus: str = Field(..., description="ACTIVE_CYCLONIC_DISTURBANCE or CALM_BASIN")
    basinHeadline: str
    activeCount: int
    activeCyclones: List[CycloneEventSummary]
    coastalStationsTelemetry: List[CoastalStationWindTelemetry]
    provenance: DataProvenance

class CycloneDetailResponse(BaseModel):
    event: CycloneEventSummary
    observedTrack: List[CycloneTrackPoint]
    currentPosition: CycloneTrackPoint
    forecastTrack: List[CycloneTrackPoint]
    uncertaintyConeGeoJSON: Optional[dict] = None
    intensityTrend: CycloneIntensityTrend
    provenance: DataProvenance

class CoastalDistrictExposure(BaseModel):
    districtId: str
    districtName: str
    state: str
    coastBasin: str
    latitude: float
    longitude: float
    elevationM: float
    populationLakhs: float
    minTrackDistanceKm: float
    closestApproachTimestampUtc: str
    estimatedPeakWindKmh: float
    estimatedRainfall24hMm: float
    estimatedRainfall72hMm: float
    surgeVulnerabilityIndex: float = Field(..., description="Relative coastal bathymetry/low-elevation surge exposure index (0-100)")
    exposureScore: float = Field(..., description="Composite geographical exposure score (0-100)")
    exposureTier: str = Field(..., description="EXPOSURE_CRITICAL, EXPOSURE_HIGH, EXPOSURE_MODERATE, EXPOSURE_LOW")
    recommendedAction: str
    isValidatedImpactPrediction: bool = Field(
        False,
        description="Explicit flag: False indicates geographical exposure estimate, not a hydrodynamic storm-surge simulation"
    )

class CoastalExposureResponse(BaseModel):
    cycloneId: str
    stormName: str
    imdCategory: str
    criticalDistrictsCount: int
    highExposureDistrictsCount: int
    totalExposedPopulationLakhs: float
    districts: List[CoastalDistrictExposure]
    methodologyDisclaimer: str
    provenance: DataProvenance

class CompoundFloodRiskRequest(BaseModel):
    cycloneId: str
    districtId: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    locationName: Optional[str] = None
    elevationM: Optional[float] = None
    overrideRainfall24hMm: Optional[float] = None
    overrideRainfall72hMm: Optional[float] = None

class CompoundFloodRiskResponse(BaseModel):
    cycloneId: str
    stormName: str
    imdCategory: str
    targetLocation: str
    state: str
    latitude: float
    longitude: float
    elevationM: float
    distanceToTrackKm: float
    cycloneWindExposureKmh: float
    cycloneInducedRainfall24hMm: float
    cycloneInducedRainfall72hMm: float
    floodModelProbability: float = Field(..., description="Probability (0-100%) from existing 15-feature XGBoost+RF Flood Ensemble")
    floodModelRiskLevel: str
    surgeExposureTier: str
    compoundRiskScore: float = Field(..., description="Combined Multi-Hazard Cyclone + Flood + Coastal Low-Elevation Risk (0-100%)")
    compoundRiskLevel: str = Field(..., description="CRITICAL_COMPOUND, HIGH_COMPOUND, MODERATE_COMPOUND, LOW_COMPOUND")
    floodRiskFactors: List[RiskFactor]
    compoundDrivers: List[dict]
    operationalRecommendation: str
    integrationArchitectureNote: str
    provenance: DataProvenance



