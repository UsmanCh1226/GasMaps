import math

# Simple gas station finder - NO fancy APIs needed

# Mock data - hardcode some stations in your area
gas_stations = [
    {"name": "Shell", "lat": 34.0522, "lng": -118.2437, "price": 4.50},
    {"name": "Chevron", "lat": 34.0634, "lng": -118.2405, "price": 4.70},
    {"name": "ARCO", "lat": 34.0489, "lng": -118.2493, "price": 4.30},
    {"name": "76", "lat": 34.0588, "lng": -118.2352, "price": 4.60},
    {"name": "Costco", "lat": 34.0680, "lng": -118.2501, "price": 4.20}
]

def calculate_distance(lat1,lng1,lat2,lng2):
    lat_diff=(lat2-lat1)*69
    lng_diff=(lng2-lng1)*54.6

    distance=math.sqrt(lat_diff**2+lng_diff**2)
    return distance

def find_cheapest_station(user_lat,user_lng,user_mpg,gas_stations,tank_gallons=10):

    best_station=None
    best_total_cost=float('inf')

    for station in gas_stations:
        distance=calculate_distance(user_lat,user_lng,station['lat'],station['lng'])

        gas_used_to_station=distance/user_mpg
        cost_to_drive_there=gas_used_to_station*station["price"]

        cost_to_fill_up=tank_gallons*station["price"]

        total_cost=cost_to_drive_there+cost_to_fill_up
        print(f"{station['name']}: {distance:.1f} miles away")
        print(f"  Price: ${station['price']}/gal")
        print(f"  Drive cost: ${cost_to_drive_there:.2f}")
        print(f"  Fill up cost: ${cost_to_fill_up:.2f}")
        print(f"  TOTAL: ${total_cost:.2f}")
        print("---")

        # Check if this is the best deal so far
        if total_cost < best_total_cost:
            best_total_cost = total_cost
            best_station = station
            best_station["total_cost"] = total_cost
            best_station["distance"] = distance

    return best_station

# Test with your location (change these!)
your_lat = 34.0522  # Your latitude
your_lng = -118.2437  # Your longitude
your_mpg = 25  # Your car's MPG

print("🚗 FINDING CHEAPEST GAS STATION...\n")

result = find_cheapest_station(your_lat, your_lng, your_mpg,gas_stations)

print("\n" + "="*50)
print("🎯 BEST DEAL FOUND!")
print(f"Station: {result['name']}")
print(f"Distance: {result['distance']:.1f} miles")
print(f"Gas Price: ${result['price']}/gal")
print(f"TOTAL COST: ${result['total_cost']:.2f}")
print("="*50)