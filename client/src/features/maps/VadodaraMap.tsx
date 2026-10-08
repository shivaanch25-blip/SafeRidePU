import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VADODARA_LOCATIONS, PARUL_CAMPUS_GEOFENCE, LocationPoint } from './vadodaraLocations.js';
import { fetchDrivingRoute, RouteResult } from './mapService.js';
import PaymentModal from '../payment/PaymentModal.js';
import toast from 'react-hot-toast';
import api from '../../config/axios.js';
import {
  FiNavigation,
  FiClock,
  FiCreditCard,
  FiShield,
  FiPhone,
  FiCheckCircle,
  FiRadio,
  FiXCircle,
  FiTruck,
  FiCompass,
} from 'react-icons/fi';

// Custom modern SVG marker icons for Leaflet
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

// Map Resizer and View Adjuster component
const MapController: React.FC<{
  center: [number, number];
  routeCoords?: [number, number][];
  onMapClick: (lat: number, lng: number) => void;
}> = ({ center, routeCoords, onMapClick }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  // Ensure Leaflet recalculates size on load
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  // Adjust bounds when route coordinates change
  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      try {
        const bounds = L.latLngBounds(routeCoords);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch {
        map.setView(center, 12);
      }
    }
  }, [routeCoords, map, center]);

  return null;
};

export type RideLifecycleStage =
  | 'IDLE'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'ARRIVED_PICKUP'
  | 'TRIP_ACTIVE'
  | 'COMPLETED';

export interface IBackendRide {
  _id: string;
  status: string;
  fare: number;
  distanceKm: number;
  otp: string;
  riderName: string;
  riderPhone?: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  pickupLocation: {
    address: string;
    coordinates: [number, number];
  };
  dropoffLocation: {
    address: string;
    coordinates: [number, number];
  };
  createdAt?: string;
}

