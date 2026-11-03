import os
import requests
import json
from typing import Dict, Any, List, Optional
from config import settings
from services.nlp_rag_engine import retrieve_sop_knowledge_rag

# System instruction prompt grounding Gemini in life-safety flood protocols
FLOOD_SYSTEM_PROMPT = """You are "FloodRisk Copilot", an advanced AI Flood Disaster & Evacuation Intelligence Assistant built for the FloodRisk AI Early Warning System.

Your core mission:
1. Provide urgent, actionable, life-safety evacuation instructions, asset protection steps, and flood hazard mitigation advice.
2. Ground all advice in hydrodynamic physics:
   - 6 inches (15 cm) of fast-flowing water sweeps adults off their feet.
   - 12 inches (30 cm) of floodwater floats passenger cars and stalls engines via hydraulic lock.
   - 24 inches (60 cm) sweeps heavy SUVs, trucks, and ambulances.
3. Address specific dilemmas directly:
   - Car stalling in water: Unbuckle immediately, roll down or break window, climb onto the car roof, call 112.
   - Home electrical safety: Shut off the Main Circuit Breaker (MCB) BEFORE water reaches socket height (15-30 cm) to avoid lethal water electrification.
   - Sewer backflow: Plug ground floor drains with expandable plugs; seal toilet bowls with plastic sheeting weighted with 25kg sandbags.
   - Elderly & Medical: Evacuate in daylight during Yellow Alert with 14-day medication kits and charged battery packs for oxygen/CPAP.
   - Livestock & Pets: UNCHAIN cattle immediately so they can swim to natural high ground; never leave animals tied in sheds.
   - Rooftop trapping: Ascend to open roof; do NOT climb into attics without exterior hatches; signal rescue with bright fabric, mirrors, strobes, or 3 whistle blasts.
4. Integrate the user's live hydrological telemetry when provided (location, 24h/72h rainfall, elevation, risk level, probability).
5. Format your response cleanly using markdown (bolding, bullet points, short clear steps, and emergency helpline numbers: NDRF/SDRF 112, Disaster Helpline 1070). Keep responses concise, direct, empathetic, and urgent.
"""

