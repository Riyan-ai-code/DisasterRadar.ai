import os
import requests
import json
import re
from typing import Dict, Any, List, Optional
from config import settings
from services.nlp_rag_engine import retrieve_sop_knowledge_rag

from services.geospatial_api import geocode_place_name, get_live_weather_by_location_or_coords
from services.ensemble_predictor import predict_flood_risk_ensemble
from models.schemas import PredictionInput

# Conversational system instruction prompt grounding Gemini strictly in disaster & life-safety intelligence
FLOOD_SYSTEM_PROMPT = """You are "FloodGuard Copilot", the expert AI Flood Prevention, Early Warning & Disaster Intelligence Assistant for the DisasterRadar.ai platform.

STRICT DOMAIN BOUNDARY & OPERATIONAL RULES:
1. EXCLUSIVE DISASTER & EVACUATION FOCUS: You are dedicated EXCLUSIVELY to flood prevention, severe meteorological hazards, inundation modeling, disaster resilience, life-safety evacuation protocols, and emergency relief operations.
2. ABSOLUTE PROHIBITION ON CODE GENERATION: NEVER generate computer programming code (Python, JavaScript, C++, HTML, SQL, etc.), software scripts, or technical coding solutions. NEVER solve software engineering or coding interview problems.
3. HANDLING OFF-TOPIC OR CODING REQUESTS:
   If a user asks you to write code, solve a programming problem, or asks about non-disaster topics (e.g. general software development, cooking recipes, gaming, creative stories, celebrity trivia):
   You MUST politely decline with professional composure, explaining:
   "I am FloodGuard AI, an assistant dedicated exclusively to disaster intelligence, flood prevention, and evacuation safety on DisasterRadar.ai. I cannot generate programming code or answer queries outside of disaster management. Please feel free to ask about live flood risks, home defenses, evacuation routes, or storm safety."
4. DIRECT CONVERSATIONAL STYLE:
   - For disaster-related queries, answer directly, smartly, and conversationally.
   - Ground location queries in the provided live telemetry (24h rain, elevation, flood probability %, risk tier).
   - Do NOT repeat rigid canned boilerplate or unsolicited emergency number lists on every turn unless the user is facing an active emergency or asks for helplines.
5. Tone: Authoritative, empathetic, clear, concise, and realistic. Keep markdown formatting clean with bold text and short bullet points.
"""

STOP_WORDS = {
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'what', 'which', 'who', 'whom',
    'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because',
    'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
    'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
    'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
    'flood', 'floods', 'flooding', 'rain', 'rainfall', 'water', 'risk', 'safe', 'safety', 'danger', 'alert',
    'weather', 'check', 'status', 'tell', 'forecast', 'situation', 'level', 'home', 'house', 'car', 'pet',
    'evacuate', 'evacuation', 'shelter', 'protect', 'help', 'give', 'data', 'live', 'telemetry', 'station',
    'right', 'today', 'tomorrow', 'yesterday', 'please', 'thanks', 'thank', 'hello', 'hi', 'hey', 'good'
}

def is_off_topic_query(prompt: str) -> bool:
    """Checks if a user query is asking for computer programming code or non-disaster tasks."""
    p = prompt.lower().strip()
    
    code_patterns = [
        r'\b(?:write|generate|give|create|show|debug|fix)\s+(?:me\s+)?(?:some\s+)?(?:python|javascript|typescript|c\+\+|java|c#|html|css|sql|bash|shell|php|rust|go|ruby|r|kotlin|swift)?\s*(?:code|script|program|function|class|algorithm|regex|query|component)\b',
        r'\b(?:code\s+for|script\s+for|algorithm\s+for|function\s+to|write\s+a\s+program)\b',
        r'\b(?:import\s+react|def\s+\w+\(|function\s+\w+\(|console\.log|<html>|<script>|public\s+static\s+void)\b',
        r'\b(?:leetcode|two\s+sum|binary\s+search|bubble\s+sort|merge\s+sort|linked\s+list)\b'
    ]
    for pat in code_patterns:
        if re.search(pat, p):
            return True
            
    if any(k in p for k in [
        'write code', 'generate code', 'write a function', 'write a script', 
        'write a python', 'write python', 'write javascript', 'coding question',
        'programming language', 'syntax error in', 'write an html', 'write a sql',
        'solve in python', 'write a regex', 'code to', 'code that'
    ]):
        return True

    return False


