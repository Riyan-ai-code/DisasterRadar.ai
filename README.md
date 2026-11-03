# 🌊 AI-Powered Multi-Hazard Disaster Intelligence Platform

> **AI-Powered Flood Prediction, Cyclone Tracking, Geospatial Risk Assessment & Early Warning Platform**  
> An end-to-end multi-hazard intelligence platform integrating satellite hydrology (MODIS), deep learning (PyTorch FloodNet), gradient-boosted decision trees (XGBoost), meteorological data, and geospatial GIS analytics to monitor flood and cyclone events, assess hazard exposure, identify vulnerable regions, and support early warning and evacuation planning through real-time disaster intelligence.

[![GitHub Repo](https://img.shields.io/badge/GitHub-Shashank101--aiml%2FDisasterRadar.ai-blue?logo=github)](https://github.com/Shashank101-aiml/DisasterRadar.ai)
[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB?logo=react)](https://react.dev/)
[![XGBoost](https://img.shields.io/badge/XGBoost-1.7+-eb3434?logo=xgboost)](https://xgboost.readthedocs.io/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C?logo=pytorch)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Table of Contents
1. [Overview & Core Capabilities](#-overview--core-capabilities)
2. [Phased Project Roadmap](#-phased-project-roadmap)
3. [Platform Views & Key Modules](#-platform-views--key-modules)
4. [System Architecture](#-system-architecture)
5. [Machine Learning Models & Performance](#-machine-learning-models--performance)
6. [Datasets & Hydrological Feature Schema](#-datasets--hydrological-feature-schema)
7. [Interactive Jupyter Notebooks](#-interactive-jupyter-notebooks)
8. [Installation & Setup](#-installation--setup)
9. [Running the Platform](#-running-the-platform)
10. [Automated Testing](#-automated-testing)
11. [API Reference (FastAPI)](#-api-reference-fastapi)
12. [Project Directory Structure](#-project-directory-structure)
13. [Git Workflow & Remote Pushing](#-git-workflow--remote-pushing)

---

## 🎯 Overview & Core Capabilities

**DisasterRadar.ai** provides municipal authorities, disaster response teams (NDRF/SDRF), urban planners, and citizens with real-time, explainable flood forecasting and decision support:

- 🔬 **High-Accuracy Flood Risk Engine**: Dual ML pipeline combining a high-performance **Native XGBoost Classifier** (`91.47%` accuracy, `92.75%` recall) and a deep **PyTorch FloodNet** neural network with residual skip connections.
- 💡 **AI Explainer & Evacuation Intelligence**: Real-time TreeSHAP feature attribution, counterfactual "What-If" scenario simulations, and evacuation routing to designated relief shelters.
- 🗺️ **High-Resolution GIS Atlas**: Specialized Mira Bhayandar Cartographic Flood Vulnerability map with 5-tier risk choropleth, rail corridors, and key drainage canals.
- 🚨 **Live Emergency Dispatch & Alerts**: Severity classification (`Low`, `Moderate`, `High`, `Critical`), automatic emergency advisory generation, and downloadable incident dispatch sheets.
- 📊 **Real-Time Model Diagnostics**: Complete visibility into ROC curves, Precision-Recall curves, confusion matrices, and epoch loss convergence histories.

---

## 🗺️ Phased Project Roadmap

| Phase | Title | Key Deliverables & Milestones | Status |
| :---: | :--- | :--- | :---: |
| **Phase 1** | **Core ML & Hydrological Modeling** | Unified 1M+ MODIS & environmental data pipeline, 15 standardized features, Native XGBoost (`91.47%` acc, `0.9676` ROC-AUC, 349 trees), PyTorch `FloodNet` deep neural network, notebooks 01–05, and automated pytest suite. | **Completed** ✅ |
| **Phase 2** | **AI Explainer & Evacuation Intelligence** | Project 7 (CO4 \| L6) audit fulfillment: interactive TreeSHAP local waterfall & global importance, counterfactual "What-If" simulation engine, and NDRF/SDRF shelter evacuation route planning. | **Completed** ✅ |
| **Phase 3** | **Geospatial GIS Atlas & Telemetry** | Mira Bhayandar 5-tier vulnerability choropleth, rail corridors, storm outfalls, live hydrological telemetry streaming, and weather station monitoring. | **Completed** ✅ |
| **Phase 4** | **Operational Dashboard & Dispatch Alerts** | Responsive React + Vite multi-view command center, real-time hazard bulletins, severity filtering (`Critical` to `Advisory`), incident reporting, and CSV dispatch exports. | **Completed** ✅ |
| **Phase 5** | **Cyclone Tracking & Compound Flood Risk Engine** | Live North Indian Ocean (Bay of Bengal & Arabian Sea) cyclone tracking, IMD 3-min wind scale, RSMC uncertainty cone GIS, 28-district coastal exposure matrix, historical cyclone replay (including *Cyclone Arnab*, *Michaung*, *Amphan*, *Fani*), and validated Cyclone-to-Flood ensemble bridge. | **Completed** ✅ |
| **Phase 6** | **NLP SOS Intelligence & NDMA/IMD SOP Knowledge RAG** | Social media SOS / distress post classification (`LIFE_THREATENING_SOS` to `LOW_P4`), Named Entity Recognition (NER) for extracting stranded victim locations & GPS coordinates, automated 0–100 urgency scoring, and Hybrid TF-IDF + BM25 RAG indexing official NDMA/IMD/INCOIS/NDRF SOP manuals. | **Completed** ✅ |
| **Phase 7** | **Production MLOps & Continuous Learning** | Docker containerization, automated model drift detection, automated retraining pipelines, and Prometheus/Grafana system health telemetry. | *Planned* ⏳ |

---

## 🖥️ Platform Views & Key Modules

### 1. 🎛️ Overview Dashboard
- **Donut Risk Gauge**: Instant visual indicator of current inundation probability and threat tier.
- **Top Metrics**: Real-time telemetry monitoring (Rainfall 24h/72h, TWI, Elevation, Water Surface Contrast).
- **Interactive Risk Map**: Leaflet-based spatial visualization with live sensor stations and active hazard zones.
- **Recent Predictions Feed**: Auditable history of predicted flood events and telemetry snapshots.

### 2. ⚡ Predict Risk Studio (`PredictRiskView.jsx`)
- Interactive parameter sliders across **all 15 environmental, hydrological, and municipal factors**.
- Quick-fill scenario presets: *Extreme Monsoon / Flash Flood*, *High Tide Surge*, *Urban Drainage Failure*, *Normal Dry Weather*.
- Instant calculation of calibrated probability, danger level, and immediate municipal action items.

### 3. 🧠 AI Flood Explainer & Evacuation Intelligence (`AiExplainerView.jsx`)
- **Global & Local SHAP Waterfall**: Uncovers why the model flagged a particular location as hazardous.
- **Counterfactual "What-If" Simulator**: Modify rainfall, elevation, or drainage capacity in real-time to observe the marginal impact on flood probability.
- **Evacuation Intelligence Center**: Recommends the safest evacuation paths, designated emergency shelters, and transit time estimates based on elevation clearance.
- **Curriculum Fulfillment**: Meets Project 7 (CO4 | Bloom's Taxonomy Level 6) audit specifications.

### 4. 📈 Model Performance & Diagnostics Hub (`ModelPerformanceView.jsx`)
- Live benchmark telemetry loaded directly from `models/metrics.json`.
- **Interactive Confusion Matrix** (5,600 True Negatives, 5,758 True Positives on balanced validation).
- **ROC-AUC (0.9676)** and **PR-AUC (0.9602)** interactive curves with threshold toggles.
- **PyTorch FloodNet Epoch History**: Loss convergence curves across training and validation passes.
- **SHAP Feature Importance**: Bar chart breakdown of the 15 features by predictive weight.

### 5. 🚨 Alerts & Incident Response Center (`AlertsReportsView.jsx`)
- Multi-tier emergency warnings with active status filters (`Critical`, `High`, `Moderate`, `Advisory`).
- Detailed incident cards with geographical coordinates, affected population estimates, and relief contacts.
- Quick CSV export for field response units and emergency dispatchers.

---

## 🏛️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │       DATA SOURCES & TELEMETRY          │
                               │  - MODIS Satellite Hydrology (1M rows)  │
                               │  - Kaggle Municipal Vulnerability       │
                               │  - Realtime Weather & Hydro Stations    │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │      DATA PREPARATION & SCHEMA          │
                               │  - Zero-Null Audit & Outlier Clamping   │
                               │  - 15 Hydrological & Satellite Features │
                               │  - Leakage-Free Stratified 80/20 Split  │
                               └────────────────────┬────────────────────┘
                                                    │
                      ┌─────────────────────────────┴─────────────────────────────┐
                      ▼                                                           ▼
       ┌─────────────────────────────┐                             ┌─────────────────────────────┐
       │   PYTORCH FLOODNET DEEP NN  │                             │   NATIVE XGBOOST CLASSIFIER │
       │  - Residual Skip Connections│                             │  - 349 Boosting Trees (hist)│
       │  - BatchNorm1d + Dropout    │                             │  - Accuracy: 91.47%         │
       │  - AdamW + CosineAnnealing  │                             │  - Recall: 92.75%           │
       │  - Checkpoint: flood_net.pt │                             │  - ROC-AUC: 0.9676          │
       └──────────────┬──────────────┘                             │  - Serialized: model.json   │
                      │                                            └──────────────┬──────────────┘
                      └─────────────────────────────┬─────────────────────────────┘
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │           FASTAPI REST BACKEND          │
                               │  - POST /api/predict (Inference + SHAP) │
                               │  - GET  /api/model/performance          │
                               │  - GET  /api/gis/mira-bhayandar         │
                               │  - GET  /api/stations                   │
                               └────────────────────┬────────────────────┘
                                                    │
                                                    ▼
                               ┌─────────────────────────────────────────┐
                               │          REACT + VITE FRONTEND          │
                               │  - Donut Gauge & Live Telemetry         │
                               │  - PredictRisk & AI Explainer Views     │
                               │  - Evacuation Planner & Shelter Routes  │
                               │  - Model Performance Diagnostics        │
                               └─────────────────────────────────────────┘
```

---

## 🧠 Machine Learning Models & Performance

### 1. Primary Production Model: **Native XGBoost Classifier**
- **Model File**: `models/flood_model.json` (Native XGBoost JSON, 4.7 MB — **no unsafe pickle serialization**)
- **Architecture**: Gradient Boosted Trees (`tree_method='hist'`, `max_depth=8`, `learning_rate=0.047`, 349 boosting trees)
- **Validation Dataset**: 12,417 balanced test samples from unified MODIS & environmental data

| Metric | Score | Operational Significance |
| :--- | :---: | :--- |
| **Accuracy** | **91.47%** | Outstanding general classification fidelity |
| **Recall (Sensitivity)** | **92.75%** | **Critical for Life Safety** — detects 5,758 of true flood events with minimal misses |
| **Precision** | **90.44%** | Highly trustworthy alerts; eliminates false alarm fatigue |
| **F1-Score** | **91.58%** | Strong harmonic balance between precision and sensitivity |
| **ROC-AUC** | **0.9676** | Near-optimal class separability across arbitrary discrimination thresholds |
| **PR-AUC** | **0.9602** | Robust performance on high-precision decision curves |
| **Brier Score** | **0.0625** | Highly calibrated predicted probabilities |

#### Validation Confusion Matrix (12,417 Samples)
```
                   Predicted Safe (0)     Predicted Flood (1)
 Actual Safe  (0)       5,600 (TN)              609 (FP)
 Actual Flood (1)         450 (FN)            5,758 (TP)
```

#### Top SHAP Feature Attributions
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

### 2. Deep Learning Model: **PyTorch `FloodNet`**
- **Model File**: `models/flood_net_best.pt`
- **Code**: `src/models/neural_net.py`
- **Architecture**:
  - `Linear(15, 64) -> BatchNorm1d -> LeakyReLU(0.1) -> Dropout(0.25)`
  - Residual block with skip connection: `h2 = LinearBlock(h1) + h1`
  - Fully connected classification head: `Linear(64, 32) -> Linear(32, 1)`
  - Weighted `BCEWithLogitsLoss` countering class distribution skew
  - Trained with `AdamW` and `ReduceLROnPlateau` scheduler

---

### 3. Bagging Ensemble Model: **Native Random Forest Classifier (JSON - Strictly NO Pickle)**
- **Model File**: `models/random_forest_model.json` (Native JSON format, 9.46 MB — **strictly NO pickle**)
- **Architecture**: 100 pruned decision trees (`max_depth=14`, `min_samples_split=10`, `min_samples_leaf=5`, `max_features='sqrt'`)
- **Training Pipeline**: `src/models/train_random_forest_pipeline.py`
- **Inference Engine**: `src/models/inference_rf.py` (Pure NumPy & JSON tree traversal)
- **Validation Dataset**: 12,417 balanced test samples

| Metric | Score | Operational Significance |
| :--- | :---: | :--- |
| **Accuracy** | **90.17%** | High bagging baseline accuracy |
| **Recall (Sensitivity)** | **93.59%** | Exceptional sensitivity — detects 5,810 flood events (only 398 misses) |
| **Precision** | **87.59%** | Reliable alert triggering |
| **F1-Score** | **90.49%** | Well-balanced harmonic performance |
| **ROC-AUC** | **0.9610** | High discriminatory separability |
| **PR-AUC** | **0.9514** | Robust area under precision-recall curve |
| **OOB Score** | **0.9029** | Reliable out-of-bag generalization estimate |
| **Brier Score** | **0.0742** | Calibrated ensemble probability estimates |

#### Validation Confusion Matrix (12,417 Samples)
```
                   Predicted Safe (0)     Predicted Flood (1)
 Actual Safe  (0)       5,386 (TN)              823 (FP)
 Actual Flood (1)         398 (FN)            5,810 (TP)
```

---

## 📊 Datasets & Hydrological Feature Schema

The models ingest 15 standardized features combining satellite remote sensing, ground weather telemetry, and civil infrastructure metrics:

| # | Feature Key | Category | Physical Unit / Scale | Description |
| :-: | :--- | :--- | :--- | :--- |
| 1 | `rainfall_24h` | Meteorological | mm | Short-term 24-hour cumulative rainfall |
| 2 | `rainfall_72h` | Meteorological | mm | Long-term 72-hour antecedent rainfall |
| 3 | `precip_ratio` | Hydrological | Ratio [0, 1] | Ratio of 24h to 72h precipitation (intensity burst indicator) |
| 4 | `elevation` | Topographical | meters [0 - 1000] | Digital Elevation Model (DEM) terrain height |
| 5 | `slope` | Topographical | degrees [0 - 60] | Gradient steepness influencing surface runoff speed |
| 6 | `twi` | Topographical | Index [0 - 25] | Topographic Wetness Index ($\ln(a / \tan\beta)$) |
| 7 | `ndwi` | Remote Sensing | Index [-1.0, 1.0] | Normalized Difference Water Index (detects standing water) |
| 8 | `ndvi` | Remote Sensing | Index [-1.0, 1.0] | Normalized Difference Vegetation Index (soil absorption capacity) |
| 9 | `ponding_hazard` | Hydrological | Score [0 - 10] | Inundation accumulation potential in natural depressions |
| 10 | `water_contrast` | Hydrological | Score [0 - 10] | Ratio of water index to surrounding dry terrain |
| 11 | `drainage_capacity` | Infrastructure | Index [0 - 10] | Municipal stormwater network throughput |
| 12 | `drainage_stress` | Infrastructure | Index [0 - 10] | Current surcharge pressure on stormwater outfalls |
| 13 | `urbanization_index` | Municipal | Index [0 - 10] | Impervious surface coverage percentage |
| 14 | `infrastructure_decay`| Municipal | Index [0 - 10] | Structural deterioration of storm drains and levees |
| 15 | `disaster_unpreparedness` | Civil Defense | Index [0 - 10] | Administrative lack of early warning or readiness |

---

## 📓 Interactive Jupyter Notebooks

Complete, executed notebooks with pre-rendered interactive plots and tables:

- [`notebooks/01_data_exploration.ipynb`](notebooks/01_data_exploration.ipynb): Ingestion, distributions, class balance, and feature correlations.
- [`notebooks/02_preprocessing.ipynb`](notebooks/02_preprocessing.ipynb): Zero-null checks, physical bounds clamping, and normalization.
- [`notebooks/03_feature_engineering.ipynb`](notebooks/03_feature_engineering.ipynb): TWI derivation, precipitation ratio, and drainage stress computation.
- [`notebooks/04_model_training.ipynb`](notebooks/04_model_training.ipynb): PyTorch FloodNet epoch training loop, loss convergence, and XGBoost training.
- [`notebooks/05_model_evaluation.ipynb`](notebooks/05_model_evaluation.ipynb): Confusion matrices, ROC/PR curves, and SHAP feature importance.
- [`disaster.ipynb`](disaster.ipynb): Root natural disaster exploratory notebook.

---

## 💻 Installation & Setup

### 1. Prerequisites
- **Python 3.10+** (Python 3.11 or 3.12 recommended)
- **Node.js 18+** and `npm`
- **Git**

### 2. Clone the Repository & Set Up Virtual Environment
```bash
git clone https://github.com/Shashank101-aiml/DisasterRadar.ai.git
cd DisasterRadar.ai

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate
```

### 3. Install Backend & ML Dependencies
```bash
pip install -r backend/requirements.txt
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install xgboost optuna scikit-learn pandas numpy matplotlib seaborn pytest
```

### 4. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 🚀 Running the Platform

### Step 1: Start the FastAPI Backend
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- API Root: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc API Guide: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Step 2: Start the React Frontend Dashboard
Open a second terminal window:
```bash
cd frontend
npm run dev
```
- Dashboard URL: [http://127.0.0.1:5173](http://127.0.0.1:5173)

---

## 🧪 Automated Testing

Run the full automated test suite verifying data bounds, model serialization, and inference:
```bash
python -m pytest tests/ -v
```

Expected output:
```text
tests/test_prediction.py::test_native_xgboost_json_exists PASSED         [ 12%]
tests/test_prediction.py::test_inference_pipeline_execution PASSED       [ 25%]
tests/test_prediction.py::test_metrics_json_integrity PASSED             [ 37%]
tests/test_preprocessing.py::test_dataset_exists_and_valid PASSED        [ 50%]
tests/test_preprocessing.py::test_feature_distributions_and_bounds PASSED [ 62%]
tests/test_random_forest.py::test_random_forest_json_exists PASSED       [ 75%]
tests/test_random_forest.py::test_random_forest_metrics_integrity PASSED [ 87%]
tests/test_random_forest.py::test_random_forest_inference_execution PASSED [100%]

======================= 8 passed in ~2.6s ========================
```

---

## 📡 API Reference (FastAPI)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and timestamp |
| `POST` | `/api/predict` | Predict flood probability, risk tier, advisory, and SHAP contributors |
| `GET` | `/api/model/performance` | Real validation metrics (Accuracy, ROC-AUC, PR-AUC, Confusion Matrix) |
| `GET` | `/api/stations` | Live weather and hydrological station telemetry |
| `GET` | `/api/alerts` | Active flood hazard warnings and severity advisories |
| `GET` | `/api/gis/mira-bhayandar` | GeoJSON polygons for Mira Bhayandar risk zones and transit routes |
| `GET` | `/api/predictions/recent` | History of recent predictions and evaluated telemetry |

---

## 📂 Project Directory Structure

```
DisasterRadar.ai/
├── backend/                       # FastAPI REST API Service
│   ├── main.py                    # REST route definitions and handlers
│   ├── config.py                  # Environment and directory configurations
│   ├── models/schemas.py          # Pydantic validation schemas
│   └── services/                  # Business logic (Predictor, Telemetry, GIS)
│       ├── predictor.py           # Native XGBoost inference engine
│       ├── stations.py            # Realtime sensor stations provider
│       ├── gis_data.py            # Mira Bhayandar geospatial GeoJSON data
│       └── alerts_service.py      # Hazard alert dispatch and management
├── frontend/                      # Modern React + Vite Dashboard
│   ├── src/
│   │   ├── App.jsx                # Application shell and view router
│   │   ├── components/            # High-fidelity UI modules
│   │   │   ├── TopMetrics.jsx     # Telemetry summary metric cards
│   │   │   ├── PredictRiskView.jsx# 15-parameter scenario simulation studio
│   │   │   ├── AiExplainerView.jsx# SHAP waterfall, What-If & Evacuation planner
│   │   │   ├── ModelPerformanceView.jsx # Confusion matrix, ROC & PR curves
│   │   │   ├── AlertsReportsView.jsx    # Emergency warnings & incident reports
│   │   │   ├── RiskMap.jsx        # Leaflet geospatial risk visualizer
│   │   │   └── Sidebar.jsx        # Navigation sidebar
│   │   └── services/api.js        # Axios API client
│   └── package.json
├── models/                        # Serialized Machine Learning Checkpoints
│   ├── flood_model.json           # Native XGBoost model (JSON format, 4.7 MB)
│   ├── random_forest_model.json   # Native Random Forest model (JSON format, 9.4 MB)
│   ├── flood_net_best.pt          # PyTorch FloodNet weights
│   ├── metrics.json               # Full XGBoost performance metrics & SHAP
│   ├── random_forest_metrics.json # Full Random Forest performance metrics
│   ├── random_forest_hyperparameters.json # RF bagging parameters
│   ├── feature_names.json         # 15-feature schema definition
│   └── hyperparameters.json       # Best XGBoost hyperparameter configuration
├── notebooks/                     # Executed Jupyter Notebooks (01 to 05)
├── outputs/                       # Generated evaluation plots (PNG charts)
├── src/                           # Machine Learning Source Code
│   ├── data/                      # Dataset loading and preprocessing scripts
│   ├── features/                  # Feature engineering and scaling
│   └── models/                    # Model architectures, training & inference
│       ├── neural_net.py          # PyTorch FloodNet implementation
│       ├── train_xgboost_pipeline.py # 19-step training pipeline
│       ├── train_random_forest_pipeline.py # End-to-end Random Forest pipeline
│       ├── inference.py           # Native XGBoost inference
│       └── inference_rf.py        # Native JSON Random Forest inference
├── tests/                         # Automated Pytest suite
│   ├── test_prediction.py         # XGBoost & feature tests
│   ├── test_preprocessing.py      # Data & bounds tests
│   └── test_random_forest.py      # Native JSON Random Forest tests
├── disaster.ipynb                 # Exploratory data analysis notebook
└── README.md                      # Comprehensive project documentation
```

---

## 🔄 Git Workflow & Remote Pushing

To push new commits from your local environment to GitHub:

```powershell
cd C:\Users\DELL\Desktop\disaster\DisasterRadar.ai
git status
git push origin main
```

> **Remote Repository:** https://github.com/Shashank101-aiml/DisasterRadar.ai.git

---

## 📜 License
This project is open-source under the [MIT License](LICENSE).
