import React, { useState, useEffect, useRef } from 'react';
import ReactMapGL, { Marker, NavigationControl, GeolocateControl, Popup, Source, Layer } from 'react-map-gl';
import { Fuel, DollarSign, MapPin, Navigation, X } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const GasStationMap = () => {
  const mapRef = useRef(null);
  const [viewport, setViewport] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    zoom: 4,
    width: '100%',
    height: '100%'
  });

  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [gasStations, setGasStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          setViewport((prev) => ({ ...prev, ...location, zoom: 12 }));
          searchNearbyGasStations(location.latitude, location.longitude);
        },
        (err) => console.log('Geolocation error:', err)
      );
    }
  }, []);

  useEffect(() => {
    if (userLocation && destinationCoords && mapRef.current) {
      calculateRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, destinationCoords]);

  const searchNearbyGasStations = (lat, lng) => {
    const mockStations = [
      { id: 1, name: 'Shell', lat: lat + 0.01, lng: lng + 0.01, price: 3.45, address: '123 Main St', distance: 0.5 },
      { id: 2, name: 'BP', lat: lat - 0.015, lng: lng + 0.02, price: 3.39, address: '456 Oak Ave', distance: 0.8 },
      { id: 3, name: 'Chevron', lat: lat + 0.02, lng: lng - 0.01, price: 3.52, address: '789 Pine Rd', distance: 1.2 }
    ];
    setGasStations(mockStations);
  };

  const handleDestinationSearch = async (e) => {
    e.preventDefault();
    if (!destination || !MAPBOX_TOKEN) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          destination
        )}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const coords = { latitude: lat, longitude: lng };
        setDestinationCoords(coords);
        setViewport((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          zoom: Math.max(prev.zoom, 11)
        }));
        searchNearbyGasStations(lat, lng);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRoute = async () => {
    if (!userLocation || !destinationCoords || !MAPBOX_TOKEN) return;

    setLoading(true);
    try {
      const start = `${userLocation.longitude},${userLocation.latitude}`;
      const end = `${destinationCoords.longitude},${destinationCoords.latitude}`;
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `geometries=geojson&` +
        `overview=full&` +
        `steps=true&` +
        `alternatives=false`
      );

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        setRoute({
          type: 'Feature',
          geometry: routeData.geometry
        });

        // Calculate route info
        const distance = (routeData.distance / 1609.34).toFixed(1); // Convert meters to miles
        const duration = Math.round(routeData.duration / 60); // Convert seconds to minutes
        setRouteInfo({
          distance: `${distance} mi`,
          duration: `${duration} min`
        });

        // Fit bounds to show entire route
        if (mapRef.current && mapRef.current.getMap) {
          const map = mapRef.current.getMap();
          const coordinates = routeData.geometry.coordinates;
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          map.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 100, right: 100 },
            duration: 1000
          });
        }
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearRoute = () => {
    setRoute(null);
    setRouteInfo(null);
    setDestinationCoords(null);
    setDestination('');
  };

  const cheapestStation = gasStations.length
    ? gasStations.reduce((min, s) => (s.price < min.price ? s : min))
    : null;

  return (
    <div className="relative w-full h-full bg-gray-100">
      {/* Search Bar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-2xl px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-4 backdrop-blur-sm bg-opacity-95">
          <form onSubmit={handleDestinationSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter your destination..."
                className="w-full pl-12 pr-4 py-3 rounded-xl text-base font-medium border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-gray-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  <span>Route</span>
                </>
              )}
            </button>
            {route && (
              <button
                type="button"
                onClick={clearRoute}
                className="bg-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:bg-gray-300 transition-all flex items-center"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Route Info Card */}
      {routeInfo && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 font-semibold backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5" />
            <span>{routeInfo.distance}</span>
          </div>
          <div className="w-px h-6 bg-white opacity-30"></div>
          <div className="flex items-center gap-2">
            <span>⏱</span>
            <span>{routeInfo.duration}</span>
          </div>
        </div>
      )}

      {/* Cheapest Station Badge */}
      {cheapestStation && !routeInfo && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold backdrop-blur-sm">
          <DollarSign className="w-5 h-5" />
          <span>
            Cheapest: {cheapestStation.name} - ${cheapestStation.price}/gal
          </span>
        </div>
      )}

      <ReactMapGL
        {...viewport}
        ref={mapRef}
        mapboxApiAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        onViewportChange={(vp) => setViewport(vp)}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl 
          style={{ right: 10, top: 10 }} 
          showCompass={true}
          showZoom={true}
        />
        <GeolocateControl 
          style={{ right: 10, top: 80 }} 
          trackUserLocation 
          showUserHeading 
          positionOptions={{ enableHighAccuracy: true }}
        />

        {/* Route Layer */}
        {route && (
          <Source id="route" type="geojson" data={route}>
            <Layer
              id="route-line"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#3b82f6',
                'line-width': 5,
                'line-opacity': 0.8
              }}
            />
            <Layer
              id="route-outline"
              type="line"
              layout={{
                'line-join': 'round',
                'line-cap': 'round'
              }}
              paint={{
                'line-color': '#ffffff',
                'line-width': 7,
                'line-opacity': 0.3
              }}
            />
          </Source>
        )}

        {/* User Location Marker */}
        {userLocation && (
          <Marker latitude={userLocation.latitude} longitude={userLocation.longitude}>
            <div className="relative">
              <div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-xl animate-pulse"></div>
              <div className="absolute inset-0 w-6 h-6 bg-blue-400 rounded-full border-2 border-white animate-ping opacity-75"></div>
            </div>
          </Marker>
        )}

        {/* Destination Marker */}
        {destinationCoords && (
          <Marker latitude={destinationCoords.latitude} longitude={destinationCoords.longitude}>
            <div className="relative">
              <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                Destination
              </div>
            </div>
          </Marker>
        )}

        {/* Gas Station Markers */}
        {gasStations.map((station) => (
          <Marker key={station.id} latitude={station.lat} longitude={station.lng}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xl cursor-pointer transform transition-all hover:scale-110 ${
                station.id === cheapestStation?.id 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                  : 'bg-gradient-to-br from-red-500 to-red-600'
              }`}
              onClick={() => setSelectedStation(station)}
            >
              <Fuel className="w-5 h-5 text-white" />
            </div>
          </Marker>
        ))}

        {/* Gas Station Popup */}
        {selectedStation && (
          <Popup
            latitude={selectedStation.lat}
            longitude={selectedStation.lng}
            onClose={() => setSelectedStation(null)}
            closeButton={true}
            anchor="bottom"
            className="custom-popup"
          >
            <div className="p-2">
              <h3 className="font-bold text-lg mb-1">{selectedStation.name}</h3>
              <p className="text-gray-600 text-sm mb-2">{selectedStation.address}</p>
              <p className="font-bold text-xl text-green-600 mb-1">${selectedStation.price}/gal</p>
              <p className="text-gray-500 text-sm">{selectedStation.distance} mi away</p>
            </div>
          </Popup>
        )}
      </ReactMapGL>
    </div>
  );
};

export default GasStationMap;