def get_off_topic_refusal() -> str:
    """Delivers a professional refusal when a user asks for code or non-disaster tasks."""
    return (
        "I am **FloodGuard AI**, an expert disaster intelligence and evacuation assistant built exclusively for the **DisasterRadar.ai** platform.\n\n"
        "I cannot generate programming code or assist with tasks outside of emergency disaster management.\n\n"
        "I am specialized strictly to assist you with:\n"
        "• **Flood Risk & Live Telemetry** for any global city or river basin\n"
        "• **Early Evacuation Planning & Certified High-Ground Shelters**\n"
        "• **Home Flood Defense & Sandbag Barrier Formulas**\n"
        "• **Utility & Electrical Isolation (Main Breaker MCB Shutdown)**\n"
        "• **72-Hour Emergency Go-Bag & Medication Checklists**\n"
        "• **Vehicle Flood Survival ('Turn Around, Don't Drown')**\n\n"
        "Please feel free to ask any question regarding flood safety, storm tracking, or emergency preparedness!"
    )


def extract_location_from_prompt(prompt: str) -> Optional[Dict[str, Any]]:
    """Detects and geocodes any city, state, or location requested in the user prompt."""
    if not prompt or not prompt.strip():
        return None
    
    clean_p = prompt.strip()
    words = re.sub(r'[^\w\s]', ' ', clean_p).split()
    candidates = []
    
    triggers = {'in', 'at', 'for', 'near', 'around', 'about', 'check', 'of'}
    for i, w in enumerate(words):
        if w.lower() in triggers and i + 1 < len(words):
            w1 = words[i+1].strip()
            if i + 2 < len(words):
                w2 = words[i+2].strip()
                if w2.lower() not in STOP_WORDS:
                    candidates.append(f"{w1} {w2}")
            if w1.lower() not in STOP_WORDS and len(w1) >= 3:
                candidates.append(w1)
                
    orig_words = re.sub(r'[?!.,;:"\']', '', clean_p).split()
    for i, w in enumerate(orig_words):
        if w and w[0].isupper() and w.lower() not in STOP_WORDS:
            if i + 1 < len(orig_words) and orig_words[i+1] and orig_words[i+1][0].isupper() and orig_words[i+1].lower() not in STOP_WORDS:
                candidates.append(f"{w} {orig_words[i+1]}")
            candidates.append(w)
                
    seen = set()
    uniq = []
    for c in candidates:
        cl = c.lower().strip()
        if cl and cl not in seen and cl not in STOP_WORDS and len(cl) >= 3:
            seen.add(cl)
            uniq.append(c.strip())
            
    for cand in uniq:
        geo = geocode_place_name(cand)
        if geo:
            return geo
    return None


