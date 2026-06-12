import json
import os

cities_map = {
    "Bangalore": {"lat": 12.9716, "lng": 77.5946},
    "Delhi": {"lat": 28.6139, "lng": 77.2090},
    "Mumbai": {"lat": 19.0760, "lng": 72.8777},
    "Hyderabad": {"lat": 17.3850, "lng": 78.4867},
    "Pune": {"lat": 18.5204, "lng": 73.8567},
}

def get_closest_city(lat, lng):
    closest_city = None
    min_dist = 0.45  # ~50 km threshold
    for city_name, coords in cities_map.items():
        dist = ((lat - coords["lat"])**2 + (lng - coords["lng"])**2)**0.5
        if dist < min_dist:
            min_dist = dist
            closest_city = city_name
    return closest_city

base_dir = "data/external/jatin-dot-py-darkstores/public"

# 1. Parse Blinkit
blinkit_path = os.path.join(base_dir, "blinkit.json")
with open(blinkit_path, "r", encoding="utf-8") as f:
    blinkit_data = json.load(f)

# 2. Parse Swiggy Instamart
swiggy_path = os.path.join(base_dir, "swiggy.json")
with open(swiggy_path, "r", encoding="utf-8") as f:
    swiggy_data = json.load(f)

# 3. Parse Zepto
zepto_path = os.path.join(base_dir, "zepto.json")
with open(zepto_path, "r", encoding="utf-8") as f:
    zepto_data = json.load(f)

print(f"Total raw stores: Blinkit={len(blinkit_data)}, Swiggy={len(swiggy_data)}, Zepto={len(zepto_data)}")

city_counts = {city: {"Blinkit": 0, "Swiggy Instamart": 0, "Zepto": 0} for city in cities_map}

# Process Blinkit
for store in blinkit_data:
    lat, lng = store["coordinates"]
    city = get_closest_city(lat, lng)
    if city:
        city_counts[city]["Blinkit"] += 1

# Process Swiggy
for store in swiggy_data:
    lat, lng = store["coordinates"]
    city = get_closest_city(lat, lng)
    if city:
        city_counts[city]["Swiggy Instamart"] += 1

# Process Zepto
unique_cities = {}
for store in zepto_data:
    city = store.get("city", "Unknown")
    unique_cities[city] = unique_cities.get(city, 0) + 1
    lat, lng = store["lat"], store["lng"]
    city_focus = get_closest_city(lat, lng)
    if city_focus:
        city_counts[city_focus]["Zepto"] += 1

print("\nZepto Unique Cities in Dataset:")
for city, count in sorted(unique_cities.items(), key=lambda x: x[1], reverse=True):
    print(f"  {city}: {count}")


print("\nMapped Stores Count by Focus City:")
total_mapped = 0
for city, platforms in city_counts.items():
    city_total = sum(platforms.values())
    total_mapped += city_total
    print(f"  {city}: {city_total} (Blinkit={platforms['Blinkit']}, Swiggy={platforms['Swiggy Instamart']}, Zepto={platforms['Zepto']})")

print(f"\nTotal Mapped Stores across 5 cities: {total_mapped}")
