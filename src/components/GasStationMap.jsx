import React, { useState, useEffect, useRef } from 'react';
import ReactMapGL, { Marker, NavigationControl, Popup, Source, Layer } from 'react-map-gl';
import { Fuel, DollarSign, MapPin, Navigation, X, Search, Clock, ArrowRight, MapPinned } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Settings from './Settings';
import { useTheme } from '../context/ThemeContext';

// Get Mapbox token from env or use default from config.json
// To set your token, create a .env file in the root directory with:
// REACT_APP_MAPBOX_TOKEN=your_token_here
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || 'pk.eyJ1IjoidXNtYW5jaCIsImEiOiJjbWk5anZ5MTEwcGRpMmxwdjNpNTJmNWJkIn0.6TkjSZTrX_D4xgm1YRGPrg';

const GasStationMap = () => {
  const { isDarkMode } = useTheme();
  const mapRef = useRef(null);
  const searchRef = useRef(null);
  const [viewport, setViewport] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    zoom: 4,
    width: typeof window !== 'undefined' ? window.innerWidth : '100%',
    height: typeof window !== 'undefined' ? window.innerHeight : '100%'
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
  const [geolocationAvailable, setGeolocationAvailable] = useState(false);

  // Handle window resize for fullscreen support
  useEffect(() => {
    const handleResize = () => {
      setViewport((prev) => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight
      }));
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if geolocation is available
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setGeolocationAvailable(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setUserLocation(location);
          setViewport((prev) => ({ 
            ...prev, 
            ...location, 
            zoom: 12,
            width: window.innerWidth,
            height: window.innerHeight
          }));
          searchNearbyGasStations(location.latitude, location.longitude);
        },
        (err) => {
          console.log('Geolocation error:', err);
          setGeolocationAvailable(false);
        }
      );
    } else {
      setGeolocationAvailable(false);
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

  // Calculate distance between two points (in miles)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Calculate distance from a point to a line segment
  const pointToLineDistance = (pointLat, pointLng, lineStartLat, lineStartLng, lineEndLat, lineEndLng) => {
    const A = pointLat - lineStartLat;
    const B = pointLng - lineStartLng;
    const C = lineEndLat - lineStartLat;
    const D = lineEndLng - lineStartLng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = lineStartLat;
      yy = lineStartLng;
    } else if (param > 1) {
      xx = lineEndLat;
      yy = lineEndLng;
    } else {
      xx = lineStartLat + param * C;
      yy = lineStartLng + param * D;
    }

    return calculateDistance(pointLat, pointLng, xx, yy);
  };

  // Generate mock gas stations along a route
  const generateGasStationsAlongRoute = (routeCoordinates, maxDistanceFromRoute = 2) => {
    if (!routeCoordinates || routeCoordinates.length < 2) return [];

    const stations = [];
    const stationNames = ['Shell', 'BP', 'Chevron', 'Exxon', 'Mobil', 'ARCO', '76', 'Valero', 'Costco', 'Sam\'s Club'];
    let stationId = 1;

    // Generate stations near route segments
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const [lng1, lat1] = routeCoordinates[i];
      const [lng2, lat2] = routeCoordinates[i + 1];

      // Generate 1-2 stations per segment (not every segment to avoid clutter)
      if (Math.random() > 0.7 && i % 3 === 0) {
        // Create station near midpoint of segment
        const midLat = (lat1 + lat2) / 2;
        const midLng = (lng1 + lng2) / 2;

        // Add some random offset perpendicular to the route
        const dx = lng2 - lng1;
        const dy = lat2 - lat1;
        const perpLat = -dx;
        const perpLng = dy;
        const length = Math.sqrt(perpLat * perpLat + perpLng * perpLng);
        const unitPerpLat = (perpLat / length) * (Math.random() * 0.02 - 0.01); // Small offset
        const unitPerpLng = (perpLng / length) * (Math.random() * 0.02 - 0.01);

        const stationLat = midLat + unitPerpLat;
        const stationLng = midLng + unitPerpLng;

        // Calculate distance from route
        const distanceFromRoute = pointToLineDistance(stationLat, stationLng, lat1, lng1, lat2, lng2);

        if (distanceFromRoute <= maxDistanceFromRoute) {
          const name = stationNames[Math.floor(Math.random() * stationNames.length)];
          const price = 3.20 + Math.random() * 0.50; // Random price between $3.20 and $3.70

          stations.push({
            id: stationId++,
            name,
            lat: stationLat,
            lng: stationLng,
            price: parseFloat(price.toFixed(2)),
            address: `${Math.floor(Math.random() * 9999)} Route St`,
            distanceFromRoute: parseFloat(distanceFromRoute.toFixed(2)),
            distance: 0 // Will be calculated relative to user location
          });
        }
      }
    }

    // Always show stations at start and end points
    if (routeCoordinates.length > 0) {
      const [startLng, startLat] = routeCoordinates[0];
      const [endLng, endLat] = routeCoordinates[routeCoordinates.length - 1];

      // Station near start
      stations.push({
        id: stationId++,
        name: stationNames[Math.floor(Math.random() * stationNames.length)],
        lat: startLat + (Math.random() * 0.01 - 0.005),
        lng: startLng + (Math.random() * 0.01 - 0.005),
        price: parseFloat((3.20 + Math.random() * 0.50).toFixed(2)),
        address: 'Start Location',
        distanceFromRoute: 0,
        distance: 0
      });

      // Station near end
      stations.push({
        id: stationId++,
        name: stationNames[Math.floor(Math.random() * stationNames.length)],
        lat: endLat + (Math.random() * 0.01 - 0.005),
        lng: endLng + (Math.random() * 0.01 - 0.005),
        price: parseFloat((3.20 + Math.random() * 0.50).toFixed(2)),
        address: 'End Location',
        distanceFromRoute: 0,
        distance: 0
      });
    }

    return stations;
  };

  const searchNearbyGasStations = (lat, lng) => {
    // If we have a route, use stations along the route instead
    if (route && route.geometry && route.geometry.coordinates) {
      const routeStations = generateGasStationsAlongRoute(route.geometry.coordinates);
      // Calculate distances from user location
      const stationsWithDistance = routeStations.map(station => ({
        ...station,
        distance: userLocation 
          ? parseFloat(calculateDistance(userLocation.latitude, userLocation.longitude, station.lat, station.lng).toFixed(2))
          : 0
      }));
      // Sort by price (cheapest first)
      stationsWithDistance.sort((a, b) => a.price - b.price);
      setGasStations(stationsWithDistance);
      return;
    }

    // Otherwise, show nearby stations at the location
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
      // For business searches, prioritize POI (Point of Interest) results
      // Try POI search first if query looks like a business name
      const isBusinessSearch = /^(taco|mcdonald|starbucks|walmart|target|burger|pizza|restaurant|hotel|gas|station|store|shop)/i.test(query.trim());
      
      // Build query with better prioritization for businesses
      let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${MAPBOX_TOKEN}&` +
        `limit=15&` + // Get more results to filter better
        `language=en`;

      // Prioritize POI for business searches, include more types for general searches
      if (isBusinessSearch) {
        url += `&types=poi&`; // Only POI for business searches
      } else {
        url += `&types=poi,address,place&`; // Include addresses and places for general searches
      }

      // Add proximity to user location if available for better local results
      if (userLocation) {
        url += `&proximity=${userLocation.longitude},${userLocation.latitude}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        // Filter and sort results - prioritize by relevance and distance
        let sortedFeatures = [...data.features];
        
        // Calculate distances and combine with relevance for better sorting
        if (userLocation) {
          sortedFeatures = sortedFeatures.map(feature => {
            const [lng, lat] = feature.center;
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              lat,
              lng
            );
            return { ...feature, calculatedDistance: distance };
          });
          
          // Sort by relevance first, then by distance (closer = better)
          sortedFeatures.sort((a, b) => {
            // Prioritize high relevance (0.99+ means exact match)
            const relevanceDiff = (b.relevance || 0) - (a.relevance || 0);
            if (Math.abs(relevanceDiff) > 0.1) {
              return relevanceDiff;
            }
            // If relevance is similar, prefer closer results
            return (a.calculatedDistance || Infinity) - (b.calculatedDistance || Infinity);
          });
        } else {
          // Without location, just sort by relevance
          sortedFeatures.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
        }
        
        // For business searches, filter out results that don't match the business name well
        if (isBusinessSearch) {
          const queryLower = query.toLowerCase();
          sortedFeatures = sortedFeatures.filter(feature => {
            const text = (feature.text || '').toLowerCase();
            const placeName = (feature.place_name || '').toLowerCase();
            return text.includes(queryLower) || placeName.includes(queryLower);
          });
        }
        
        // Take top 8 results
        sortedFeatures = sortedFeatures.slice(0, 8);

        const resultsWithRoutes = await Promise.all(
          sortedFeatures.map(async (feature) => {
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

            // Extract primary name and context
            const primaryText = feature.text || feature.properties?.name || '';
            const context = feature.context 
              ? feature.context.map(ctx => ctx.text).join(', ')
              : feature.place_name?.replace(primaryText + ', ', '') || '';

            return {
              id: feature.id,
              name: primaryText,
              address: context || feature.place_name || '',
              fullAddress: feature.place_name || '',
              coordinates: { latitude: lat, longitude: lng },
              route: routeData,
              type: feature.properties?.category || feature.place_type?.[0] || 'place',
              relevance: feature.relevance || 0,
              distance: feature.calculatedDistance
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
    
    // Don't search for stations here - wait for route to be calculated
    // The route calculation will generate stations along the route
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

        // Generate gas stations along the route
        const routeStations = generateGasStationsAlongRoute(routeData.geometry.coordinates, 2);
        const stationsWithDistance = routeStations.map(station => ({
          ...station,
          distance: userLocation 
            ? parseFloat(calculateDistance(userLocation.latitude, userLocation.longitude, station.lat, station.lng).toFixed(2))
            : 0
        }));
        // Sort by price (cheapest first)
        stationsWithDistance.sort((a, b) => a.price - b.price);
        setGasStations(stationsWithDistance);

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
    setGasStations([]); // Clear route stations
    // Reset to showing nearby stations when route is cleared
    if (userLocation) {
      searchNearbyGasStations(userLocation.latitude, userLocation.longitude);
    }
  };

  const cheapestStation = gasStations.length && !routeInfo
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
                        {result.address || result.fullAddress}
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

      {/* Gas Stations Along Route Panel */}
      {routeInfo && gasStations.length > 0 && (
        <div className="absolute bottom-6 left-6 z-20 w-80 max-h-[60vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500 to-blue-600">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Fuel className="w-5 h-5" />
              Gas Stations Along Route ({gasStations.length})
            </h3>
            <p className="text-blue-100 text-sm mt-1">Sorted by price (cheapest first)</p>
          </div>
          <div className="overflow-y-auto max-h-[calc(60vh-80px)]">
            {gasStations.map((station, index) => (
              <div
                key={station.id}
                onClick={() => {
                  setSelectedStation(station);
                  setViewport((prev) => ({
                    ...prev,
                    latitude: station.lat,
                    longitude: station.lng,
                    zoom: Math.max(prev.zoom, 14)
                  }));
                }}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  index === 0 ? 'bg-green-50 dark:bg-green-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {station.name}
                      </h4>
                      {index === 0 && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                          CHEAPEST
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {station.address}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {station.distance.toFixed(1)} mi away
                      </span>
                      {station.distanceFromRoute !== undefined && (
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {station.distanceFromRoute.toFixed(1)} mi from route
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${station.price}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">per gallon</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ReactMapGL
        {...viewport}
        ref={mapRef}
        mapboxApiAccessToken={MAPBOX_TOKEN}
        mapStyle={mapStyle}
        onViewportChange={(vp) => setViewport({ ...vp, width: window.innerWidth, height: window.innerHeight })}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      >
        <NavigationControl 
          style={{ right: 10, top: 10 }} 
          showCompass={true}
          showZoom={true}
        />
        
        {/* Custom Geolocate Button */}
        {typeof navigator !== 'undefined' && navigator.geolocation && (
          <div style={{ position: 'absolute', right: 10, top: 120, zIndex: 1 }}>
            <button
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.geolocation) {
                  setLoading(true);
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                      };
                      setUserLocation(location);
                      setViewport((prev) => ({
                        ...prev,
                        latitude: location.latitude,
                        longitude: location.longitude,
                        zoom: 14,
                        width: window.innerWidth,
                        height: window.innerHeight
                      }));
                      searchNearbyGasStations(location.latitude, location.longitude);
                      setLoading(false);
                    },
                    (error) => {
                      console.error('Geolocation error:', error);
                      alert('Unable to get your location. Please check your browser permissions.');
                      setLoading(false);
                      setGeolocationAvailable(false);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                  );
                }
              }}
              disabled={loading}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Find my location"
            >
              <MapPinned className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        )}

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
