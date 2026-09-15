"""
Hospital Discovery Service for TriageMed.
Finds real emergency hospitals and trauma centers near given coordinates.
Queries OpenStreetMap Overpass API with local fallback to verified emergency hospitals.
"""

import math
import urllib.request
import urllib.parse
import json
from typing import List, Dict, Any, Optional

# Verified Emergency & Trauma Centers Directory (Ground Truth Benchmark)
VERIFIED_EMERGENCY_HOSPITALS = [
    {
        "name": "Sassoon General Hospital & Government Medical College",
        "type": "Level-1 Government Trauma Center & 24/7 ER",
        "lat": 18.5262,
        "lon": 73.8741,
        "emergency_phone": "020-26128000",
        "address": "Station Road, near Pune Railway Station, Pune 411001",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "Ruby Hall Clinic (Grant Medical Foundation)",
        "type": "NABH Multi-Speciality Emergency & Cath Lab",
        "lat": 18.5332,
        "lon": 73.8778,
        "emergency_phone": "020-66455100",
        "address": "40 Sassoon Road, Sangamvadi, Pune 411001",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "Jehangir Hospital",
        "type": "Tertiary Care Emergency & Critical Care",
        "lat": 18.5298,
        "lon": 73.8765,
        "emergency_phone": "020-66819999",
        "address": "32 Sassoon Road, Opposite Pune Station, Pune 411001",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "Deenanath Mangeshkar Hospital & Research Center",
        "type": "Advanced Trauma & Multi-Organ Critical Care",
        "lat": 18.5034,
        "lon": 73.8315,
        "emergency_phone": "020-40151000",
        "address": "Near Mhatre Bridge, Erandwane, Pune 411004",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "KEM Hospital Pune",
        "type": "Tertiary Care Teaching Hospital & 24/7 Casualty",
        "lat": 18.5218,
        "lon": 73.8687,
        "emergency_phone": "020-66037300",
        "address": "489 Rasta Peth, Sardar Moodliar Road, Pune 411011",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "Sahyadri Super Speciality Hospital (Deccan Gymkhana)",
        "type": "Comprehensive Stroke & Cardiac Resus Center",
        "lat": 18.5133,
        "lon": 73.8385,
        "emergency_phone": "020-67213000",
        "address": "Plot No. 30-C, Erandvane, Karve Road, Pune 411004",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "Poona Hospital and Research Centre",
        "type": "General Acute Emergency & Intensive Care",
        "lat": 18.5109,
        "lon": 73.8472,
        "emergency_phone": "020-66096000",
        "address": "27 Sadashiv Peth, Near Alka Talkies, Pune 411030",
        "has_icu": True,
        "has_cath_lab": False,
        "open_24_7": True,
    },
    {
        "name": "Sancheti Hospital for Orthopaedics & Trauma",
        "type": "Specialized Orthopaedic Trauma & Fracture Unit",
        "lat": 18.5294,
        "lon": 73.8524,
        "emergency_phone": "020-28999999",
        "address": "16 Shivajinagar, Pune 411005",
        "has_icu": True,
        "has_cath_lab": False,
        "open_24_7": True,
    },
    {
        "name": "Lilavati Hospital and Research Centre (Mumbai)",
        "type": "Premier Multi-Specialty & Cardiac Emergency",
        "lat": 19.0514,
        "lon": 72.8295,
        "emergency_phone": "022-26751000",
        "address": "A-791 Bandra Reclamation, Bandra West, Mumbai 400050",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "KEM Hospital Mumbai (Parel)",
        "type": "Level-1 Apex Trauma & Emergency Medical Center",
        "lat": 19.0028,
        "lon": 72.8427,
        "emergency_phone": "022-24107000",
        "address": "Acharya Donde Marg, Parel, Mumbai 400012",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "AIIMS New Delhi (Main Emergency & Trauma Centre)",
        "type": "Apex National Trauma Center & Resuscitation ER",
        "lat": 28.5672,
        "lon": 77.2100,
        "emergency_phone": "011-26588500",
        "address": "Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    },
    {
        "name": "Safdarjung Hospital & Vardhman Mahavir Medical College",
        "type": "Level-1 Multi-Disciplinary Emergency Center",
        "lat": 28.5705,
        "lon": 77.2078,
        "emergency_phone": "011-26165060",
        "address": "Ring Road, Opposite AIIMS, New Delhi 110029",
        "has_icu": True,
        "has_cath_lab": True,
        "open_24_7": True,
    }
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two geographic coordinates in kilometers.
    """
    R = 6371.0  # Earth's radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def query_overpass_hospitals(lat: float, lon: float, radius_km: float = 12.0) -> List[Dict[str, Any]]:
    """
    Queries OpenStreetMap Overpass API for actual real-world hospital nodes.
    """
    radius_m = int(radius_km * 1000)
    query = f"""[out:json][timeout:6];
(
  node["amenity"="hospital"](around:{radius_m},{lat},{lon});
  way["amenity"="hospital"](around:{radius_m},{lat},{lon});
);
out center 15;"""

    url = "https://overpass-api.de/api/interpreter?data=" + urllib.parse.quote(query)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "TriageMed-Clinical-Navigator/2.0"}
    )

    hospitals = []
    try:
        with urllib.request.urlopen(req, timeout=7) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            elements = data.get("elements", [])
            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name") or tags.get("name:en")
                if not name:
                    continue

                # Node coordinates or way center coordinates
                h_lat = el.get("lat") or el.get("center", {}).get("lat")
                h_lon = el.get("lon") or el.get("center", {}).get("lon")
                if not h_lat or not h_lon:
                    continue

                dist = haversine_distance(lat, lon, h_lat, h_lon)
                phone = tags.get("phone") or tags.get("contact:phone") or "108"
                street = tags.get("addr:street") or tags.get("addr:suburb") or "Local Emergency Ward"
                city = tags.get("addr:city") or ""
                addr_full = f"{street}, {city}".strip(", ")

                hospitals.append({
                    "id": f"osm-{el.get('id')}",
                    "name": name,
                    "type": "General Hospital / 24/7 Casualty",
                    "lat": round(h_lat, 6),
                    "lon": round(h_lon, 6),
                    "distance_km": round(dist, 2),
                    "drive_time_min": max(3, int(dist * 2.5 + 4)),
                    "emergency_phone": phone,
                    "address": addr_full,
                    "has_icu": True,
                    "has_cath_lab": "cardiology" in str(tags).lower(),
                    "open_24_7": tags.get("opening_hours") == "24/7" or tags.get("emergency") == "yes",
                    "directions_url": f"https://www.google.com/maps/dir/?api=1&destination={h_lat},{h_lon}"
                })
    except Exception as e:
        print(f"[Hospitals] Overpass query note: {e}")

    return hospitals


def get_nearby_hospitals(
    lat: float,
    lon: float,
    radius_km: float = 25.0
) -> List[Dict[str, Any]]:
    """
    Returns verified and geolocated nearby hospitals sorted by nearest distance.
    Combines live OpenStreetMap data with verified emergency centers.
    """
    results: List[Dict[str, Any]] = []

    # 1. Try real-time OpenStreetMap Overpass query
    osm_results = query_overpass_hospitals(lat, lon, radius_km=min(radius_km, 15.0))
    if osm_results:
        results.extend(osm_results)

    # 2. Match with verified database (guaranteed high-quality benchmark centers)
    seen_names = set(h["name"].lower() for h in results)

    for h in VERIFIED_EMERGENCY_HOSPITALS:
        dist = haversine_distance(lat, lon, h["lat"], h["lon"])
        if dist <= radius_km:
            if not any(h["name"].lower()[:12] in s for s in seen_names):
                results.append({
                    "id": f"verified-{int(h['lat']*1000)}",
                    "name": h["name"],
                    "type": h["type"],
                    "lat": h["lat"],
                    "lon": h["lon"],
                    "distance_km": round(dist, 2),
                    "drive_time_min": max(3, int(dist * 2.3 + 4)),
                    "emergency_phone": h["emergency_phone"],
                    "address": h["address"],
                    "has_icu": h["has_icu"],
                    "has_cath_lab": h["has_cath_lab"],
                    "open_24_7": h["open_24_7"],
                    "directions_url": f"https://www.google.com/maps/dir/?api=1&destination={h['lat']},{h['lon']}"
                })

    # If user is outside standard radius (e.g. testing in a remote location),
    # return the closest 5 verified centers with actual distances calculated
    if not results:
        sorted_verified = sorted(
            VERIFIED_EMERGENCY_HOSPITALS,
            key=lambda x: haversine_distance(lat, lon, x["lat"], x["lon"])
        )[:6]
        for h in sorted_verified:
            dist = haversine_distance(lat, lon, h["lat"], h["lon"])
            results.append({
                "id": f"verified-{int(h['lat']*1000)}",
                "name": h["name"],
                "type": h["type"],
                "lat": h["lat"],
                "lon": h["lon"],
                "distance_km": round(dist, 2),
                "drive_time_min": max(3, int(dist * 2.3 + 4)),
                "emergency_phone": h["emergency_phone"],
                "address": h["address"],
                "has_icu": h["has_icu"],
                "has_cath_lab": h["has_cath_lab"],
                "open_24_7": h["open_24_7"],
                "directions_url": f"https://www.google.com/maps/dir/?api=1&destination={h['lat']},{h['lon']}"
            })

    # Sort strictly by nearest distance
    results.sort(key=lambda x: x["distance_km"])
    return results[:10]
