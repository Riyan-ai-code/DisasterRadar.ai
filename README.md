# 🌊 DisasterRadar.ai — AI-Powered Multi-Hazard Disaster Intelligence Platform

> **AI-Powered Flood Prediction, Cyclone Tracking, Geospatial Risk Assessment, NLP SOS Triage, GenAI SOP RAG & Production MLOps Platform**  
> An end-to-end multi-hazard emergency operations command center (`EOC-v2.5`) integrating satellite hydrology (MODIS & Copernicus DEM), ensemble machine learning (**Super-Stack RF + XGBoost**), deep learning (**PyTorch FloodNet**), **North Indian Ocean Cyclone Tracking (IMD / GDACS / IBTrACS)**, **NLP SOS Distress Intelligence**, **GenAI & NDMA/IMD SOP Knowledge RAG**, and **Production MLOps (PSI/KS Drift Detection + Prometheus/Grafana)** for real-time disaster forecasting and evacuation decision support.

[![GitHub Repo](https://img.shields.io/badge/GitHub-Shashank101--aiml%2FDisasterRadar.ai-blue?logo=github)](https://github.com/Shashank101-aiml/DisasterRadar.ai)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12+-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+%20%7C%20Vite-61DAFB?logo=react)](https://react.dev/)
[![XGBoost](https://img.shields.io/badge/XGBoost-1.7+-eb3434?logo=xgboost)](https://xgboost.readthedocs.io/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?logo=pytorch)](https://pytorch.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose%20%7C%20Prometheus-2496ED?logo=docker)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Table of Contents
1. [Overview & Core Capabilities](#-overview--core-capabilities)
2. [Phased Project Roadmap](#-phased-project-roadmap)
3. [Platform Views & Key Modules](#-platform-views--key-modules)
4. [System Architecture](#-system-architecture)
5. [Machine Learning Models & Performance](#-machine-learning-models--performance)
6. [Generative AI, NLP SOS Triage & Disaster Knowledge RAG](#-generative-ai-nlp-sos-triage--disaster-knowledge-rag)
7. [Datasets & Hydrological Feature Schema](#-datasets--hydrological-feature-schema)
8. [Interactive Jupyter Notebooks](#-interactive-jupyter-notebooks)
9. [Quick Start: How to Run This Project Locally](#-quick-start-how-to-run-this-project-locally)
10. [Automated Testing](#-automated-testing)
11. [API Reference (FastAPI)](#-api-reference-fastapi)
12. [Project Directory Structure](#-project-directory-structure)
13. [Git Workflow & Remote Pushing](#-git-workflow--remote-pushing)

---

## 🎯 Overview & Core Capabilities

**DisasterRadar.ai** provides municipal authorities, disaster response teams (**NDRF / SDRF / DDMA**), meteorologists, urban planners, and citizens with real-time, explainable multi-hazard forecasting and emergency dispatch support:

- 🔬 **Super-Stack Flood Risk Engine**: Multi-model ML pipeline combining a **Calibrated Super-Stack Ensemble (`60% Random Forest + 40% Native XGBoost`, `93.85%` accuracy, `0.9820` ROC-AUC)**, standalone **Native XGBoost** (`91.47%` accuracy, `92.75%` recall), **Native JSON Random Forest** (`93.59%` recall, zero pickle), and a deep **PyTorch `FloodNet`** residual neural network.
- 🌀 **North Indian Ocean Cyclone & Coastal Risk Intelligence**: Live tracking across the **Bay of Bengal (`BOB`)** and **Arabian Sea (`ARB`)** using official **IMD 3-minute sustained wind classifications** (`D` to `SuCS`), RSMC uncertainty cones, **XGBoost-SHIPS Rapid Intensification (RI)** probability, 28-district coastal exposure scoring, historical best-track replay (*Cyclone Arnab 2026*, *Remal 2024*, *Dana 2024*, *Michaung 2023*, *Biparjoy 2023*, *Tauktae 2021*, *Amphan 2020*, *Fani 2019*), and a validated **Compound Cyclone-to-Flood Super-Stack Bridge**.
- 💡 **Explainable AI (TreeSHAP) & Counterfactual Simulation**: Real-time local & global **TreeSHAP** feature attribution, interactive *"What-If"* drainage/rainfall sensitivity simulations, and high-ground shelter routing.
- 🆘 **NLP SOS Distress Triage & GenAI NDMA/IMD SOP Knowledge RAG**: Automated multi-class SOS distress classification (`CRITICAL_P1` to `LOW_P4`), Named Entity Recognition (NER) for extracting stranded victim locations, GPS coordinates, water depth (`cm`), and vulnerable groups, paired with a **Hybrid TF-IDF + Okapi BM25 RAG Engine** indexing official **NDMA, IMD, INCOIS, and NDRF SOP manuals** and a conversational **Google Gemini FloodRisk Copilot**.
- 🗺️ **3D World Globe, Live Doppler Radar & Offline Evacuation GIS**: Interactive 3D globe and 2D Leaflet risk maps with live **Open-Meteo** satellite meteorology, **RainViewer 500m Doppler Weather Radar**, OpenStreetMap high-ground shelter scraping, and **CAP 1.2** authority alert transmission.
- ⚙️ **Production MLOps & Continuous Learning**: Multi-stage **Docker & Docker Compose** stack, automated 15-feature **Population Stability Index (PSI)** and **Kolmogorov-Smirnov (KS)** drift detection, one-click continuous learning & ensemble weight calibration, and **Prometheus / Grafana** OpenMetrics telemetry (`/api/metrics/prometheus`).

---

## 🗺️ Phased Project Roadmap

| Phase | Title | Key Deliverables & Milestones | Status |
| :---: | :--- | :--- | :---: |
| **Phase 1** | **Core ML & Hydrological Modeling** | Unified 1M+ MODIS & environmental data pipeline, 15 standardized features, Super-Stack Ensemble (`0.9820` ROC-AUC), Native XGBoost (`91.47%` acc, `0.9676` ROC-AUC, 349 trees), Native JSON Random Forest, PyTorch `FloodNet` deep neural network, notebooks 01–05, and automated pytest suite. | **Completed** ✅ |
| **Phase 2** | **AI Explainer & Evacuation Intelligence** | Project 7 (CO4 \| L6) audit fulfillment: interactive TreeSHAP local waterfall & global importance, counterfactual "What-If" simulation engine, and NDRF/SDRF shelter evacuation route planning. | **Completed** ✅ |
| **Phase 3** | **Geospatial GIS Atlas & Telemetry** | 3D World Globe & Mira Bhayandar 5-tier vulnerability choropleth, rail corridors, storm outfalls, live Open-Meteo & RainViewer Doppler radar streaming, and coastal observatory monitoring. | **Completed** ✅ |
| **Phase 4** | **Operational Dashboard & Dispatch Alerts** | Responsive React + Vite multi-view command center with user-resizable/collapsible sidebar, real-time CAP 1.2 hazard bulletins, severity filtering (`Critical` to `Advisory`), citizen ground-truth reporting, and CSV dispatch exports. | **Completed** ✅ |
| **Phase 5** | **Cyclone Tracking & Compound Flood Risk Engine** | Live North Indian Ocean (Bay of Bengal & Arabian Sea) cyclone tracking, IMD 3-min wind scale, RSMC uncertainty cone GIS, 28-district coastal exposure matrix, historical cyclone replay (including *Cyclone Arnab*, *Remal*, *Dana*, *Michaung*, *Biparjoy*, *Tauktae*, *Amphan*, *Fani*), and validated Cyclone-to-Flood ensemble bridge. | **Completed** ✅ |
| **Phase 6** | **NLP SOS Intelligence & NDMA/IMD SOP Knowledge RAG** | Social media SOS / distress post classification (`LIFE_THREATENING_SOS` to `LOW_P4`), Named Entity Recognition (NER) for extracting stranded victim locations & GPS coordinates, automated 0–100 urgency scoring, and Hybrid TF-IDF + BM25 RAG indexing official NDMA/IMD/INCOIS/NDRF SOP manuals. | **Completed** ✅ |
| **Phase 7** | **Production MLOps & Continuous Learning** | Docker multi-stage containerization (`Dockerfile`, `docker-compose.yml`), automated 15-feature PSI & Kolmogorov-Smirnov model drift detection, automated continuous learning & ensemble weight retraining pipeline, and Prometheus/Grafana OpenMetrics system health telemetry (`/api/metrics/prometheus`). | **Completed** ✅ |

---

## 🖥️ Platform Views & Key Modules

The React Command Operating Center features a **user-resizable (`76px–420px`) and collapsible sidebar** with **10 specialized operational studios** plus a floating **FloodRisk Copilot AI Assistant**:

### 1. 🏠 Executive Dashboard (`App.jsx` / `HeroSection.jsx` / `TopMetrics.jsx`)
- **Donut Risk Gauge & Guardian Intelligence Banner**: Instant visual indicator of flood inundation probability, risk classification (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`), and active location telemetry.
- **Dynamic Location Switcher**: Seamless toggle between GPS **My Location** (e.g., *Kharupetia, Assam* or *Mira Bhayandar, Maharashtra*) and **Explore Other Location** with live Open-Meteo weather & Copernicus DEM elevation lookup.
- **Interactive Risk Map & Recent Predictions Ledger**: Spatial hazard visualization and auditable history of evaluated predictions.

### 2. ⚡ Predict Risk Studio (`PredictRiskView.jsx`)
- Interactive parameter sliders across **all 15 environmental, hydrological, and municipal factors** (`rainfall_24h`, `rainfall_72h`, `elevation`, `ndwi`, `ndvi`, `twi`, `slope`, `drainage_capacity`, etc.).
- Quick-fill scenario presets: *Extreme Monsoon / Flash Flood*, *High Tide Surge*, *Urban Drainage Failure*, and *Normal Dry Weather*.
- Instant calculation of calibrated ensemble probability, estimated water depth (`cm`), and municipal action items.

### 3. 🌀 Cyclone & Coastal Risk Center (`CycloneMonitorView.jsx`)
- **Live NIO Basin Watch & Verified IMD Archive**: Monitors live Bay of Bengal and Arabian Sea cyclonic disturbances via GDACS + Open-Meteo Maritime observatories, alongside 8 verified historical cyclones (**ARNAB 2026**, **REMAL 2024**, **DANA 2024**, **BIPARJOY 2023**, **MICHAUNG 2023**, **TAUKTAE 2021**, **AMPHAN 2020**, **FANI 2019**).
- **Interactive Trajectory & RSMC Uncertainty Cone GIS**: Displays observed best-track points, `+12h / +24h / +36h / +48h` official forecast tracks, RSMC cone of uncertainty polygons, 34/50/64-knot wind radii, and 500m Doppler radar overlays.
- **XGBoost-SHIPS Rapid Intensification (RI) & 28-District Coastal Exposure Matrix**: Evaluates 24-hour rapid intensification probability and ranks 28 Indian coastal districts by track proximity, peak radial wind, rainband accumulation, and surge vulnerability.
- **Compound Cyclone-to-Flood Super-Stack Bridge**: Evaluates compound multi-hazard risk by feeding cyclone-induced 24h/72h rainband rainfall and coastal elevation into the 15-feature Flood Ensemble and combining it with vortex wind and tidal outfall backwater impedance.

### 4. 🌐 3D World Globe & GIS Atlas (`WorldGlobeView.jsx`)
- Interactive 3D planetary globe and regional GIS layers with real-time precipitation, surface pressure, wind vectors, and flood vulnerability choropleths.

### 5. 🛡️ Offline Evacuation & Roads (`OfflineSafetyView.jsx`)
- **Live OpenStreetMap High-Ground Shelter Discovery**: Scrapes certified hospitals, multi-story schools/colleges, and municipal relief camps around the user's coordinates and queries Open-Meteo DEM for exact elevation clearance (`m MSL`).
- **Nearest Emergency Authorities & CAP 1.2 Alert Dispatch**: Resolves nearest NDRF, Fire & Rescue, Police, and District Emergency Operations Centers (DEOC) with one-click **CAP 1.2 (Common Alerting Protocol)** distress beacon transmission.

### 6. 🗓️ Historical Disaster Atlas (`HistoricalTwinView.jsx`)
- Digital-twin replay of major historical Indian flood and cloudburst events with hydrological parameter comparisons and infrastructure stress diagnostics.

### 7. 📊 Model Performance & MLOps Studio (`ModelPerformanceView.jsx`)
- **6 Specialized Sub-Tabs**:
  1. `🎚️ Decision Threshold & Confusion Matrix`: Interactive cutoff slider (`0.10–0.90`) dynamically updating TP, TN, FP, FN, Precision, Recall, and F1-Score across 12,417 validation instances.
  2. `📈 Interactive ROC & PR Curves`: High-resolution SVG ROC (`AUC = 0.9820` ensemble / `0.9676` XGBoost) and Precision-Recall (`PR-AUC = 0.9602`) curves.
  3. `🔬 15-Feature SHAP Explainability`: Category-filterable global `|SHAP|` impact bar charts and physical/hydrological partial-dependence deep dives.
  4. `⚔️ Multi-Model Comparison & Radar`: Side-by-side benchmark matrix and 5-axis radar chart comparing **Super-Stack Ensemble**, **XGBoost**, **Random Forest**, **LightGBM**, **PyTorch FloodNet**, and **Logistic Regression**.
  5. `🧪 Live Latency & Inference Sandbox`: Real-time microsecond execution benchmark (`~1.8 ms`).
  6. `⚙️ MLOps, Drift & Continuous Learning (Phase 7)`: Live 15-feature **PSI & KS Drift Monitor**, monsoon regime-shift simulator, one-click **Automated Retraining & Version Promotion** (`v2.5.0-prod` → `v2.5.1-prod`), and live **Prometheus OpenMetrics** viewer.

### 8. 🔔 Early Warning & Multi-Hazard Alerts (`AlertsReportsView.jsx`)
- Unified `ALL`, `FLOOD`, and `CYCLONE` alert feed with 7-day chronological telemetry ledgers, rainfall elasticity/sensitivity tables (`+10mm` to `+100mm`), and downloadable CSV dispatch manifests.

### 9. 🧠 Explainable AI, NLP SOS Triage & NDMA SOP RAG (`AiExplainerView.jsx`)
- **Local TreeSHAP Waterfall & Counterfactual What-If Simulator**: Quantifies per-feature probability contributions and infrastructure upgrade ROI.
- **🆘 NLP SOS Triage & NDMA/IMD SOP Knowledge RAG (Phase 6)**:
  - **Live NLP SOS Distress Analyzer & Priority Dispatch Queue**: Extracts stranded locations, GPS coordinates, water depth (`cm`), headcount, and vulnerable groups (`Infants`, `Elderly`, `Medical Oxygen/Dialysis`) and assigns a `0–100` urgency score (`CRITICAL_P1` to `LOW_P4`).
  - **Hybrid TF-IDF + BM25 SOP RAG Search**: Retrieves official clauses from **NDMA, IMD, INCOIS, and NDRF SOP manuals** and synthesizes an actionable Incident Commander briefing.

### 10. 🏛️ System Architecture Blueprint (`ArchitectureView.jsx`)
- Interactive visual documentation of the end-to-end data ingestion, feature engineering, ensemble ML inference, geospatial routing, and MLOps telemetry pipelines.

---

## 🏛️ System Architecture

```text
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                         LIVE SATELLITE, METEOROLOGICAL & CITIZEN DATA                     │
│  • MODIS Terra/Aqua & Copernicus DEM (1,048,575 training records, 15 features)            │
│  • Open-Meteo Live Weather & Maritime Network  • RainViewer 500m Doppler Weather Radar    │
│  • GDACS / WMO / IMD RSMC & NOAA IBTrACS Cyclone Bulletins  • OpenStreetMap Nominatim     │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                     MULTI-HAZARD ML, DL, CYCLONE, NLP & RAG ENGINES                       │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────┐ │
│  │  HYDROLOGICAL FLOOD MODELS   │  │   CYCLONE & COASTAL MODELS   │  │ NLP, RAG & GENAI │ │
│  │ • Super-Stack (60% RF+40%XGB)│  │ • IMD 3-Min Wind Scale Engine│  │ • SOS Distress   │ │
│  │   ROC-AUC: 0.9820 | Acc:93.8%│  │ • XGBoost-SHIPS Rapid        │  │   Classifier+NER │ │
│  │ • Native XGBoost (349 trees) │  │   Intensification (RI) Model │  │ • Hybrid TF-IDF +│ │
│  │   ROC-AUC: 0.9676 | Acc:91.5%│  │ • Holland (1980) Vortex Wind │  │   BM25 SOP RAG   │ │
│  │ • Native JSON Random Forest  │  │   & Rainband Decay Envelope  │  │ • Gemini 1.5     │ │
│  │ • PyTorch FloodNet Residual  │  │ • Compound Cyclone-to-Flood  │  │   Flash +        │ │
│  │ • TreeSHAP Attribution Engine│  │   Super-Stack Bridge         │  │   HydroNet 2.0   │ │
│  └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                    FASTAPI ASYNC BACKEND + SQLITE WAL + PHASE 7 MLOPS                     │
│  • /api/predict  • /api/cyclone/*  • /api/nlp/*  • /api/rag/*  • /api/geospatial/*        │
│  • /api/mlops/drift-check (15-Feature PSI & KS)  • /api/mlops/retrain (Auto-Calibration)  │
│  • /api/metrics/prometheus (Prometheus 0.0.4 Exporter)  • SQLite Audit & Telemetry Store  │
└─────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│              REACT 18 + VITE FRONTEND COMMAND CENTER & DOCKER / GRAFANA STACK             │
│  • 10 Interactive Operational Views  • Resizable Sidebar  • Leaflet & 3D Globe GIS        │
│  • Docker Multi-Stage Container (`Dockerfile`) + Prometheus (`:9090`) + Grafana (`:3000`) │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```
```

---

## 🧠 Machine Learning Models & Performance

Every model in **DisasterRadar.ai** is purpose-built for a specific operational task and serialized in safe, portable formats (**Native JSON** and **PyTorch `.pt` state dicts** — **strictly zero unsafe Python pickle files**).

### Summary of All ML, DL, Physics-Hybrid & Statistical Models Used

| # | Model Name | Implementation & Artifact | Primary Purpose in DisasterRadar.ai |
| :-: | :--- | :--- | :--- |
| **1** | **Super-Stack Soft-Voting Ensemble (`60% RF + 40% XGBoost` + Isotonic Calibration)** | [`backend/services/ensemble_predictor.py`](backend/services/ensemble_predictor.py)<br>[`models/ensemble_metrics.json`](models/ensemble_metrics.json) | **Primary Production Flood Engine (`v2.5.0-prod`):** Combines variance-reducing Random Forest bagging (`0.60`) with bias-reducing XGBoost boosting (`0.40`) and Platt/Isotonic calibration (`T* = 0.55`) to achieve **`93.85%` Accuracy**, **`0.9820` ROC-AUC**, and **`0.0480` Brier Score**. |
| **2** | **Native XGBoost Classifier (`hist`, 349 Trees)** | [`src/models/train_xgboost_pipeline.py`](src/models/train_xgboost_pipeline.py)<br>[`models/flood_model.json`](models/flood_model.json) | **High-Speed Non-Linear Tabular Classifier:** Captures sharp topographical and hydrological threshold interactions (e.g., `elevation < 15m` with `rainfall_72h > 160mm`) at **`1.8 ms` latency** (`91.47%` Accuracy, `0.9676` ROC-AUC, `92.75%` Recall). |
| **3** | **Native JSON Random Forest Classifier (100 Trees)** | [`src/models/train_random_forest_pipeline.py`](src/models/train_random_forest_pipeline.py)<br>[`models/random_forest_model.json`](models/random_forest_model.json) | **High-Sensitivity Bagging Classifier:** Pure NumPy/JSON tree traversal (`src/models/inference_rf.py`) achieving **`93.59%` Recall** (`5,810 / 6,208` floods detected) to prevent missed inundations when sensor noise is high. |
| **4** | **PyTorch `FloodNet` Residual Deep Neural Network** | [`src/models/neural_net.py`](src/models/neural_net.py)<br>[`models/flood_net_best.pt`](models/flood_net_best.pt) | **Deep Representation Learning Benchmark:** 4-layer neural network with `BatchNorm1d`, `LeakyReLU(0.1)`, `Dropout(0.25)`, and residual skip connections (`h2 = LinearBlock(h1) + h1`) trained with `AdamW` and weighted `BCEWithLogitsLoss`. |
| **5** | **TreeSHAP Feature Attribution Engine** | [`backend/services/predictor.py`](backend/services/predictor.py)<br>[`models/metrics.json`](models/metrics.json) | **Explainable AI (XAI):** Computes exact global `|SHAP|` feature importances and local per-prediction waterfall contributions so emergency commanders know *why* an alert triggered. |
| **6** | **XGBoost-SHIPS Rapid Intensification (RI) Classifier** | [`backend/services/cyclone_service.py`](backend/services/cyclone_service.py) | **Cyclone Rapid Intensification Forecasting:** Evaluates 12h/24h wind momentum ($\Delta V_{12h}$), central pressure drop ($\Delta P = 1010 - P_{\text{min}}$), ocean heat headroom, and coastal land-interaction decay to predict 24-hour Rapid Intensification ($\Delta V \ge 30\text{ kt} / 55\text{ km/h}$). |
| **7** | **Holland (1980) Vortex Wind & Rainband Decay + Compound Super-Stack Bridge** | [`backend/services/cyclone_service.py`](backend/services/cyclone_service.py) | **Coastal Exposure & Compound Flood Modeling:** Computes radial wind and rainband accumulation across 28 Indian coastal districts and bridges cyclone-induced 24h/72h rain into `predict_flood_risk_ensemble()`. |
| **8** | **NLP SOS Multi-Class Distress Classifier & Gazetteer NER** | [`backend/services/nlp_rag_engine.py`](backend/services/nlp_rag_engine.py) | **Automated Disaster Triage:** Classifies SOS posts into 4 priority tiers (`CRITICAL_P1` to `LOW_P4`), extracts locations/GPS, water depth (`cm`), headcount, and vulnerable groups, and computes a `0–100` urgency score. |
| **9** | **Hybrid TF-IDF Cosine Vector + Okapi BM25 RAG Ranker** | [`backend/services/nlp_rag_engine.py`](backend/services/nlp_rag_engine.py)<br>[`backend/data/ndma_imd_sop_corpus.json`](backend/data/ndma_imd_sop_corpus.json) | **Disaster Knowledge Retrieval:** Combines sublinear TF-IDF cosine similarity (`45%`), Okapi BM25 lexical scoring (`45%`), and hazard-category alignment (`10%`) over official NDMA/IMD/INCOIS/NDRF SOP manuals. |
| **10** | **15-Feature PSI & Kolmogorov-Smirnov (KS) Drift Detector** | [`backend/services/mlops_engine.py`](backend/services/mlops_engine.py) | **Production MLOps Monitoring:** Compares live SQLite inference distributions against the 1.02M-record training baseline to detect monsoon/climate covariate shift ($\text{PSI} \ge 0.25$) and trigger automated ensemble recalibration. |

---

### 1. Production Champion: **Super-Stack Soft-Voting Ensemble (`RF + XGBoost`)**
- **Code**: `backend/services/ensemble_predictor.py` | **Metrics File**: `models/ensemble_metrics.json`
- **Architecture**: Calibrated weighted soft-voting fusion (`0.60 × Random Forest + 0.40 × Native XGBoost`) with isotonic probability scaling and optimal decision threshold `T* = 0.55`.

| Metric | Super-Stack Ensemble | Native XGBoost (`flood_model.json`) | Native Random Forest (`random_forest_model.json`) | PyTorch `FloodNet` (`flood_net_best.pt`) |
| :--- | :---: | :---: | :---: | :---: |
| **Accuracy** | **93.85%** | 91.47% | 90.17% | 88.90% |
| **Recall (Sensitivity)** | **94.80%** | 92.75% | 93.59% | 90.20% |
| **Precision** | **92.88%** | 90.44% | 87.59% | 87.80% |
| **F1-Score** | **93.83%** | 91.58% | 90.49% | 89.00% |
| **ROC-AUC** | **0.9820** | 0.9676 | 0.9610 | 0.9480 |
| **PR-AUC** | **0.9785** | 0.9602 | 0.9514 | 0.9410 |
| **Brier Calibration Loss** | **0.0480** | 0.0625 | 0.0742 | 0.0810 |

#### Validation Confusion Matrix — Native XGBoost (12,417 Balanced Test Samples)
```text
                   Predicted Safe (0)     Predicted Flood (1)
 Actual Safe  (0)       5,600 (TN)              609 (FP)
 Actual Flood (1)         450 (FN)            5,758 (TP)
```

#### Validation Confusion Matrix — Native Random Forest (12,417 Balanced Test Samples)
```text
                   Predicted Safe (0)     Predicted Flood (1)
 Actual Safe  (0)       5,386 (TN)              823 (FP)
 Actual Flood (1)         398 (FN)            5,810 (TP)
```

#### Top Global TreeSHAP Feature Attributions (`|SHAP|` Log-Odds Impact)
```text
1. elevation                 ████████████████████ 1.3698
2. ndwi (Surface Water)      ██████████████ 0.9769
3. ndvi (Vegetation/Moist)   ███████████ 0.7933
4. ponding_hazard            ██████ 0.3944
5. precip_ratio              ████ 0.2682
6. rainfall_72h              ████ 0.2664
7. rainfall_24h              ███ 0.2302
8. water_contrast            ██ 0.1499
9. slope                     ██ 0.1305
10. twi (Wetness Index)      █ 0.1041
```

---

## 🤖 Generative AI, NLP SOS Triage & Disaster Knowledge RAG

**DisasterRadar.ai** integrates **Generative AI and Retrieval-Augmented Generation (RAG)** in two mission-critical layers so that both citizens and emergency commanders receive grounded, hallucination-free guidance:

### 1. Conversational GenAI Assistant: **Google Gemini 1.5 Flash + HydroNet 2.0 Fallback (`FloodRisk Copilot`)**
- **Implementation**: [`backend/services/gemini_assistant.py`](backend/services/gemini_assistant.py) & [`frontend/src/components/FloodAssistantChat.jsx`](frontend/src/components/FloodAssistantChat.jsx) (`POST /api/assistant/chat`)
- **How It Works**:
  - Dynamically injects the user's **live telemetry context** (`location`, `latitude`, `longitude`, `rainfall_24h`, `rainfall_72h`, `elevation`, `flood_probability`, `risk_level`, and active cyclone status) into the system prompt before querying **Google Gemini 1.5 Flash** (`gemini-1.5-flash`).
  - Answers natural-language questions about local flood risk, evacuation routes, emergency kit preparation, and cyclone safety.
  - **100% Zero-Downtime Resilience**: If no `GEMINI_API_KEY` is configured or internet connectivity drops during a disaster, the assistant automatically falls back to the deterministic **HydroNet 2.0 Domain Rule Engine**, which synthesizes location-specific hydrological briefings directly from the live telemetry.

### 2. Disaster Knowledge RAG: **Hybrid TF-IDF Cosine Vector + Okapi BM25 SOP Engine**
- **Implementation**: [`backend/services/nlp_rag_engine.py`](backend/services/nlp_rag_engine.py) & [`backend/data/ndma_imd_sop_corpus.json`](backend/data/ndma_imd_sop_corpus.json) (`POST /api/rag/sop-query`)
- **Indexed Official Corpus (8 Authoritative Manuals)**:
  - `NDMA-FLOOD-SOP-4.2`: Early Warning & Phased Evacuation Triggers
  - `NDMA-URBAN-FLOOD-SOP-3.1`: Stormwater Pumping, Underpass Barricading & Flash Flood Response
  - `IMD-CYCLONE-SOP-2.1`: 4-Stage Colour-Coded Cyclone Alert Matrix (`Pre-Cyclone Watch` → `Post-Landfall Outlook`)
  - `NDMA-CYCLONE-MPCS-5.4`: Multipurpose Cyclone Shelter (MPCS) Operations & Wind Safety
  - `INCOIS-SURGE-SOP-1.3`: Coastal Storm Surge, Astronomical Tide Locking & Estuarine Backwater Protocol
  - `NDRF-RESCUE-SOP-6.1`: Swift-Water Boat Deployment, Medical Triage & Stranded Victim Extraction
  - `NDMA-ELECTRICAL-SOP-7.2`: 11kV/33kV Transformer Isolation & Electrocution Prevention During Inundation
  - `CWC-DAM-EMBANKMENT-SOP-8.1`: Reservoir Gate Spillway Release & Embankment Breach Containment
- **How Retrieval & Synthesis Work**:
  - Queries are vectorized using **sublinear TF-IDF unigram + bigram embeddings** (`45%` cosine similarity weight) combined with **Okapi BM25** (`k1 = 1.5, b = 0.75`, `45%` lexical weight) and **hazard-category alignment** (`10%` weight).
  - Synthesizes a structured **Incident Commander Operational Briefing** with exact clause citations (e.g., `[IMD-CYCLONE-SOP-2.1]`, `[NDMA-ELECTRICAL-SOP-7.2]`) and live telemetry overrides.

### 3. NLP SOS Distress Classifier & Gazetteer NER (`POST /api/nlp/sos-analyze`)
- Parses incoming citizen distress messages, extracts **stranded locations & GPS coordinates**, converts natural-language water depth mentions (e.g., *"5 feet deep"*, *"neck deep"*, *"stranded on 1st floor roof"*) into **`cm`**, identifies **vulnerable groups** (`Infants`, `Elderly`, `Pregnant`, `Medical Oxygen/Dialysis`), computes a transparent **`0–100` Urgency Score**, and automatically attaches the governing **NDMA/IMD SOP** for the dispatch team.

---

## 📊 Datasets & Hydrological Feature Schema

The hydrological models ingest **15 standardized features** combining satellite remote sensing, ground weather telemetry, and civil infrastructure metrics:

| # | Feature Key | Category | Physical Unit / Scale | Description |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `rainfall_24h` | Meteorological | mm | Short-term 24-hour cumulative rainfall |
| 2 | `rainfall_72h` | Meteorological | mm | Long-term 72-hour antecedent rainfall |
| 3 | `precip_ratio` | Hydrological | Ratio [0, 1] | Ratio of 24h to 72h precipitation (intensity burst indicator) |
| 4 | `elevation` | Topographical | meters [0 - 1000] | Digital Elevation Model (DEM) terrain height above mean sea level |
| 5 | `slope` | Topographical | degrees [0 - 60] | Gradient steepness influencing surface runoff velocity |
| 6 | `twi` | Topographical | Index [0 - 25] | Topographic Wetness Index ($\ln(a / \tan\beta)$) |
| 7 | `ndwi` | Remote Sensing | Index [-1.0, 1.0] | Normalized Difference Water Index (detects surface standing water) |
| 8 | `ndvi` | Remote Sensing | Index [-1.0, 1.0] | Normalized Difference Vegetation Index (soil absorption capacity) |
| 9 | `ponding_hazard` | Hydrological | Score [0 - 10] | Inundation accumulation potential in natural terrain depressions |
| 10 | `water_contrast` | Remote Sensing | Score [0 - 10] | Spectral contrast ratio of water surface to surrounding terrain |
| 11 | `drainage_capacity` | Infrastructure | Index [0 - 100] | Municipal stormwater network throughput capacity |
| 12 | `drainage_stress` | Infrastructure | Index [0 - 10] | Current surcharge pressure on stormwater outfalls |
| 13 | `urbanization_index` | Municipal | Index [0 - 10] | Impervious concrete/asphalt surface coverage ratio |
| 14 | `infrastructure_decay`| Municipal | Index [0 - 10] | Structural deterioration of storm drains and embankments |
| 15 | `disaster_unpreparedness` | Civil Defense | Index [0 - 10] | Municipal vulnerability & readiness gap index |

---

## 📓 Interactive Jupyter Notebooks

Complete, executed notebooks with pre-rendered plots and evaluation tables:

- [`notebooks/01_data_exploration.ipynb`](notebooks/01_data_exploration.ipynb): Ingestion of 1M+ MODIS records, distributions, class balance, and feature correlations.
- [`notebooks/02_preprocessing.ipynb`](notebooks/02_preprocessing.ipynb): Zero-null audit, physical bounds clamping, and stratified splitting.
- [`notebooks/03_feature_engineering.ipynb`](notebooks/03_feature_engineering.ipynb): TWI derivation, precipitation burst ratio, and drainage stress computation.
- [`notebooks/04_model_training.ipynb`](notebooks/04_model_training.ipynb): PyTorch `FloodNet` epoch training loop, loss convergence, and Native XGBoost/RF training.
- [`notebooks/05_model_evaluation.ipynb`](notebooks/05_model_evaluation.ipynb): Confusion matrices, ROC/PR curves, calibration plots, and TreeSHAP feature importance.
- [`disaster.ipynb`](disaster.ipynb): Root natural disaster exploratory analysis notebook.

---

## 🚀 Quick Start: How to Run This Project Locally

Anyone cloning this repository can get the full **Backend API + React Command Center** running locally in **under 3 minutes**. No paid API keys are required (Open-Meteo, RainViewer, GDACS, and OpenStreetMap work out of the box).

### 1. Prerequisites
- **Python 3.10+** (Python 3.11 / 3.12 / 3.14 supported)
- **Node.js 18+** and `npm`
- **Git** *(Optional: Docker Desktop if running via `docker compose`)*

### 2. Clone the Repository
```bash
git clone https://github.com/Shashank101-aiml/DisasterRadar.ai.git
cd DisasterRadar.ai
```

### 3. Install Backend Dependencies
```bash
# Optional: create and activate a virtual environment
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install FastAPI & ML dependencies
pip install -r backend/requirements.txt
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 5. Start the Application (2 Terminals)

#### Terminal 1 — Start the FastAPI Backend Server (Port `8000`)
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- **API Root**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Prometheus Metrics**: [http://localhost:8000/api/metrics/prometheus](http://localhost:8000/api/metrics/prometheus)

#### Terminal 2 — Start the React + Vite Frontend (Port `5173`)
```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```
- **Command Operating Center UI**: Open **[http://localhost:5173](http://localhost:5173)** in your browser.

> **Optional — Run with Docker Compose (Backend + Prometheus + Grafana):**
> ```bash
> docker compose up --build -d
> ```
> This launches `disasterradar-backend` (`:8000`), `disasterradar-prometheus` (`:9090`), and `disasterradar-grafana` (`:3000`).

---

## 🧪 Automated Testing

Run the complete `pytest` verification suite covering preprocessing bounds, Native XGBoost, Native JSON Random Forest, Super-Stack Ensemble, Cyclone tracking/exposure/compound bridge, Phase 6 NLP SOS & SOP RAG, and Phase 7 MLOps drift/retraining:

```bash
python -m pytest tests/ -v
```

Expected output (`21 passed`):
```text
tests/test_cyclone_ingestion.py::test_imd_cyclone_classification_scale PASSED           [  4%]
tests/test_cyclone_ingestion.py::test_haversine_and_track_kinematics PASSED             [  9%]
tests/test_cyclone_ingestion.py::test_nearest_indian_coast_lookup PASSED                [ 14%]
tests/test_cyclone_ingestion.py::test_data_freshness_provenance_guards PASSED           [ 19%]
tests/test_cyclone_ingestion.py::test_historical_cyclones_seeded_and_track_retrieval PASSED [ 23%]
tests/test_cyclone_ingestion.py::test_active_nio_cyclones_status_endpoint_contract PASSED [ 28%]
tests/test_cyclone_ingestion.py::test_coastal_district_exposure_assessment PASSED       [ 33%]
tests/test_cyclone_ingestion.py::test_compound_cyclone_to_flood_bridge PASSED           [ 38%]
tests/test_cyclone_ingestion.py::test_multi_hazard_alerts_aggregation_and_filtering PASSED [ 42%]
tests/test_cyclone_ingestion.py::test_phase6_nlp_sos_classifier_and_ner_extractor PASSED [ 47%]
tests/test_cyclone_ingestion.py::test_phase7_mlops_drift_retraining_and_prometheus PASSED [ 52%]
tests/test_ensemble.py::test_ensemble_predictor_execution PASSED                        [ 57%]
tests/test_ensemble.py::test_ensemble_severe_risk_scenario PASSED                       [ 61%]
tests/test_prediction.py::test_native_xgboost_json_exists PASSED                        [ 66%]
tests/test_prediction.py::test_inference_pipeline_execution PASSED                      [ 71%]
tests/test_prediction.py::test_metrics_json_integrity PASSED                            [ 76%]
tests/test_preprocessing.py::test_dataset_exists_and_valid PASSED                       [ 80%]
tests/test_preprocessing.py::test_feature_distributions_and_bounds PASSED               [ 85%]
tests/test_random_forest.py::test_random_forest_json_exists PASSED                      [ 90%]
tests/test_random_forest.py::test_random_forest_metrics_integrity PASSED                [ 95%]
tests/test_random_forest.py::test_random_forest_inference_execution PASSED              [100%]

======================= 21 passed in ~10.2s =======================
```

---

## 📡 API Reference (FastAPI)

| Method | Endpoint | Category | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Core | Service health status, active model version, and timestamp |
| `POST` | `/api/predict` | Flood ML | Run Super-Stack Ensemble (`RF + XGBoost`) flood prediction + local TreeSHAP attribution |
| `GET` | `/api/model/performance` | Diagnostics | Model benchmark metrics (`Accuracy`, `ROC-AUC`, `PR-AUC`, `Brier`, Confusion Matrix) |
| `GET` | `/api/model/detailed-analytics` | Diagnostics | Multi-model benchmark comparison, 15-feature SHAP table, and calibration curves |
| `GET` | `/api/cyclone/active` | Cyclone (P5) | Live North Indian Ocean (`BOB` & `ARB`) cyclone watch + 8 coastal maritime observatories |
| `GET` | `/api/cyclone/historical` | Cyclone (P5) | Verified IMD / IBTrACS historical cyclones (*Arnab*, *Remal*, *Dana*, *Michaung*, *Amphan*, etc.) |
| `GET` | `/api/cyclone/{id}/track` | Cyclone (P5) | Observed track, official forecast track, RSMC uncertainty cone GeoJSON, and RI trend |
| `GET` | `/api/cyclone/{id}/coastal-exposure` | Cyclone (P5) | 28-district Indian coastal exposure assessment (wind, rainband, elevation, surge index) |
| `POST` | `/api/cyclone/compound-flood-risk` | Cyclone (P5) | Validated Cyclone-to-Flood Super-Stack compound risk bridge |
| `POST` | `/api/nlp/sos-analyze` | NLP (P6) | Classify SOS distress post, extract NER locations/depths/groups, and score urgency (`0–100`) |
| `GET` | `/api/nlp/sos-feed` | NLP (P6) | Live prioritized SOS / Distress Triage Dispatch Queue (`CRITICAL_P1` first) |
| `POST` | `/api/rag/sop-query` | GenAI RAG (P6) | Hybrid TF-IDF + BM25 search over official NDMA/IMD/INCOIS/NDRF SOPs + briefing synthesis |
| `POST` | `/api/assistant/chat` | GenAI Copilot | Conversational FloodRisk Copilot powered by Google Gemini 1.5 Flash + HydroNet 2.0 fallback |
| `GET` | `/api/mlops/status` | MLOps (P7) | Active production model registry, ensemble weights, latency quantiles, and drift summary |
| `POST` | `/api/mlops/drift-check` | MLOps (P7) | Evaluate 15-feature PSI & Kolmogorov-Smirnov covariate drift (supports regime-shift simulation) |
| `POST` | `/api/mlops/retrain` | MLOps (P7) | Trigger automated continuous learning, ensemble weight calibration, and version promotion |
| `GET` | `/api/metrics/prometheus` | MLOps (P7) | Prometheus `0.0.4` OpenMetrics exposition endpoint for Prometheus & Grafana |
| `GET` | `/api/geospatial/weather` | Geospatial | Live Open-Meteo precipitation, pressure, wind, and Copernicus DEM elevation by city or GPS |
| `GET` | `/api/geospatial/shelters` | Evacuation | Real-time OpenStreetMap high-ground shelter discovery with DEM elevation sorting |
| `GET` | `/api/geospatial/authorities` | Evacuation | Nearest NDRF, Fire, Police, and DEOC emergency response authorities |
| `POST` | `/api/geospatial/alert-authority` | Evacuation | Transmit CAP 1.2 compliant emergency distress alert to nearest authority |
| `GET` | `/api/alerts` | Dispatch | Multi-hazard (`ALL`, `FLOOD`, `CYCLONE`) active alerts and severity advisories |

---

## 📂 Project Directory Structure

```text
DisasterRadar.ai/
├── Dockerfile                         # Multi-stage production container image (Phase 7)
├── docker-compose.yml                 # Orchestrates Backend (:8000), Prometheus (:9090) & Grafana (:3000)
├── monitoring/
│   └── prometheus.yml                 # Prometheus 15s scrape config targeting /api/metrics/prometheus
├── backend/                           # FastAPI REST API Service
│   ├── main.py                        # REST route definitions across all 7 phases
│   ├── config.py                      # Environment & API provider configurations
│   ├── data/
│   │   └── ndma_imd_sop_corpus.json   # Official NDMA, IMD, INCOIS & NDRF SOP knowledge base (Phase 6)
│   ├── models/
│   │   └── schemas.py                 # Pydantic request/response contracts
│   └── services/
│       ├── ensemble_predictor.py      # Calibrated Super-Stack (60% RF + 40% XGBoost) engine
│       ├── predictor.py               # Native XGBoost inference & TreeSHAP attribution
│       ├── cyclone_service.py         # NIO Cyclone tracker, XGB-SHIPS RI, 28-district exposure & bridge
│       ├── nlp_rag_engine.py          # NLP SOS classifier, Gazetteer NER & Hybrid TF-IDF/BM25 SOP RAG
│       ├── mlops_engine.py            # 15-feature PSI/KS drift detector, continuous retraining & Prometheus
│       ├── gemini_assistant.py        # Google Gemini 1.5 Flash + HydroNet 2.0 Copilot engine
│       ├── geospatial.py              # Live Open-Meteo, Nominatim OSM shelters, Doppler radar & CAP 1.2
│       ├── database.py                # SQLite WAL persistence (predictions, cyclone archive, citizen reports)
│       ├── stations.py                # Real-time hydrological & weather station telemetry
│       ├── gis_data.py                # Mira Bhayandar & regional GeoJSON risk layers
│       └── alerts_service.py          # Threshold breach scoring & 7-day incident ledgers
├── frontend/                          # React 18 + Vite Command Operating Center
│   ├── src/
│   │   ├── App.jsx                    # Application shell, live telemetry poller & view router
│   │   ├── components/
│   │   │   ├── Sidebar.jsx            # User-resizable (76px–420px) & collapsible navigation sidebar
│   │   │   ├── Header.jsx             # Top bar with hamburger toggle, location switcher & live clock
│   │   │   ├── PredictRiskView.jsx    # 15-parameter scenario simulation studio
│   │   │   ├── CycloneMonitorView.jsx # Cyclone trajectory GIS, RI drivers, coastal exposure & super-stack
│   │   │   ├── AiExplainerView.jsx    # TreeSHAP waterfall, What-If simulator, NLP SOS Triage & SOP RAG
│   │   │   ├── ModelPerformanceView.jsx # Threshold simulator, ROC/PR, SHAP, Benchmark & Phase 7 MLOps
│   │   │   ├── WorldGlobeView.jsx     # 3D Planetary Globe & regional GIS layers
│   │   │   ├── OfflineSafetyView.jsx  # High-ground OSM shelters & CAP 1.2 authority dispatch
│   │   │   ├── HistoricalTwinView.jsx # Historical flood digital-twin replay atlas
│   │   │   ├── AlertsReportsView.jsx  # Multi-hazard early warnings & 7-day telemetry reports
│   │   │   ├── ArchitectureView.jsx   # Interactive system architecture blueprint
│   │   │   └── FloodAssistantChat.jsx # Floating FloodRisk Copilot GenAI chat widget
│   │   └── services/api.js            # Resilient API client with offline fallbacks
│   └── package.json
├── models/                            # Serialized Machine Learning Checkpoints (Zero Pickle)
│   ├── flood_model.json               # Native XGBoost model (JSON format, 4.7 MB, 349 trees)
│   ├── random_forest_model.json       # Native Random Forest model (JSON format, 9.4 MB, 100 trees)
│   ├── flood_net_best.pt              # PyTorch FloodNet residual neural network weights
│   ├── ensemble_metrics.json          # Super-Stack Ensemble validation metrics (93.85% acc, 0.9820 AUC)
│   ├── metrics.json                   # XGBoost performance metrics & global SHAP importances
│   ├── random_forest_metrics.json     # Random Forest validation metrics & OOB score
│   └── feature_names.json             # Standardized 15-feature schema
├── notebooks/                         # Executed Jupyter Notebooks (01 to 05)
├── src/                               # Offline ML Training & Inference Pipelines
│   ├── data/                          # MODIS & Copernicus dataset preprocessing
│   ├── features/                      # Hydrological feature engineering
│   └── models/                        # PyTorch FloodNet, XGBoost & Random Forest training scripts
├── tests/                             # Automated Pytest Verification Suite (21 tests)
│   ├── test_cyclone_ingestion.py      # Cyclone, Multi-Hazard Alerts, Phase 6 NLP/RAG & Phase 7 MLOps tests
│   ├── test_ensemble.py               # Super-Stack Ensemble tests
│   ├── test_prediction.py             # Native XGBoost & SHAP tests
│   ├── test_preprocessing.py          # Dataset & feature bound tests
│   └── test_random_forest.py          # Native JSON Random Forest tests
└── README.md                          # Definitive project documentation (Source of Truth)
```

---

## 🔄 Git Workflow & Remote Pushing

To push new commits from your local environment to GitHub:

```powershell
cd d:\DisasterRadar
git status
git push origin main
```

> **Remote Repository:** [https://github.com/Shashank101-aiml/DisasterRadar.ai.git](https://github.com/Shashank101-aiml/DisasterRadar.ai.git)

---

## 📜 License
This project is open-source under the [MIT License](LICENSE).
