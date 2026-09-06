import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VADODARA_LOCATIONS, PARUL_CAMPUS_GEOFENCE, LocationPoint } from './vadodaraLocations.js';
import { fetchDrivingRoute, RouteResult } from './mapService.js';
import PaymentModal from '../payment/PaymentModal.js';
import toast from 'react-hot-toast';
import {
  FiNavigation,
  FiClock,
  FiCreditCard,
  FiShield,
  FiPlay,
  FiPause,
  FiPhone,
  FiCheckCircle,
} from 'react-icons/fi';

// Custom modern SVG marker icons to avoid Vite asset bundler issues
const createCustomIcon = (bgColor: string, text: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid white;
      ">
        ${text}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

const pickupIcon = createCustomIcon('#10b981', '🟢');
const dropoffIcon = createCustomIcon('#ef4444', '📍');
const vehicleIcon = createCustomIcon('#2563eb', '🚗');

// Map Click Listener to let users click to pick coordinates
const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export interface ActiveRide {
  rideId: string;
  status: 'EN_ROUTE_PICKUP' | 'TRIP_ACTIVE' | 'ARRIVED' | 'COMPLETED';
  driver: {
    name: string;
    rating: string;
    ridesCount: number;
    vehicle: string;
    plateNumber: string;
    phone: string;
    avatar: string;
  };
  pin: string;
  bookingTime: string;
  distanceKm: number;
  etaMinutes: number;
  pickupAddress: string;
  dropoffAddress: string;
  fare: number;
}

export const VadodaraMap: React.FC = () => {
  // Default to Parul University Main Gate and Vadodara Railway Station
  const [pickup, setPickup] = useState<LocationPoint>(VADODARA_LOCATIONS[0]);
  const [dropoff, setDropoff] = useState<LocationPoint>(VADODARA_LOCATIONS[6]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Active Ride Booking & Driver Tracking State
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);

  // Live Vehicle Simulation State
  const [isSimulating, setIsSimulating] = useState(false);
  const [vehiclePos, setVehiclePos] = useState<[number, number] | null>(null);
  const simulationStepRef = useRef<number>(0);

  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Calculate driving route whenever pickup or dropoff changes
  useEffect(() => {
    let isCancelled = false;

    const calculateRoute = async () => {
      setIsLoadingRoute(true);
      try {
        const result = await fetchDrivingRoute(
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng]
        );
        if (!isCancelled) {
          setRoute(result);
          setVehiclePos([pickup.lat, pickup.lng]);
          simulationStepRef.current = 0;
        }
      } catch (err) {
        console.error('Failed to calculate route:', err);
      } finally {
        if (!isCancelled) setIsLoadingRoute(false);
      }
    };

    calculateRoute();

    return () => {
      isCancelled = true;
    };
  }, [pickup, dropoff]);

  // Handle vehicle movement simulation along the route with live distance and ETA
  useEffect(() => {
    if (!isSimulating || !route || route.coordinates.length === 0) return;

    const interval = setInterval(() => {
      if (simulationStepRef.current < route.coordinates.length - 1) {
        simulationStepRef.current += 1;
        setVehiclePos(route.coordinates[simulationStepRef.current]);

        const totalSteps = route.coordinates.length;
        const progress = simulationStepRef.current / totalSteps;
        const remainingKm = Math.max(0.1, Number((route.distanceKm * (1 - progress)).toFixed(1)));
        const remainingMins = Math.max(1, Math.round(route.durationMinutes * (1 - progress)));

        setActiveRide((prev) => {
          if (!prev) return null;
          let newStatus: ActiveRide['status'] = prev.status;
          if (progress < 0.2) newStatus = 'EN_ROUTE_PICKUP';
          else if (progress < 0.9) newStatus = 'TRIP_ACTIVE';
          else newStatus = 'ARRIVED';

          return {
            ...prev,
            distanceKm: remainingKm,
            etaMinutes: remainingMins,
            status: newStatus,
          };
        });
      } else {
        setIsSimulating(false);
        simulationStepRef.current = 0;
        setActiveRide((prev) =>
          prev
            ? {
                ...prev,
                distanceKm: 0,
                etaMinutes: 0,
                status: 'COMPLETED',
              }
            : null
        );
        toast.success('🏁 You have reached your destination! Safe ride completed.', {
          duration: 6000,
          icon: '✨',
        });
      }
    }, 450);

    return () => clearInterval(interval);
  }, [isSimulating, route]);

  const handlePaymentSuccess = (_payment?: any) => {
    setIsPaymentOpen(false);
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const newRide: ActiveRide = {
      rideId: `PU-${Date.now().toString().slice(-6)}`,
      status: 'EN_ROUTE_PICKUP',
      driver: {
        name: 'Rajesh Sharma',
        rating: '4.9',
        ridesCount: 1240,
        vehicle: 'Tata Tigor EV (Campus Fleet)',
        plateNumber: 'GJ-06-PU-2026',
        phone: '+91 98765 43210',
        avatar: '👨‍✈️',
      },
      pin,
      bookingTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distanceKm: route ? route.distanceKm : 3.2,
      etaMinutes: route ? route.durationMinutes : 8,
      pickupAddress: pickup.name,
      dropoffAddress: dropoff.name,
      fare: route ? route.estimatedFare : 45,
    };

    setActiveRide(newRide);
    setIsSimulating(true);
    toast.success(`🎉 Ride Confirmed! Driver Rajesh Sharma is on the way (PIN: ${pin})`, {
      duration: 7000,
      icon: '🚗',
    });
  };

  const handleMapClick = (lat: number, lng: number) => {
    // Alternate assigning custom click as pickup or dropoff
    const customPoint: LocationPoint = {
      id: `custom-${Date.now()}`,
      name: `Custom Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      category: 'DISTRICT',
      lat,
      lng,
      description: 'Custom selected point on Vadodara district map',
    };

    setDropoff(customPoint);
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Top Banner / Controls Bar */}
      <div className="p-6 bg-gradient-to-r from-brand-700 to-brand-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-200">
            <FiShield className="text-emerald-400" /> Parul University Institutional Transit
          </div>
          <h2 className="text-2xl font-black mt-1">Vadodara Safe Transit & Live Map</h2>
          <p className="text-xs text-brand-100 mt-0.5">
            Powered by free OpenStreetMap & OSRM Routing Engine (Vadodara & Gujarat)
          </p>
        </div>

        {/* Live Route Summary Pill */}
        {route && (
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-sm">
            <div className="text-center">
              <span className="block text-xs text-brand-200">Distance</span>
              <span className="font-bold text-white">{route.distanceKm} km</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <span className="block text-xs text-brand-200 flex items-center justify-center gap-1">
                <FiClock className="text-xs" /> ETA
              </span>
              <span className="font-bold text-white">{route.durationMinutes} mins</span>
            </div>
            <div className="w-px h-8 bg-white/20"></div>
            <div className="text-center">
              <span className="block text-xs text-brand-200">Subsidized Fare</span>
              <span className="font-black text-emerald-300 text-base">₹{route.estimatedFare}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Left Side: Route Controls or Active Ride Driver Card */}
        <div className="p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          {activeRide ? (
            /* Active Ride & Driver Proximity Card */
            <div className="space-y-4 animate-fadeIn">
              {/* Status Header */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    {activeRide.status === 'EN_ROUTE_PICKUP'
                      ? 'Driver En Route to Pickup'
                      : activeRide.status === 'TRIP_ACTIVE'
                      ? 'Trip In Progress'
                      : activeRide.status === 'ARRIVED'
                      ? 'Driver Arrived at Destination'
                      : 'Ride Completed'}
                  </span>
                  <span className="text-xs font-mono text-gray-500 font-semibold">{activeRide.rideId}</span>
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white mt-1">
                  Ride Confirmed & Verified
                </h3>
              </div>

              {/* Dynamic Distance & ETA Counters */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm">
                <div className="text-center p-2 rounded-xl bg-brand-50 dark:bg-gray-800">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                    Driver Distance
                  </span>
                  <span className="text-2xl font-black text-brand-700 dark:text-brand-200">
                    {activeRide.distanceKm} <span className="text-xs font-normal">km</span>
                  </span>
                </div>
                <div className="text-center p-2 rounded-xl bg-emerald-50 dark:bg-gray-800">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">
                    Estimated Arrival
                  </span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-200">
                    ~{activeRide.etaMinutes} <span className="text-xs font-normal">mins</span>
                  </span>
                </div>
              </div>

              {/* Verified Driver & Vehicle Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-2xl shadow-sm">
                    {activeRide.driver.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                        {activeRide.driver.name}
                      </h4>
                      <FiCheckCircle className="text-emerald-500 text-xs" title="Verified PU Transit Driver" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      ★ {activeRide.driver.rating} &bull; {activeRide.driver.ridesCount} campus rides
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs space-y-1">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Vehicle:</span>
                    <strong className="text-gray-900 dark:text-white">{activeRide.driver.vehicle}</strong>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>License Plate:</span>
                    <strong className="font-mono text-brand-600 dark:text-brand-400 font-bold">
                      {activeRide.driver.plateNumber}
                    </strong>
                  </div>
                </div>

                {/* 4-Digit Security PIN */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Rider Security PIN
                  </span>
                  <span className="font-mono text-2xl font-black tracking-widest text-amber-900 dark:text-amber-200">
                    {activeRide.pin}
                  </span>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Share this code with the driver upon pickup
                  </p>
                </div>
              </div>

              {/* Trip Addresses */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">🟢</span>
                  <div>
                    <span className="text-[10px] uppercase text-gray-400 font-semibold block">Pickup</span>
                    <span className="font-medium text-gray-900 dark:text-white">{activeRide.pickupAddress}</span>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-650 my-1"></div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">📍</span>
                  <div>
                    <span className="text-[10px] uppercase text-gray-400 font-semibold block">Dropoff</span>
                    <span className="font-medium text-gray-900 dark:text-white">{activeRide.dropoffAddress}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <a
                  href={`tel:${activeRide.driver.phone}`}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 transition shadow flex items-center justify-center gap-2 text-xs"
                >
                  <FiPhone /> Call Driver ({activeRide.driver.phone})
                </a>

                {activeRide.status === 'COMPLETED' ? (
                  <button
                    onClick={() => {
                      setActiveRide(null);
                      setIsSimulating(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <FiCheckCircle /> Book Another Ride
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setActiveRide(null);
                      setIsSimulating(false);
                      toast('Ride cancelled by user.', { icon: 'ℹ️' });
                    }}
                    className="w-full py-2 px-3 text-xs font-semibold text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition text-center cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Booking Selection Mode */
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                  🟢 Pickup Point (Vadodara / PU)
                </label>
                <select
                  value={pickup.id}
                  onChange={(e) => {
                    const found = VADODARA_LOCATIONS.find((l) => l.id === e.target.value);
                    if (found) setPickup(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                >
                  {VADODARA_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      [{loc.category}] {loc.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{pickup.description}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                  📍 Dropoff Point (Vadodara / PU)
                </label>
                <select
                  value={dropoff.id}
                  onChange={(e) => {
                    const found = VADODARA_LOCATIONS.find((l) => l.id === e.target.value);
                    if (found) setDropoff(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                >
                  {VADODARA_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      [{loc.category}] {loc.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{dropoff.description}</p>
              </div>

              {/* Quick Route Swapper */}
              <button
                onClick={() => {
                  const temp = pickup;
                  setPickup(dropoff);
                  setDropoff(temp);
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 rounded-xl hover:bg-brand-100 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FiNavigation /> Swap Pickup & Dropoff
              </button>

              {/* Safe Transit Campus Notice */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                  <FiShield className="text-emerald-600 dark:text-emerald-400" /> 24/7 Security Office Monitored
                </div>
                All routes between Parul University Waghodia Campus and Vadodara hubs are geofenced and tracked in real-time.
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setIsPaymentOpen(true)}
                  disabled={isLoadingRoute || !route}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FiCreditCard />
                  {route ? `Book & Pay ₹${route.estimatedFare} (Razorpay)` : 'Calculating Fare...'}
                </button>

                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  disabled={!route}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-brand-700 dark:text-brand-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-650 transition border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? (
                    <>
                      <FiPause /> Pause Live Route Tracking
                    </>
                  ) : (
                    <>
                      <FiPlay /> Simulate Driver GPS Movement
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Interactive Leaflet Map */}
        <div className="lg:col-span-2 h-[520px] relative z-0">
          <MapContainer
            center={[22.2887, 73.3634]} // Centered on Parul University
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            {/* Free OpenStreetMap Standard Tile Layer */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User Map Click Capture */}
            <MapClickHandler onMapClick={handleMapClick} />

            {/* Parul University Campus Geofence Boundary */}
            <Polygon
              positions={PARUL_CAMPUS_GEOFENCE}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '5, 5',
              }}
            >
              <Popup>
                <strong>Parul University Campus Safe Geofence</strong>
                <br />
                Waghodia, Vadodara
              </Popup>
            </Polygon>

            {/* Pickup Marker */}
            <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
              <Popup>
                <strong>Pickup:</strong> {pickup.name}
                <br />
                {pickup.description}
              </Popup>
            </Marker>

            {/* Dropoff Marker */}
            <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
              <Popup>
                <strong>Dropoff:</strong> {dropoff.name}
                <br />
                {dropoff.description}
              </Popup>
            </Marker>

            {/* Real-time driving route line from OSRM */}
            {route && (
              <Polyline
                positions={route.coordinates}
                pathOptions={{
                  color: '#2563eb',
                  weight: 5,
                  opacity: 0.8,
                }}
              />
            )}

            {/* Live Moving Vehicle Marker */}
            {vehiclePos && (
              <Marker position={vehiclePos} icon={vehicleIcon}>
                <Popup>
                  <strong>SafeRide Vehicle (Live GPS)</strong>
                  <br />
                  Driver: {activeRide ? activeRide.driver.name : 'Rajesh Sharma'}
                  <br />
                  <span className="text-brand-600 font-bold">
                    {activeRide
                      ? `${activeRide.distanceKm} km away • ETA: ~${activeRide.etaMinutes} mins`
                      : 'En Route to Destination'}
                  </span>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Map Overlay Hint */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-300 shadow-md">
            Click anywhere on map to set a custom Vadodara destination
          </div>
        </div>
      </div>

      {/* Razorpay Payment Checkout Modal */}
      {route && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          amount={route.estimatedFare}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default VadodaraMap;