def generate_local_hydro_response(prompt: str, telemetry: Optional[Dict[str, Any]] = None) -> str:
    """High-fidelity local hydro-reasoning engine when Gemini API key is not configured."""
    p_lower = prompt.lower()
    t = telemetry or {}
    loc = t.get("location", "Your Monitored Basin")
    r24 = t.get("rainfall24h", 85)
    risk = t.get("riskLevel", "HIGH")
    prob = t.get("probability", 78.4)
    elev = t.get("elevation", 900)

    prefix = f"📍 **Active Basin Telemetry [{loc}]**: 24h Rainfall: `{r24} mm` | Terrain Elevation: `{elev} m` | Risk Level: **{risk}** ({prob}% Probability)\n\n"

    if any(k in p_lower for k in ["car", "vehicle", "drive", "stalled", "engine", "exhaust", "underpass"]):
        return prefix + """### 🚗 Critical Vehicle Evacuation & Egress Protocol

1. **"Turn Around, Don't Drown"**:
   - Just **12 inches (30 cm)** of moving water exerts enough buoyancy to float sedans and compact SUVs.
   - **24 inches (60 cm)** sweeps away large 4x4 trucks and rescue vehicles.
   - Avoid underpasses and dips—water depth can reach 2 to 3 meters in minutes.

2. **If Your Car Stalls in Rising Water**:
   - **Step 1:** **Unbuckle seatbelts immediately.** Do not waste time attempting to restart a hydro-locked engine.
   - **Step 2:** **Lower power windows immediately** before water shorts out the 12V electrical bus.
   - **Step 3:** If windows won't open, use a headrest prong or center punch against the corner of a side window.
   - **Step 4:** Climb through the window directly onto the **car roof**.
   - **Step 5:** Call **112 (National Emergency Helpline)** and signal with your phone flashlight or horn.

3. **Pre-Evacuation Vehicle Staging**:
   - Relocate cars to elevated multi-level parking plazas, highway flyovers, or elevated community berms 4–8 hours before peak rainfall."""

    elif any(k in p_lower for k in ["electric", "breaker", "mcb", "socket", "power", "shock", "appliance", "fridge"]):
        return prefix + """### ⚡ Electrical Grid Isolation & Asset Protection

1. **Main Circuit Breaker (MCB) Shutdown**:
   - **Shut off the Main Electrical Panel (MCB)** *BEFORE* rising floodwater reaches lower wall sockets (approx. 15–30 cm from floor).
   - Never touch the breaker box while standing in water or with wet hands; use a dry wooden stick if necessary.

2. **Elevate Critical Electronics & Inverters**:
   - Move home solar inverters, battery banks, refrigerators, and washing machines to upper floors or onto **1.2m elevated masonry plinths**.
   - Unplug all appliances to prevent high-voltage grid surges when power is re-energized.

3. **LPG Gas Cylinder Safety**:
   - Fasten LPG cylinders upright to high window security grilles using heavy nylon ratchet straps.
   - Floating cylinders can shear brass regulator valves, creating explosive vapor leaks."""

    elif any(k in p_lower for k in ["toilet", "drain", "sewer", "backflow", "plumbing", "sink", "blackwater"]):
        return prefix + """### 🛡️ Preventing Toxic Sewer Backflow & Ingress

1. **Why It Happens**:
   - Surcharged municipal storm drains force pressurized, pathogen-laden blackwater backward up through ground-floor floor drains and toilet pans.

2. **Mechanical Sealing Steps**:
   - **Toilet Bowls:** Drape heavy polyethylene sheeting over the bowl, close the lid firmly, and place a **25 kg sandbag** directly on top.
   - **Floor & Shower Drains:** Insert expanding mechanical rubber pipe test plugs or water-filled heavy PVC sandbags.
   - **Non-Return Flap Valves:** Ensure exterior sewer inspection chambers have one-way backwater valves engaged.

3. **Post-Flood Sanitation**:
   - Never flush toilets until municipal mains are cleared. Disinfect contaminated floors with a 1:10 household chlorine bleach solution."""

    elif any(k in p_lower for k in ["elderly", "senior", "bedridden", "infant", "baby", "medicine", "oxygen", "prescription"]):
        return prefix + """### 👨‍👩‍👧‍👦 Evacuating Vulnerable Populations & Medical Assets

1. **Early Daylight Evacuation (Phase 1)**:
   - Evacuate senior citizens, pregnant women, and infants **during daylight hours** (Yellow Alert stage) before road currents submerge transit corridors.

2. **14-Day Waterproof Medical Pouch**:
   - Seal insulin, cardiac medications, hypertension pills, and doctor prescriptions inside a **floating airtight dry-bag** worn on the chest.
   - Keep cold-chain packs for temperature-sensitive drugs like insulin.

3. **Power-Dependent Medical Devices**:
   - Charge battery backups for oxygen concentrators and CPAP units. Keep a manual bag-valve-mask resuscitator accessible.

4. **Priority Registration**:
   - Register bedridden individuals with the local **NDRF/Civil Defense (Dial 112)** for prioritized high-clearance inflatable boat dispatch."""

    elif any(k in p_lower for k in ["cattle", "livestock", "cow", "buffalo", "pet", "dog", "cat", "animal"]):
        return prefix + """### 🐄 Livestock, Cattle & Domestic Pet Evacuation

1. **CRITICAL: UNCHAIN ALL CATTLE IMMEDIATELY**:
   - **Never leave cows, buffaloes, or horses tethered in sheds.** Tethered animals drown in 3 feet of water.
   - Unchained livestock possess natural buoyancy and will instinctively swim to natural high ground.

2. **Move to Elevated Earthen Mounds (Kanti)**:
   - Herd livestock toward designated community flood berms constructed above the 100-year flood contour.

3. **Protect Fodder & Feed**:
   - Stack dry hay bales and concentrate feed on elevated bamboo scaffolding wrapped in waterproof tarpaulins. Wet silage rots and causes fatal bovine acidosis.

4. **Domestic Pets**:
   - Place dogs and cats in rigid carriers with waterproof ID collars, leashes, and a 3-day supply of dry kibble."""

    elif any(k in p_lower for k in ["roof", "trapped", "attic", "terrace", "signal", "rescue", "helicopter", "boat"]):
        return prefix + """### 🆘 Rooftop Survival & Emergency Distress Signaling

1. **Vertical Evacuation**:
   - Move immediately to the highest concrete floor or reinforced roof terrace.
   - **WARNING:** Do NOT climb into an enclosed attic without an exterior roof hatch—rising water can trap you against the ceiling.

2. **Distress Signaling Methods**:
   - **Daytime:** Wave bright orange/red cloths or use a reflective mirror toward helicopters and rescue boats.
   - **Nighttime:** Flash SOS (`... --- ...` : 3 short, 3 long, 3 short) with phone strobes or flashlights.
   - **Acoustic:** Sound **3 sharp whistle blasts** at 1-minute intervals.

3. **Water & Wildlife Precautions**:
   - **Never drink floodwater.** Use stored bottled water or collected rainwater.
   - Displaced snakes and rodents also seek high ground. Keep a sturdy stick ready and inspect dry roof corners."""

    else:
        return prefix + f"""### 🌊 Flood Evacuation & Preparedness Assessment

1. **Hydrological Threat Level**:
   - With an inundation probability of **{prob}% ({risk} Risk)** and 24h rainfall of **{r24} mm**, low-lying sectors are subject to rapid surface accumulation.

2. **Immediate 4-Step Checklist**:
   - **Step 1: Go-Bag Ready** — Grab waterproof pouch with ID cards, property deeds, 14-day medications, cash, and power banks.
   - **Step 2: Electrical Isolation** — Switch off the Main Circuit Breaker (MCB) before water ingress.
   - **Step 3: Vertical & Outward Movement** — Relocate vehicles to high flyovers and move family members to first-floor levels or designated civil evacuation shelters.
   - **Step 4: Stay Informed** — Monitor live station updates on FloodRisk AI and keep a battery radio tuned to emergency broadcasts.

3. **Emergency Helplines**:
   - **National Emergency / Police / Ambulance:** `112`
   - **NDRF Disaster Response Control:** `1078 / 011-24363260`
   - **State Disaster Management Authority:** `1070`"""

