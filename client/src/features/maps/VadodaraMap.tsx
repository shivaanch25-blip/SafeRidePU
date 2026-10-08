import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  FiCreditCard,
  FiShield,
  FiPhone,
  FiCheckCircle,
  FiRadio,
  FiXCircle,
  FiTruck,
  FiCompass,
  FiStar,
  FiMessageSquare,
  FiLayers,
} from 'react-icons/fi';

// Custom high-contrast SVG marker icons for Leaflet
const createCustomIcon = (bgColor: string, text: string, pulse = false) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        ${pulse ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background-color: ${bgColor}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>` : ''}
        <div style="
          background-color: ${bgColor};
          color: white;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
          border: 2.5px solid white;
          z-index: 10;
        ">
          ${text}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

const pickupIcon = createCustomIcon('#10b981', '🟢');
const dropoffIcon = createCustomIcon('#ef4444', '📍');
const driverCarIcon = createCustomIcon('#2563eb', '🚗', true);

// 100% Free Open-Source & Public Tile Providers (Zero API keys, zero watermarks, zero blocking)
const MAP_THEMES = {
  esriStreet: {
    name: 'Free World Street Map (No Key Required)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: ['server'],
    attribution: 'Tiles &copy; Esri &mdash; Free Street Map for Transit',
  },
  hot: {
    name: 'Humanitarian OSM (Free Open-Source)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  osmDe: {
    name: 'OpenStreetMap Mirror (Free Open-Source)',
    url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  esriTopo: {
    name: 'Esri World Topographic (Free)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    subdomains: ['server'],
    attribution: 'Tiles &copy; Esri',
  },
};

// Map Controller for auto-resizing and bounds fitting
const MapController: React.FC<{
  center: [number, number];
  routeCoords?: [number, number][];
  driverPos?: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
}> = ({ center, routeCoords, driverPos, onMapClick }) => {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (routeCoords && routeCoords.length > 1) {
      try {
        const points = [...routeCoords];
        if (driverPos) points.push(driverPos);
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      } catch {
        map.setView(center, 13);
      }
    }
  }, [routeCoords, driverPos, map, center]);

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
  // 100% Free Open-Source & Public Map (Zero API keys, zero watermarks, zero blocking)
  const [mapTheme, setMapTheme] = useState<keyof typeof MAP_THEMES>('esriStreet');

  // Pickup & Dropoff State
  const [pickup, setPickup] = useState<LocationPoint>(VADODARA_LOCATIONS[0]);
  const [dropoff, setDropoff] = useState<LocationPoint>(VADODARA_LOCATIONS[6]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Active Ride Booking State
  const [rideStage, setRideStage] = useState<RideLifecycleStage>('IDLE');
  const [activeRide, setActiveRide] = useState<IBackendRide | null>(null);

  // Live Driver GPS Coordinates & Tracking
  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [driverDistanceKm, setDriverDistanceKm] = useState<number>(1.8);
  const [driverEtaMinutes, setDriverEtaMinutes] = useState<number>(3);

  // Trip progression step along destination polyline
  const simulationStepRef = useRef<number>(0);

  // Payment & Booking States
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Rating Modal State
  const [selectedRating, setSelectedRating] = useState<number>(5);

  // BroadcastChannel for instant 0ms cross-tab sync between Rider and Driver consoles
  const transitChannel = useMemo(() => {
    try {
      return new BroadcastChannel('saferide_transit_channel');
    } catch {
      return null;
    }
  }, []);

  // 1. Restore active ride from localStorage or backend on mount
  useEffect(() => {
    const restoreActiveRide = async () => {
      // Check localStorage first
      const stored = localStorage.getItem('saferide_active_ride');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed._id && parsed.status !== 'COMPLETED' && parsed.status !== 'CANCELLED') {
            setActiveRide(parsed);
            if (parsed.status === 'REQUESTED') setRideStage('SEARCHING_DRIVER');
            else if (parsed.status === 'ASSIGNED') setRideStage('DRIVER_ASSIGNED');
            else if (parsed.status === 'ARRIVED_PICKUP') setRideStage('ARRIVED_PICKUP');
            else if (parsed.status === 'ACTIVE') setRideStage('TRIP_ACTIVE');
          }
        } catch {}
      }

      // Check backend for active ride
      try {
        const res = await api.get('/rides/active');
        const liveRide: IBackendRide = res.data?.data?.ride;
        if (liveRide && liveRide._id && liveRide.status !== 'COMPLETED' && liveRide.status !== 'CANCELLED') {
          setActiveRide(liveRide);
          localStorage.setItem('saferide_active_ride', JSON.stringify(liveRide));
          if (liveRide.status === 'REQUESTED') setRideStage('SEARCHING_DRIVER');
          else if (liveRide.status === 'ASSIGNED') setRideStage('DRIVER_ASSIGNED');
          else if (liveRide.status === 'ARRIVED_PICKUP') setRideStage('ARRIVED_PICKUP');
          else if (liveRide.status === 'ACTIVE') setRideStage('TRIP_ACTIVE');
        }
      } catch {}
    };

    restoreActiveRide();
  }, []);

  // 2. Setup BroadcastChannel listener for instant updates from Driver console
  useEffect(() => {
    if (!transitChannel) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.ride) return;

      const updated: IBackendRide = data.ride;
      if (activeRide && activeRide._id !== updated._id) return;

      setActiveRide(updated);
      localStorage.setItem('saferide_active_ride', JSON.stringify(updated));

      if (data.type === 'RIDE_ACCEPTED' || updated.status === 'ASSIGNED') {
        setRideStage('DRIVER_ASSIGNED');
        toast.success(`🚗 Driver ${updated.driverName || 'Rajesh Sharma'} accepted your ride! Heading to pickup.`, {
          duration: 5000,
          icon: '🚗',
        });
      } else if (data.type === 'DRIVER_ARRIVED' || updated.status === 'ARRIVED_PICKUP') {
        setRideStage('ARRIVED_PICKUP');
        setDriverDistanceKm(0);
        setDriverEtaMinutes(0);
        toast('📍 Driver has arrived at your pickup point! Please share your 4-digit PIN.', {
          duration: 6000,
          icon: '🔔',
        });
      } else if (data.type === 'TRIP_STARTED' || updated.status === 'ACTIVE') {
        setRideStage('TRIP_ACTIVE');
        toast.success('🚀 PIN verified! Safe transit to destination in progress.', {
          duration: 5000,
        });
      } else if (data.type === 'TRIP_COMPLETED' || updated.status === 'COMPLETED') {
        setRideStage('COMPLETED');
        toast.success('🏁 You have safely reached your destination! Safe ride completed.', {
          duration: 7000,
          icon: '✨',
        });
      }
    };

    transitChannel.onmessage = handleMessage;
  }, [transitChannel, activeRide]);

  // 3. Calculate driving route between pickup and dropoff
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

  // 4. Polling fallback to keep ride in sync across browsers and servers
  useEffect(() => {
    if (!activeRide?._id || rideStage === 'IDLE' || rideStage === 'COMPLETED') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/rides/${activeRide._id}`);
        const updated: IBackendRide = res.data?.data?.ride;
        if (!updated) return;

        setActiveRide(updated);
        localStorage.setItem('saferide_active_ride', JSON.stringify(updated));

        if (updated.status === 'ASSIGNED' && rideStage === 'SEARCHING_DRIVER') {
          setRideStage('DRIVER_ASSIGNED');
          toast.success(`🚗 Driver ${updated.driverName || 'Rajesh Sharma'} accepted your ride!`, {
            duration: 5000,
          });
        } else if (updated.status === 'ARRIVED_PICKUP' && rideStage !== 'ARRIVED_PICKUP') {
          setRideStage('ARRIVED_PICKUP');
          setDriverDistanceKm(0);
          setDriverEtaMinutes(0);
          toast('📍 Driver has arrived at pickup! Share your 4-digit PIN.', { icon: '🔔' });
        } else if (updated.status === 'ACTIVE' && rideStage !== 'TRIP_ACTIVE') {
          setRideStage('TRIP_ACTIVE');
          toast.success('🚀 PIN verified! Trip started.');
        } else if (updated.status === 'COMPLETED') {
          setRideStage('COMPLETED');
          toast.success('🏁 You have safely reached your destination!');
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRide?._id, rideStage]);

  // 5. Driver Approach Movement Simulation (When Driver is Heading to Pickup)
  useEffect(() => {
    if (rideStage !== 'DRIVER_ASSIGNED') return;

    // Set initial driver position ~1.8 km outside the campus gate
    const startLat = pickup.lat + 0.012;
    const startLng = pickup.lng - 0.014;
    setDriverPos([startLat, startLng]);
    setDriverDistanceKm(1.8);
    setDriverEtaMinutes(3);

    let step = 0;
    const totalSteps = 12;

    const approachInterval = setInterval(() => {
      step += 1;
      const progress = step / totalSteps;
      const currentLat = startLat + (pickup.lat - startLat) * progress;
      const currentLng = startLng + (pickup.lng - startLng) * progress;
      setDriverPos([currentLat, currentLng]);

      const remainingDist = Math.max(0.1, Number((1.8 * (1 - progress)).toFixed(1)));
      const remainingTime = Math.max(1, Math.round(3 * (1 - progress)));
      setDriverDistanceKm(remainingDist);
      setDriverEtaMinutes(remainingTime);

      if (step >= totalSteps) {
        clearInterval(approachInterval);
        setDriverPos([pickup.lat, pickup.lng]);
        setDriverDistanceKm(0);
        setDriverEtaMinutes(0);
      }
    }, 2500);

    return () => clearInterval(approachInterval);
  }, [rideStage, pickup]);

  // 6. Destination Movement Simulation (When Trip is ACTIVE)
  useEffect(() => {
    if (rideStage !== 'TRIP_ACTIVE' || !route || route.coordinates.length === 0) return;

    setDriverPos(route.coordinates[0]);
    simulationStepRef.current = 0;

    const tripInterval = setInterval(() => {
      if (simulationStepRef.current < route.coordinates.length - 1) {
        simulationStepRef.current += 1;
        setDriverPos(route.coordinates[simulationStepRef.current]);

        const progress = simulationStepRef.current / route.coordinates.length;
        const remainingKm = Math.max(0.1, Number((route.distanceKm * (1 - progress)).toFixed(1)));
        const remainingMins = Math.max(1, Math.round(route.durationMinutes * (1 - progress)));
        setDriverDistanceKm(remainingKm);
        setDriverEtaMinutes(remainingMins);
      }
    }, 1200);

    return () => clearInterval(tripInterval);
  }, [rideStage, route]);

  // Request Ride Handler
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
      localStorage.setItem('saferide_active_ride', JSON.stringify(newRide));
      setRideStage('SEARCHING_DRIVER');

      // Notify Driver Dashboard instantly
      if (transitChannel) {
        transitChannel.postMessage({ type: 'RIDE_REQUESTED', ride: newRide });
      }

      toast.success('📡 Ride requested! Connecting to available Parul campus drivers...', {
        duration: 5000,
        icon: '🚗',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request ride. Please check authentication.');
    } finally {
      setIsBooking(false);
    }
  };

  // Demo testing shortcut handlers (enables 1-click test of Ola/Uber flow in 1 tab)
  const handleSimulateDriverAccept = async () => {
    if (!activeRide?._id) return;
    try {
      const res = await api.patch(`/rides/${activeRide._id}/accept`);
      const updated = res.data?.data?.ride;
      if (updated) {
        setActiveRide(updated);
        localStorage.setItem('saferide_active_ride', JSON.stringify(updated));
        if (transitChannel) transitChannel.postMessage({ type: 'RIDE_ACCEPTED', ride: updated });
      }
    } catch {
      // Local fallback
      const updated: IBackendRide = {
        ...activeRide,
        status: 'ASSIGNED',
        driverName: 'Rajesh Sharma',
        driverPhone: '+91 98765 43210',
        driverVehicle: 'Tata Tigor EV (GJ-06-PU-2026)',
      };
      setActiveRide(updated);
      localStorage.setItem('saferide_active_ride', JSON.stringify(updated));
      if (transitChannel) transitChannel.postMessage({ type: 'RIDE_ACCEPTED', ride: updated });
    }
    setRideStage('DRIVER_ASSIGNED');
    toast.success('🚗 Driver Rajesh Sharma accepted your ride!');
  };

  const handleSimulateDriverArrived = async () => {
    if (!activeRide?._id) return;
    try {
      await api.patch(`/rides/${activeRide._id}/status`, { status: 'ARRIVED_PICKUP' });
    } catch {}
    setRideStage('ARRIVED_PICKUP');
    setDriverPos([pickup.lat, pickup.lng]);
    setDriverDistanceKm(0);
    setDriverEtaMinutes(0);
    toast('📍 Driver Rajesh Sharma has arrived at pickup!', { icon: '🔔' });
  };

  const handleSimulateStartTrip = async () => {
    if (!activeRide?._id) return;
    try {
      await api.patch(`/rides/${activeRide._id}/status`, { status: 'ACTIVE', otp: activeRide.otp });
    } catch {}
    setRideStage('TRIP_ACTIVE');
    toast.success('🚀 PIN Verified! Safe campus transit active.');
  };

  const handleSimulateCompleteTrip = async () => {
    if (!activeRide?._id) return;
    try {
      await api.patch(`/rides/${activeRide._id}/status`, { status: 'COMPLETED' });
    } catch {}
    setRideStage('COMPLETED');
    setDriverPos([dropoff.lat, dropoff.lng]);
    toast.success('🏁 You have reached your destination!');
  };

  // Cancel ride handler
  const handleCancelRide = async () => {
    if (activeRide?._id) {
      try {
        await api.patch(`/rides/${activeRide._id}/cancel`);
      } catch {}
    }
    localStorage.removeItem('saferide_active_ride');
    setActiveRide(null);
    setRideStage('IDLE');
    setDriverPos(null);
    simulationStepRef.current = 0;
    toast('Ride request cancelled.', { icon: 'ℹ️' });
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (rideStage !== 'IDLE') return;
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
    <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden relative">
      {/* Top Header Bar */}
      <div className="p-5 md:p-6 bg-gradient-to-r from-brand-700 via-brand-800 to-indigo-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-200">
            <FiShield className="text-emerald-400" /> Parul University Safe Transit & Fleet
          </div>
          <h2 className="text-2xl font-black mt-1">Live Campus Ride & Real-Time Driver Map</h2>
          <p className="text-xs text-brand-100 mt-0.5">
            Geofenced campus safety &bull; CartoDB high-speed vector tiles &bull; 4-Digit student PIN
          </p>
        </div>

        {/* Map Theme Selector & Live Summary */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs flex items-center gap-2">
            <FiLayers className="text-brand-300" />
            <select
              value={mapTheme}
              onChange={(e) => setMapTheme(e.target.value as any)}
              className="bg-transparent text-white font-medium outline-none cursor-pointer"
            >
              {Object.entries(MAP_THEMES).map(([k, t]) => (
                <option key={k} value={k} className="text-gray-900 bg-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {route && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-xs">
              <span className="font-bold">{route.distanceKm} km</span>
              <span className="w-1 h-1 rounded-full bg-white/40"></span>
              <span className="font-bold">~{route.durationMinutes} mins</span>
              <span className="w-1 h-1 rounded-full bg-white/40"></span>
              <span className="font-black text-emerald-300 text-sm">₹{route.estimatedFare}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Left Side: Ride Controls / Ola & Uber Live Driver HUD */}
        <div className="p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          {/* STAGE 1: SEARCHING FOR DRIVER (Ola/Uber Radar Screen) */}
          {rideStage === 'SEARCHING_DRIVER' && activeRide && (
            <div className="space-y-5 animate-fadeIn">
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center relative overflow-hidden">
                {/* Radar Wave Animation */}
                <div className="relative w-20 h-20 mx-auto mb-3 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-amber-400 opacity-25 animate-ping"></span>
                  <span className="absolute inset-2 rounded-full bg-amber-500 opacity-40 animate-pulse"></span>
                  <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center text-xl shadow-lg relative z-10">
                    <FiRadio className="animate-spin" />
                  </div>
                </div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Finding Nearby Driver...
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Your ride request is broadcasting to on-duty campus drivers near Parul University.
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
                  Keep this ready to share with driver Rajesh Sharma once vehicle arrives.
                </p>
              </div>

              {/* Ride Waypoints Summary */}
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
                  <span>Subsidized Fare:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    ₹{activeRide.fare}
                  </strong>
                </div>
              </div>

              {/* Testing & Demo Helper Bar */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-blue-800 dark:text-blue-300 font-semibold">
                  <span>💡 Testing Mode:</span>
                  <span className="text-[10px] bg-blue-200 dark:bg-blue-900 px-2 py-0.5 rounded">1-Click Test</span>
                </div>
                <button
                  onClick={handleSimulateDriverAccept}
                  className="w-full py-2.5 px-3 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <FiTruck /> Accept as Driver (Demo)
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

          {/* STAGE 2, 3, 4: DRIVER ASSIGNED, ARRIVED, OR IN TRANSIT (Full Ola/Uber HUD) */}
          {(rideStage === 'DRIVER_ASSIGNED' ||
            rideStage === 'ARRIVED_PICKUP' ||
            rideStage === 'TRIP_ACTIVE') &&
            activeRide && (
              <div className="space-y-4 animate-fadeIn">
                {/* Real-time Status Card */}
                <div
                  className={`p-4 rounded-2xl border ${
                    rideStage === 'ARRIVED_PICKUP'
                      ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 animate-pulse'
                      : rideStage === 'TRIP_ACTIVE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                      <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping"></span>
                      {rideStage === 'DRIVER_ASSIGNED' && 'Driver En Route to Pickup'}
                      {rideStage === 'ARRIVED_PICKUP' && 'Driver Has Arrived!'}
                      {rideStage === 'TRIP_ACTIVE' && 'Trip In Progress'}
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-500">
                      {activeRide._id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-gray-900 dark:text-white mt-1">
                    {rideStage === 'DRIVER_ASSIGNED' &&
                      `Driver is ${driverDistanceKm} km away (~${driverEtaMinutes} mins)`}
                    {rideStage === 'ARRIVED_PICKUP' &&
                      'Your driver is waiting at the pickup spot!'}
                    {rideStage === 'TRIP_ACTIVE' &&
                      `Navigating to destination (~${driverDistanceKm} km remaining)`}
                  </h3>
                </div>

                {/* Ola/Uber Verified Driver & Vehicle Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-13 h-13 rounded-2xl bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-3xl shadow-sm">
                      👨‍✈️
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-base text-gray-900 dark:text-white">
                          {activeRide.driverName || 'Rajesh Sharma'}
                        </h4>
                        <FiCheckCircle className="text-emerald-500 text-sm" title="Verified Campus Driver" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                        <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                          <FiStar className="fill-current text-xs" /> 4.9
                        </span>
                        <span>&bull; 1,240 campus trips</span>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Model & Official License Plate Badge */}
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-semibold">Vehicle</span>
                      <strong className="text-gray-900 dark:text-white text-xs">
                        {activeRide.driverVehicle || 'Tata Tigor EV (Campus Fleet)'}
                      </strong>
                    </div>

                    {/* Official License Plate Box */}
                    <div className="px-2.5 py-1 rounded bg-amber-300 dark:bg-amber-400 text-gray-950 font-mono font-black text-xs tracking-wider border border-amber-500 shadow-sm">
                      GJ-06-PU-2026
                    </div>
                  </div>

                  {/* 4-Digit Security PIN Callout */}
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Rider Security PIN
                    </span>
                    <span className="font-mono text-3xl font-black tracking-widest text-amber-900 dark:text-amber-200 block mt-0.5">
                      {activeRide.otp}
                    </span>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                      {rideStage === 'TRIP_ACTIVE'
                        ? '✅ PIN verified by driver'
                        : 'Share this PIN with Rajesh to start your ride'}
                    </p>
                  </div>
                </div>

                {/* Waypoints */}
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
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="tel:+919876543210"
                    className="py-2.5 px-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 transition shadow flex items-center justify-center gap-1.5 text-xs"
                  >
                    <FiPhone /> Call Driver
                  </a>
                  <button
                    onClick={() => toast('Opening chat with Rajesh Sharma...')}
                    className="py-2.5 px-3 rounded-xl font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <FiMessageSquare /> Chat
                  </button>
                </div>

                {/* Testing Controls to easily advance the trip locally */}
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-xs space-y-2">
                  <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 block">
                    Testing Simulator
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {rideStage === 'DRIVER_ASSIGNED' && (
                      <button
                        onClick={handleSimulateDriverArrived}
                        className="py-1.5 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        📍 Driver Arrived
                      </button>
                    )}
                    {rideStage === 'ARRIVED_PICKUP' && (
                      <button
                        onClick={handleSimulateStartTrip}
                        className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        🚀 Start Ride (PIN)
                      </button>
                    )}
                    {rideStage === 'TRIP_ACTIVE' && (
                      <button
                        onClick={handleSimulateCompleteTrip}
                        className="col-span-2 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                      >
                        🏁 Complete Trip
                      </button>
                    )}
                    <button
                      onClick={handleCancelRide}
                      className="py-1.5 px-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold text-[11px] cursor-pointer"
                    >
                      Cancel Ride
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* STAGE 5: COMPLETED (Ola/Uber Receipt & Rating Screen) */}
          {rideStage === 'COMPLETED' && activeRide && (
            <div className="space-y-4 animate-fadeIn text-center">
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-lg">
                  🏁
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  You Have Safely Arrived!
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Campus safe transit completed to <strong>{activeRide.dropoffLocation.address}</strong>
                </p>
              </div>

              {/* Receipt Breakdown */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs space-y-2">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subsidized Fare:</span>
                  <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">
                    ₹{activeRide.fare}
                  </strong>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Payment Method:</span>
                  <strong className="text-gray-900 dark:text-white">Campus Transit Wallet</strong>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Driver:</span>
                  <strong className="text-gray-900 dark:text-white">{activeRide.driverName || 'Rajesh Sharma'}</strong>
                </div>
              </div>

              {/* Star Rating Widget */}
              <div className="p-4 rounded-2xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 space-y-2">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 block">
                  Rate your trip with Rajesh
                </span>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setSelectedRating(star)}
                      className="text-2xl text-amber-400 hover:scale-125 transition cursor-pointer"
                    >
                      ★
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-gray-400 block">{selectedRating} Stars selected</span>
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem('saferide_active_ride');
                  setActiveRide(null);
                  setRideStage('IDLE');
                  setDriverPos(null);
                  toast.success('Thank you for rating! Ride saved to history.');
                }}
                className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Book Another Ride
              </button>
            </div>
          )}

          {/* STAGE 0: IDLE (Selection & Booking Form) */}
          {rideStage === 'IDLE' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
                  🟢 Pickup Point (Parul Campus / Vadodara)
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
                  📍 Dropoff Point (Parul Campus / Vadodara)
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

              {/* Institutional Safety Policy */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                  <FiShield className="text-emerald-600 dark:text-emerald-400" /> 24/7 Security Office Monitored
                </div>
                Institutional GPS geofencing active. Only verified drivers with campus IDs are dispatched.
              </div>

              {/* Booking CTA */}
              <div className="pt-2">
                <button
                  onClick={() => setIsPaymentOpen(true)}
                  disabled={isLoadingRoute || !route || isBooking}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FiCreditCard />
                  {isBooking
                    ? 'Broadcasting Ride Request...'
                    : route
                    ? `Book Campus Ride &bull; ₹${route.estimatedFare}`
                    : 'Calculating Fare...'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Interactive Leaflet Map with CartoDB Voyager Tiles */}
        <div className="lg:col-span-2 h-[520px] relative z-0">
          <MapContainer
            center={[22.2887, 73.3634]} // Centered on Parul University
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', minHeight: '520px' }}
          >
            {/* 100% Free Public Tile Layer (No API Key Required) */}
            <TileLayer
              key={mapTheme}
              attribution={MAP_THEMES[mapTheme].attribution}
              url={MAP_THEMES[mapTheme].url}
              subdomains={MAP_THEMES[mapTheme].subdomains}
              maxZoom={19}
            />

            {/* Map Controller for auto-resizing and bounds fitting */}
            <MapController
              center={[22.2887, 73.3634]}
              routeCoords={route?.coordinates}
              driverPos={driverPos}
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
                <strong>Parul University Safe Campus Geofence</strong>
                <br />
                Waghodia, Vadodara
              </Popup>
            </Polygon>

            {/* Pickup Marker */}
            <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
              <Popup>
                <strong>Pickup Location:</strong> {pickup.name}
                <br />
                {pickup.description}
              </Popup>
            </Marker>

            {/* Dropoff Marker */}
            <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
              <Popup>
                <strong>Dropoff Location:</strong> {dropoff.name}
                <br />
                {dropoff.description}
              </Popup>
            </Marker>

            {/* Main Destination Route Polyline */}
            {route && (
              <Polyline
                positions={route.coordinates}
                pathOptions={{
                  color: '#2563eb',
                  weight: 5,
                  opacity: 0.85,
                }}
              />
            )}

            {/* Driver Approach Polyline (When driver is en route to pickup) */}
            {driverPos && rideStage === 'DRIVER_ASSIGNED' && (
              <Polyline
                positions={[driverPos, [pickup.lat, pickup.lng]]}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 4,
                  dashArray: '8, 8',
                  opacity: 0.85,
                }}
              />
            )}

            {/* LIVE MOVING DRIVER VEHICLE MARKER (Shown in Assigned, Arrived, and Active stages) */}
            {driverPos &&
              (rideStage === 'DRIVER_ASSIGNED' ||
                rideStage === 'ARRIVED_PICKUP' ||
                rideStage === 'TRIP_ACTIVE') && (
                <Marker position={driverPos} icon={driverCarIcon}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <strong className="text-brand-600 block">🚗 Rajesh Sharma (Driver)</strong>
                      <span>Vehicle: Tata Tigor EV (GJ-06-PU-2026)</span>
                      <br />
                      <span className="font-bold text-emerald-600">
                        {rideStage === 'DRIVER_ASSIGNED' &&
                          `En route to pickup (${driverDistanceKm} km away)`}
                        {rideStage === 'ARRIVED_PICKUP' && 'Waiting at pickup spot'}
                        {rideStage === 'TRIP_ACTIVE' && 'Heading to dropoff point'}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              )}
          </MapContainer>

          {/* Map Overlay Badge & Hint */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-[11px] text-gray-700 dark:text-gray-300 shadow-md flex items-center gap-2">
            <FiCompass className="text-brand-500" /> Click anywhere on map to change destination
          </div>

          {/* Live Proximity Indicator (Floating when driver is assigned) */}
          {rideStage === 'DRIVER_ASSIGNED' && (
            <div className="absolute top-4 left-4 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-amber-300 dark:border-amber-700 shadow-lg flex items-center gap-3 animate-bounce">
              <span className="text-2xl">🚗</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                  Driver Approaching
                </span>
                <span className="text-xs font-black text-gray-900 dark:text-white">
                  {driverDistanceKm} km away &bull; ~{driverEtaMinutes} mins
                </span>
              </div>
            </div>
          )}
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
