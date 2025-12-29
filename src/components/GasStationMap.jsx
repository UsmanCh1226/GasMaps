import React, { useState, useEffect, useRef } from 'react';
import ReactMapGL, { Marker, NavigationControl, GeolocateControl, Popup, Source, Layer } from 'react-map-gl';
import { Fuel, DollarSign, MapPin, Navigation, X, Search, Clock, ArrowRight } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Settings from './Settings';
import { useTheme } from '../context/ThemeContext';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const GasStationMap = () => {
  const { isDarkMode } = useTheme();
  const mapRef = useRef(null);
  const searchRef = useRef(null);
  const [viewport, setViewport] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    zoom: 4,
    width: '100%',
    height: '100%'
  });

  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
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

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchNearbyGasStations = (lat, lng) => {
    const mockStations = [
      { id: 1, name: 'Shell', lat: lat + 0.01, lng: lng + 0.01, price: 3.45, address: '123 Main St', distance: 0.5 },
      { id: 2, name: 'BP', lat: lat - 0.015, lng: lng + 0.02, price: 3.39, address: '456 Oak Ave', distance: 0.8 },
      { id: 3, name: 'Chevron', lat: lat + 0.02, lng: lng - 0.01, price: 3.52, address: '789 Pine Rd', distance: 1.2 },
      { id: 4, name: 'Exxon', lat: lat + 0.005, lng: lng - 0.015, price: 3.48, address: '321 Elm St', distance: 0.6 },
      { id: 5, name: 'Mobil', lat: lat - 0.01, lng: lng - 0.01, price: 3.42, address: '654 Maple Dr', distance: 0.9 }
    ];
    setGasStations(mockStations);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim() || !MAPBOX_TOKEN) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=poi,address,place`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const resultsWithRoutes = await Promise.all(
          data.features.map(async (feature) => {
            const [lng, lat] = feature.center;
            let routeData = null;
            
            if (userLocation) {
              routeData = await calculateRouteForResult(
                userLocation.latitude,
                userLocation.longitude,
                lat,
                lng
              );
            }

            return {
              id: feature.id,
              name: feature.text || feature.place_name,
              address: feature.place_name,
              coordinates: { latitude: lat, longitude: lng },
              route: routeData
            };
          })
        );
        
        setSearchResults(resultsWithRoutes);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const calculateRouteForResult = async (startLat, startLng, endLat, endLng) => {
    if (!MAPBOX_TOKEN) return null;

    try {
      const start = `${startLng},${startLat}`;
      const end = `${endLng},${endLat}`;
      
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `geometries=geojson&` +
        `overview=simplified`
      );

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        const distance = (routeData.distance / 1609.34).toFixed(1); // Convert to miles
        const duration = Math.round(routeData.duration / 60); // Convert to minutes
        return {
          distance: `${distance} mi`,
          duration: `${duration} min`,
          geometry: routeData.geometry
        };
      }
    } catch (error) {
      console.error('Route calculation error:', error);
    }
    return null;
  };

  const handleSelectDestination = async (result) => {
    setSelectedDestination(result);
    setDestinationCoords(result.coordinates);
    setSearchQuery(result.name);
    setShowResults(false);
    
    setViewport((prev) => ({
      ...prev,
      latitude: result.coordinates.latitude,
      longitude: result.coordinates.longitude,
      zoom: Math.max(prev.zoom, 11)
    }));
    
    searchNearbyGasStations(result.coordinates.latitude, result.coordinates.longitude);
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

        const distance = (routeData.distance / 1609.34).toFixed(1);
        const duration = Math.round(routeData.duration / 60);
        setRouteInfo({
          distance: `${distance} mi`,
          duration: `${duration} min`
        });

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
    setSelectedDestination(null);
    setSearchQuery('');
  };

  const cheapestStation = gasStations.length
    ? gasStations.reduce((min, s) => (s.price < min.price ? s : min))
    : null;

  // Use dark map style when dark mode is enabled
  const mapStyle = isDarkMode 
    ? 'mapbox://styles/mapbox/dark-v11' 
    : 'mapbox://styles/mapbox/streets-v11';

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900">
      <Settings />

      {/* Google Maps-inspired Search Bar */}
      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-2xl px-4" ref={searchRef}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 p-4">
            <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search for a destination..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base font-normal outline-none"
            />
            {searchQuery && (
              <button
                onClick={clearRoute}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectDestination(result)}
                  className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {result.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {result.address}
                      </p>
                      {result.route && (
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-1">
                            <Navigation className="w-4 h-4" />
                            <span>{result.route.distance}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{result.route.duration}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Route Info Card */}
      {routeInfo && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 font-semibold backdrop-blur-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{routeInfo.distance}</span>
          </div>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>{routeInfo.duration}</span>
          </div>
        </div>
      )}

      {/* Cheapest Station Badge */}
      {cheapestStation && !routeInfo && (
        <div className="absolute top-28 left-1/2 transform -translate-x-1/2 z-20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold backdrop-blur-sm border border-gray-200 dark:border-gray-700">
          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span>
            Cheapest: {cheapestStation.name} - ${cheapestStation.price}/gal
          </span>
        </div>
      )}

      <ReactMapGL
        {...viewport}
        ref={mapRef}
        mapboxApiAccessToken={MAPBOX_TOKEN}
        mapStyle={mapStyle}
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
                'line-color': isDarkMode ? '#60a5fa' : '#3b82f6',
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
                'line-color': isDarkMode ? '#1e293b' : '#ffffff',
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
                {selectedDestination?.name || 'Destination'}
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
              <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">{selectedStation.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">{selectedStation.address}</p>
              <p className="font-bold text-xl text-green-600 dark:text-green-400 mb-1">${selectedStation.price}/gal</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm">{selectedStation.distance} mi away</p>
            </div>
          </Popup>
        )}
      </ReactMapGL>
    </div>
  );
};

export default GasStationMap;