def generate_local_hydro_response(prompt: str, telemetry: Optional[Dict[str, Any]] = None) -> str:
    """Dynamic, question-specific local reasoning engine when Gemini API is offline."""
    p_lower = prompt.lower()
    t = telemetry or {}
    loc = t.get("location", "Monitored Flood Basin")
    r24 = t.get("rainfall24h", 0.0)
    r72 = t.get("rainfall72h", 0.0)
    risk = t.get("riskLevel", "LOW")
    prob = t.get("probability", 15.0)
    elev = t.get("elevation", 50.0)
    w_cond = t.get("weatherCondition", "Clear / Dry")
    temp = t.get("temperature", 25.0)

    # Check off-topic guardrail first
    if is_off_topic_query(prompt):
        return get_off_topic_refusal()

    # Greeting
    if p_lower.strip() in ["hi", "hello", "hey", "help", "who are you", "what can you do"]:
        return f"Hello! I am **FloodGuard AI**, your real-time flood intelligence and life-safety assistant. I'm currently tracking live telemetry for **{loc}** (Elevation: {elev}m, 24h Rain: {r24}mm, Flood Risk: **{risk}** at {prob}%).\n\nYou can ask me about flood risks in any city, home defense barriers, vehicle safety, emergency kits, or weather updates!"

    # Location status / weather / risk question
    if any(k in p_lower for k in ["risk", "status", "safe", "weather", "rain", "situation", "how is", "what about", "is it", "current", "telemetry", "condition"]):
        if prob >= 70 or risk in ["HIGH", "CRITICAL"]:
            assessment = f"⚠️ **High Flood Alert for {loc}**: Inundation probability is elevated at **{prob}%** with recent rainfall of `{r24} mm`. Given terrain elevation of `{elev} m`, low-lying roads and ground-floor properties face rapid surface inundation. Move valuables to higher floors, isolate main power (MCB) if water approaches sockets, and prepare an emergency go-bag."
        elif prob >= 35 or risk == "MODERATE":
            assessment = f"⚡ **Moderate Advisory for {loc}**: Inundation probability is **{prob}%** with 24h rainfall of `{r24} mm` and elevation at `{elev} m`. Surface runoff and minor street ponding are possible. Clear exterior storm drains and keep emergency contacts ready."
        else:
            assessment = f"✅ **Low Flood Risk for {loc}**: Current conditions are safe with an inundation probability of **{prob}%** and `{r24} mm` of recent rainfall. Terrain elevation is `{elev} m` and the regional weather is {w_cond} ({temp}°C)."

        return f"### 📍 Live Telemetry & Risk Assessment: {loc}\n\n" \
               f"• **Current Weather**: {w_cond} ({temp}°C)\n" \
               f"• **24h Acute Rainfall**: `{r24} mm` | **72h Accumulation**: `{r72} mm`\n" \
               f"• **Terrain Elevation**: `{elev} meters`\n" \
               f"• **Super-Stack Ensemble Prediction**: **{risk}** (`{prob}%` probability)\n\n" \
               f"{assessment}"

    # Sandbags & Home Barriers
    elif any(k in p_lower for k in ["barrier", "sandbag", "prevention", "protect home", "enter home", "door", "window", "basement", "seal"]):
        return f"### 🚧 Home Flood Defense & Barrier Protocol for {loc}\n\n" \
               f"1. **Pyramid Sandbagging**:\n" \
               f"   - Fill woven polypropylene bags only **half to two-thirds full**.\n" \
               f"   - Place parallel to water flow, overlapping seams like brickwork with flaps tucked underneath.\n" \
               f"   - Maintain a 1.5:1 base-to-height ratio (e.g. 3 bags base for a 2-bag high barrier).\n\n" \
               f"2. **Polyethylene Door Shielding**:\n" \
               f"   - Drape continuous 6-mil polyethylene plastic sheeting across exterior doorway frames, extending 1 meter up and 1 meter onto the ground.\n" \
               f"   - Clamp edges with polyurethane sealant or heavy tape and weight down with sandbags.\n\n" \
               f"3. **Local Telemetry Note**: In {loc}, ground elevation is `{elev}m`. Ensure water diverts towards designated municipal storm channels."

    # Car & Vehicle Safety
    elif any(k in p_lower for k in ["car", "vehicle", "drive", "stalled", "engine", "exhaust", "underpass"]):
        return f"### 🚗 Vehicle Flood Safety Protocol\n\n" \
               f"1. **Buoyancy Limits**:\n" \
               f"   - **30 cm (12 inches)** of moving water floats sedans and compact cars, causing instant hydro-lock.\n" \
               f"   - **60 cm (24 inches)** sweeps away SUVs, trucks, and ambulances.\n\n" \
               f"2. **If Stalled in Water**:\n" \
               f"   - **Unbuckle immediately.** Do not attempt to restart a submerged engine.\n" \
               f"   - **Lower windows immediately** before electrical shorts disable the motor.\n" \
               f"   - Climb onto the vehicle roof and signal emergency responders (Dial **112**).\n\n" \
               f"3. **Rule of Thumb**: 'Turn Around, Don't Drown' — never enter flooded underpasses."

    # Electricity & Utilities
    elif any(k in p_lower for k in ["electric", "breaker", "mcb", "socket", "power", "shock", "appliance", "fridge"]):
        return f"### ⚡ Electrical & Utility Safety\n\n" \
               f"1. **Main Circuit Breaker (MCB) Shutdown**:\n" \
               f"   - Switch off the main electrical breaker **before** water reaches 15 cm socket height.\n" \
               f"   - Never touch electrical boxes with wet hands or while standing in puddle water.\n\n" \
               f"2. **Inverter & Battery Protection**:\n" \
               f"   - Disconnect solar DC isolators and elevate inverters/battery banks onto masonry plinths.\n\n" \
               f"3. **LPG Gas Cylinders**:\n" \
               f"   - Strap cylinders upright to window grilles to avoid valve shear and flammable leaks."

    # Water purification
    elif any(k in p_lower for k in ["water", "drink", "boil", "well", "purify", "chlorine", "infection", "snake", "lepto"]):
        return f"### 🚰 Drinking Water & Public Health\n\n" \
               f"1. **Decontamination**:\n" \
               f"   - Bring drinking water to a **vigorous rolling boil for 3 full minutes** before consumption.\n" \
               f"   - Alternatively, use 2 drops of 6% unscented chlorine bleach per 1 liter of clear water; let stand 30 minutes.\n\n" \
               f"2. **Floodwater Hazards**:\n" \
               f"   - Avoid wading without waterproof boots to prevent *Leptospirosis* infection and submerged snake bites.\n" \
               f"   - Do not use submerged borewells until sanitized with bleaching powder."

    # Emergency Pack & Go-Bag
    elif any(k in p_lower for k in ["pack", "go bag", "kit", "bag", "prepare", "supplies", "document", "medicine"]):
        return f"### 🎒 Emergency 72-Hour Go-Bag Checklist\n\n" \
               f"1. **Floating Waterproof Pouch**: Government IDs, land deeds, insurance policies, and cash.\n" \
               f"2. **Medical Supplies**: 14-day supply of critical prescriptions (insulin, cardiac medications), antiseptic wipes, and bandaging.\n" \
               f"3. **Survival Essentials**: 3 liters of sealed drinking water per person, high-calorie energy bars, LED flashlight, emergency whistle, and charged power banks.\n" \
               f"4. **Location Readiness**: Keep the go-bag ready near the highest exit point of your home in {loc}."

    # Generic contextual response
    else:
        return f"### 🛡️ FloodGuard Intelligence for {loc}\n\n" \
               f"Regarding your query on *\"{prompt}\"*:\n\n" \
               f"Current hydrological telemetry for **{loc}** indicates a flood risk level of **{risk}** with **{prob}%** inundation probability and `{r24} mm` of recent rainfall (Elevation: `{elev} m`).\n\n" \
               f"• Ensure storm gutters and perimeter drains remain unobstructed.\n" \
               f"• Keep battery backups and essential communications charged.\n" \
               f"• If you have specific questions about barriers, evacuation routes, or vehicle safety, feel free to ask!"