export const VadodaraMap: React.FC = () => {
  // Default to Parul University Main Gate and Vadodara Railway Station
  const [pickup, setPickup] = useState<LocationPoint>(VADODARA_LOCATIONS[0]);
  const [dropoff, setDropoff] = useState<LocationPoint>(VADODARA_LOCATIONS[6]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Active Ride Booking State
  const [rideStage, setRideStage] = useState<RideLifecycleStage>('IDLE');
  const [activeRide, setActiveRide] = useState<IBackendRide | null>(null);

  // Vehicle Simulation State (ONLY active during TRIP_ACTIVE)
  const [vehiclePos, setVehiclePos] = useState<[number, number] | null>(null);
  const simulationStepRef = useRef<number>(0);

  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

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

  // Polling hook: Sync active ride status with backend until completed
  useEffect(() => {
    if (!activeRide?._id || rideStage === 'IDLE' || rideStage === 'COMPLETED') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/rides/${activeRide._id}`);
        const updated: IBackendRide = res.data?.data?.ride;
        if (!updated) return;

        setActiveRide(updated);

        if (updated.status === 'ASSIGNED' && rideStage === 'SEARCHING_DRIVER') {
          setRideStage('DRIVER_ASSIGNED');
          toast.success(
            `🚗 Driver ${updated.driverName || 'Rajesh Sharma'} accepted your ride! Heading to pickup.`,
            { duration: 5000 }
          );
        } else if (updated.status === 'ARRIVED_PICKUP' && rideStage !== 'ARRIVED_PICKUP') {
          setRideStage('ARRIVED_PICKUP');
          toast('📍 Driver has arrived at your pickup point! Please share your 4-digit PIN.', {
            duration: 6000,
            icon: '🔔',
          });
        } else if (updated.status === 'ACTIVE' && rideStage !== 'TRIP_ACTIVE') {
          setRideStage('TRIP_ACTIVE');
          toast.success('🚀 PIN verified! Trip is in progress. Have a safe journey!', {
            duration: 5000,
          });
        } else if (updated.status === 'COMPLETED') {
          setRideStage('COMPLETED');
          toast.success('🏁 You have reached your destination! Safe ride completed.', {
            duration: 7000,
            icon: '✨',
          });
        }
      } catch {
        // Silently tolerate temporary polling errors
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeRide?._id, rideStage]);

  // Handle vehicle movement simulation along the route ONLY when trip is ACTIVE
  useEffect(() => {
    if (rideStage !== 'TRIP_ACTIVE' || !route || route.coordinates.length === 0) return;

    const interval = setInterval(() => {
      if (simulationStepRef.current < route.coordinates.length - 1) {
        simulationStepRef.current += 1;
        setVehiclePos(route.coordinates[simulationStepRef.current]);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [rideStage, route]);

  // Initiate Ride Request
  const handleInitiateRide = async () => {
    setIsPaymentOpen(false);
    setIsBooking(true);

    try {
      const estimatedFare = route ? route.estimatedFare : 45;
      const distanceKm = route ? route.distanceKm : 3.5;

      const res = await api.post('/rides/request', {
        pickupLocation: {
          address: pickup.name,
          coordinates: [pickup.lng, pickup.lat],
        },
        dropoffLocation: {
          address: dropoff.name,
          coordinates: [dropoff.lng, dropoff.lat],
        },
        fare: estimatedFare,
        distanceKm,
      });

      const newRide: IBackendRide = res.data?.data?.ride || {
        _id: `ride_${Date.now()}`,
        status: 'REQUESTED',
        fare: estimatedFare,
        distanceKm,
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
        riderName: 'Student Rider',
        pickupLocation: { address: pickup.name, coordinates: [pickup.lng, pickup.lat] },
        dropoffLocation: { address: dropoff.name, coordinates: [dropoff.lng, dropoff.lat] },
      };

      setActiveRide(newRide);
      setRideStage('SEARCHING_DRIVER');
      simulationStepRef.current = 0;
      setVehiclePos([pickup.lat, pickup.lng]);

      toast.success('📡 Ride requested! Searching for available campus drivers...', {
        duration: 5000,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request ride. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  // Instant simulation helper for local testing
  const handleSimulateDriverAccept = async () => {
    if (!activeRide?._id) return;
    try {
      const res = await api.patch(`/rides/${activeRide._id}/accept`);
      const updated = res.data?.data?.ride;
      if (updated) {
        setActiveRide(updated);
        setRideStage('DRIVER_ASSIGNED');
        toast.success('🚗 Driver Rajesh Sharma accepted your ride!');
      }
    } catch {
      // Local fallback
      setActiveRide((prev) =>
        prev
          ? {
              ...prev,
              status: 'ASSIGNED',
              driverName: 'Rajesh Sharma',
              driverPhone: '+91 98765 43210',
              driverVehicle: 'Tata Tigor EV (GJ-06-PU-2026)',
            }
          : null
      );
      setRideStage('DRIVER_ASSIGNED');
      toast.success('🚗 Driver Rajesh Sharma accepted your ride!');
    }
  };

  // Cancel ride request
  const handleCancelRide = async () => {
    if (activeRide?._id) {
      try {
        await api.patch(`/rides/${activeRide._id}/cancel`);
      } catch {
        // Fallback
      }
    }
    setActiveRide(null);
    setRideStage('IDLE');
    setVehiclePos(null);
    simulationStepRef.current = 0;
    toast('Ride request cancelled.', { icon: 'ℹ️' });
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (rideStage !== 'IDLE') return;
    const customPoint: LocationPoint = {
      id: `custom-${Date.now()}`,
      name: `Selected Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
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
            Real-time campus ride dispatch with 4-digit student start PIN verification
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
        {/* Left Side: Route Controls or Live Ride Status Card */}
        <div className="p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          {rideStage === 'SEARCHING_DRIVER' && activeRide && (
            /* Searching for Driver Pulse View */
            <div className="space-y-5 animate-fadeIn">
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <div className="relative w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-amber-400 opacity-25 animate-ping"></span>
                  <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center text-xl shadow-lg">
                    <FiRadio className="animate-spin" />
                  </div>
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Finding Campus Driver...
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Ride dispatched to on-duty campus drivers. Waiting for a driver to accept your ride.
                </p>
              </div>

              {/* Security PIN Display */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-700 border border-amber-200 dark:border-amber-700 shadow-sm text-center">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Your 4-Digit Security PIN
                </span>
                <span className="font-mono text-3xl font-black tracking-widest text-amber-900 dark:text-amber-200 block mt-1">
                  {activeRide.otp}
                </span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Share this PIN with the driver when they arrive to start the ride.
                </p>
              </div>

              {/* Ride Details Summary */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Pickup:</span>
                  <strong className="text-gray-900 dark:text-white truncate max-w-[180px]">
                    {activeRide.pickupLocation.address}
                  </strong>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Dropoff:</span>
                  <strong className="text-gray-900 dark:text-white truncate max-w-[180px]">
                    {activeRide.dropoffLocation.address}
                  </strong>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Total Fare:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ₹{activeRide.fare}
                  </strong>
                </div>
              </div>

              {/* Testing / Driver Dispatch Helper */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-2">
                <p className="text-blue-800 dark:text-blue-300 font-medium">
                  💡 <strong>Testing Tip:</strong> You can open the <strong>Driver Dashboard</strong> from the top navigation to accept this ride as a driver, or click below:
                </p>
                <button
                  onClick={handleSimulateDriverAccept}
                  className="w-full py-2 px-3 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FiTruck /> Simulate Driver Acceptance (Demo)
                </button>
              </div>

              <button
                onClick={handleCancelRide}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition border border-red-200 dark:border-red-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FiXCircle /> Cancel Ride Request
              </button>
            </div>
          )}

          {rideStage !== 'IDLE' && rideStage !== 'SEARCHING_DRIVER' && activeRide && (
            /* Active Confirmed Ride & Driver Tracking Card */
            <div className="space-y-4 animate-fadeIn">
              {/* Dynamic Status Header */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    {rideStage === 'DRIVER_ASSIGNED' && 'Driver Heading to Pickup'}
                    {rideStage === 'ARRIVED_PICKUP' && 'Driver Arrived at Pickup!'}
                    {rideStage === 'TRIP_ACTIVE' && 'Trip In Progress'}
                    {rideStage === 'COMPLETED' && 'Ride Completed'}
                  </span>
                  <span className="text-xs font-mono text-gray-500 font-semibold">
                    {activeRide._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white mt-1">
                  {rideStage === 'COMPLETED' ? 'Safe Arrival Confirmed' : 'Verified Campus Ride'}
                </h3>
              </div>

              {/* Driver & Vehicle Details */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-2xl shadow-sm">
                    👨‍✈️
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                        {activeRide.driverName || 'Rajesh Sharma'}
                      </h4>
                      <FiCheckCircle className="text-emerald-500 text-xs" title="Verified Campus Driver" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-300">
                      ★ 4.9 &bull; Campus Transit Fleet
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs space-y-1">
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Vehicle:</span>
                    <strong className="text-gray-900 dark:text-white">
                      {activeRide.driverVehicle || 'Tata Tigor EV (Campus Fleet)'}
                    </strong>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-300">
                    <span>Plate Number:</span>
                    <strong className="font-mono text-brand-600 dark:text-brand-400 font-bold">
                      GJ-06-PU-2026
                    </strong>
                  </div>
                </div>

                {/* 4-Digit Security PIN */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Rider Security PIN
                  </span>
                  <span className="font-mono text-2xl font-black tracking-widest text-amber-900 dark:text-amber-200">
                    {activeRide.otp}
                  </span>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {rideStage === 'TRIP_ACTIVE'
                      ? 'PIN Verified by Driver'
                      : 'Share this PIN with driver to start the trip'}
                  </p>
                </div>
              </div>

              {/* Route Summary */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">🟢</span>
                  <div>
                    <span className="text-[10px] uppercase text-gray-400 font-semibold block">Pickup</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {activeRide.pickupLocation.address}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-gray-600 my-1"></div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">📍</span>
                  <div>
                    <span className="text-[10px] uppercase text-gray-400 font-semibold block">Dropoff</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {activeRide.dropoffLocation.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {activeRide.driverPhone && (
                  <a
                    href={`tel:${activeRide.driverPhone}`}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 transition shadow flex items-center justify-center gap-2 text-xs"
                  >
                    <FiPhone /> Call Driver ({activeRide.driverPhone})
                  </a>
                )}

                {rideStage === 'COMPLETED' ? (
                  <button
                    onClick={() => {
                      setActiveRide(null);
                      setRideStage('IDLE');
                      setVehiclePos(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <FiCheckCircle /> Book Another Ride
                  </button>
                ) : (
                  <button
                    onClick={handleCancelRide}
                    className="w-full py-2 px-3 text-xs font-semibold text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition text-center cursor-pointer"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          )}

          {rideStage === 'IDLE' && (
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
                  disabled={isLoadingRoute || !route || isBooking}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FiCreditCard />
                  {isBooking
                    ? 'Dispatching Ride Request...'
                    : route
                    ? `Book & Pay ₹${route.estimatedFare} (Campus Transit)`
                    : 'Calculating Fare...'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Interactive Leaflet Map */}
        <div className="lg:col-span-2 h-[520px] relative z-0">
          <MapContainer
            center={[22.2887, 73.3634]} // Centered on Parul University Campus
            zoom={12}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', minHeight: '520px' }}
          >
            {/* Free OSM Standard Tile Layer with robust subdomains */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />

            {/* Map Controller for auto-resizing and bounds fitting */}
            <MapController
              center={[22.2887, 73.3634]}
              routeCoords={route?.coordinates}
              onMapClick={handleMapClick}
            />

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

            {/* Driving Route Polyline from OSRM */}
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

            {/* Live Moving Vehicle Marker (ONLY rendered when in active transit) */}
            {vehiclePos && (rideStage === 'TRIP_ACTIVE' || rideStage === 'ARRIVED_PICKUP') && (
              <Marker position={vehiclePos} icon={vehicleIcon}>
                <Popup>
                  <strong>SafeRide Vehicle (Live GPS)</strong>
                  <br />
                  Driver: {activeRide?.driverName || 'Rajesh Sharma'}
                  <br />
                  <span className="text-brand-600 font-bold">
                    {rideStage === 'TRIP_ACTIVE' ? 'In Transit to Destination' : 'At Pickup Location'}
                  </span>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Map Overlay Hint */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-300 shadow-md flex items-center gap-2">
            <FiCompass className="text-brand-500" /> Click anywhere on map to set a custom dropoff point
          </div>
        </div>
      </div>

      {/* Razorpay Payment Checkout Modal */}
      {route && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          amount={route.estimatedFare}
          onPaymentSuccess={handleInitiateRide}
        />
      )}
    </div>
  );
};

export default VadodaraMap;