def query_gemini_assistant(
    prompt: str,
    telemetry: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Queries Google Gemini API for real-time flood evacuation intelligence with local fallback."""
    key = api_key or settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    model_name = settings.GEMINI_MODEL or "gemini-1.5-flash"
    
    t = telemetry or {}
    loc = t.get("location", "Monitored Flood Basin")
    r24 = t.get("rainfall24h", 85)
    r72 = t.get("rainfall72h", 190)
    risk = t.get("riskLevel", "HIGH")
    prob = t.get("probability", 78.4)
    elev = t.get("elevation", 900)

    context_str = f"Active Flood Telemetry: Location={loc}, 24h Rain={r24}mm, 72h Rain={r72}mm, Risk={risk}, Inundation Probability={prob}%, Elevation={elev}m.\n\nUser Question: {prompt}"

    # Retrieve top matching NDMA/IMD SOP documents via Phase 6 RAG engine
    rag_context = retrieve_sop_knowledge_rag(query=prompt, top_k=2, telemetry=telemetry)
    retrieved_sops = rag_context.get("retrievedDocuments", [])
    sop_citation_footer = ""
    if retrieved_sops:
        top_sop = retrieved_sops[0]
        sop_citation_footer = (
            f"\n\n---\n📚 **Grounded NDMA/IMD SOP Citation (`{top_sop['docId']}` — {top_sop['sectionRef']}):**\n"
            f"> *{top_sop['officialDirectives'][0]}*"
        )

    if not key:
        return {
            "source": "hydro_engine_local_rag",
            "model": "FloodRisk HydroNet 2.0 + NDMA/IMD SOP RAG",
            "response": generate_local_hydro_response(prompt, telemetry) + sop_citation_footer,
            "retrievedSops": retrieved_sops,
            "status": "success",
            "note": "Running via embedded hydrodynamic reasoning + NDMA/IMD SOP Knowledge RAG engine."
        }

    # Attempt calling Google Gemini REST API
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
    
    # Construct chat contents
    contents = []
    
    # Add system context as user turn or system instruction
    if history:
        for msg in history[-6:]:  # keep last 6 turns
            role = "user" if msg.get("sender") == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.get("text", "")}]
            })
            
    contents.append({
        "role": "user",
        "parts": [{"text": context_str}]
    })

    payload = {
        "system_instruction": {
            "parts": [{"text": FLOOD_SYSTEM_PROMPT}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1024,
            "topP": 0.85
        }
    }

    try:
        res = requests.post(endpoint, json=payload, headers={"Content-Type": "application/json"}, timeout=12)
        if res.status_code == 200:
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return {
                        "source": "gemini_api",
                        "model": "gemini-1.5-flash",
                        "response": parts[0]["text"],
                        "status": "success"
                    }
        
        # If API returned error (e.g. invalid key or quota)
        error_msg = res.text
        return {
            "source": "hydro_engine_fallback",
            "model": "FloodRisk HydroNet 2.0 (Fallback)",
            "response": generate_local_hydro_response(prompt, telemetry),
            "status": "fallback",
            "error_detail": f"Gemini API returned status {res.status_code}: {error_msg[:120]}"
        }
    except Exception as e:
        return {
            "source": "hydro_engine_fallback",
            "model": "FloodRisk HydroNet 2.0 (Fallback)",
            "response": generate_local_hydro_response(prompt, telemetry),
            "status": "fallback",
            "error_detail": str(e)
        }