def query_gemini_assistant(
    prompt: str,
    telemetry: Optional[Dict[str, Any]] = None,
    history: Optional[List[Dict[str, str]]] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Flood Prevention AI Chatbot query function with:
    1. Strict disaster domain guardrail & code generation refusal
    2. Dynamic location extraction & live telemetry updating
    3. Google Gemini multi-model fallback chain
    4. Conversational hydrodynamic reasoning engine fallback
    """
    from dotenv import load_dotenv
    load_dotenv(override=True)
    key = api_key or os.environ.get("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    
    t = dict(telemetry) if telemetry else {}
    
    # Check strict domain guardrail: refuse code generation or non-disaster tasks
    if is_off_topic_query(prompt):
        return {
            "source": "domain_guardrail",
            "model": "FloodGuard Guardrail (Disaster Scope)",
            "response": get_off_topic_refusal(),
            "status": "success",
            "telemetry": t
        }

    # 1. Detect if the user asked about a specific location
    new_geo = extract_location_from_prompt(prompt)
    if new_geo:
        weather = get_live_weather_by_location_or_coords(
            latitude=new_geo.get("latitude"),
            longitude=new_geo.get("longitude"),
            location=new_geo.get("name")
        )
        if weather and weather.get("status") in ["success", "fallback"]:
            r24 = float(weather.get("rainfall_24h", 0.0))
            r72 = float(weather.get("rainfall_72h", 0.0))
            elev = float(weather.get("elevation", new_geo.get("elevation", 15.0)))
            temp = float(weather.get("temperature", 25.0))
            hum = float(weather.get("humidity", 60.0))
            wind = float(weather.get("wind_speed", 10.0))
            press = float(weather.get("pressure", 1012.0))
            lat = float(new_geo.get("latitude", 19.0))
            lng = float(new_geo.get("longitude", 72.8))
            loc_label = f"{new_geo['name']}, {new_geo.get('country', '')}".strip(", ")
            
            try:
                pred = predict_flood_risk_ensemble(PredictionInput(
                    rainfall24h=r24,
                    rainfall72h=r72,
                    elevation=elev,
                    temperature=temp,
                    humidity=hum,
                    windSpeed=wind,
                    pressure=press,
                    latitude=lat,
                    longitude=lng,
                    location=loc_label
                ))
                prob_val = pred.probability
                risk_val = pred.riskLevel
            except Exception:
                prob_val = 15.0
                risk_val = "LOW"
            
            t = {
                "location": loc_label,
                "rainfall24h": round(r24, 1),
                "rainfall72h": round(r72, 1),
                "elevation": round(elev, 1),
                "probability": prob_val,
                "riskLevel": risk_val,
                "temperature": round(temp, 1),
                "humidity": round(hum, 1),
                "pressure": round(press, 1),
                "windSpeed": round(wind, 1),
                "weatherCondition": weather.get("weather_condition", "Clear / Dry"),
                "isLocationSwitch": True
            }

    loc = t.get("location", "Monitored Flood Basin")
    r24 = t.get("rainfall24h", 0.0)
    r72 = t.get("rainfall72h", 0.0)
    risk = t.get("riskLevel", "LOW")
    prob = t.get("probability", 15.0)
    elev = t.get("elevation", 50.0)
    w_cond = t.get("weatherCondition", "Clear / Dry")
    temp = t.get("temperature", 25.0)

    context_str = f"""Active Hydrological Telemetry for {loc}:
- Weather: {w_cond}, Temperature: {temp}°C
- 24h Rainfall: {r24} mm | 72h Accumulation: {r72} mm
- Elevation: {elev} meters above sea level
- Super-Stack AI Flood Risk: {risk} ({prob}% Inundation Probability)

User Prompt: {prompt}"""

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
            "telemetry": telemetry,
            "note": "Running via embedded hydrodynamic reasoning + NDMA/IMD SOP Knowledge RAG engine. Configure GEMINI_API_KEY to activate live Google Gemini."
        }

    # Model priority sequence
    candidate_models = [
        os.environ.get("GEMINI_MODEL") or "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest"
    ]
    seen = set()
    candidate_models = [m for m in candidate_models if not (m in seen or seen.add(m))]

    contents = []
    if history:
        for msg in history[-6:]:
            role = "user" if msg.get("sender") == "user" else "model"
            msg_text = msg.get("text", "").strip()
            if msg_text:
                contents.append({
                    "role": role,
                    "parts": [{"text": msg_text}]
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
            "temperature": 0.5,
            "maxOutputTokens": 1024,
            "topP": 0.95
        }
    }

    last_error = ""
    for model_name in candidate_models:
        clean_model = model_name.replace("models/", "")
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={key}"
        try:
            res = requests.post(
                endpoint,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=18
            )
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts and "text" in parts[0]:
                        return {
                            "source": "gemini_api",
                            "model": f"Google Gemini {clean_model} (Live)",
                            "response": parts[0]["text"],
                            "status": "success",
                            "telemetry": t
                        }
            last_error = f"{clean_model} HTTP {res.status_code}: {res.text[:120]}"
        except Exception as e:
            last_error = f"{clean_model} exception: {str(e)}"
            continue

    # Fallback to local hydro reasoning if all models fail
    return {
        "source": "hydro_engine_fallback",
        "model": "FloodRisk HydroNet 2.0 (Fallback)",
        "response": generate_local_hydro_response(prompt, t),
        "status": "fallback",
        "telemetry": t,
        "error_detail": last_error
    }
