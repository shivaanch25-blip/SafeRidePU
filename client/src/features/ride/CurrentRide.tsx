import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../config/axios.js';
import toast from 'react-hot-toast';
import {
  FiRadio,
  FiPhone,
  FiCheckCircle,
  FiStar,
  FiXCircle,
  FiCompass,
  FiRefreshCw,
  FiShield,
} from 'react-icons/fi';

export interface IActiveRide {
  _id: string;
  id?: string;
  rider: string;
  riderName?: string;
  riderPhone?: string;
  driver?: string;
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
  status: 'REQUESTED' | 'ASSIGNED' | 'EN_ROUTE_TO_PICKUP' | 'ARRIVED_PICKUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  fare: number;
  distanceKm: number;
  otp: string;
  createdAt?: string;
}

export const CurrentRide: React.FC = () => {
  const [ride, setRide] = useState<IActiveRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [driverDistanceKm, setDriverDistanceKm] = useState(1.8);
  const [driverEtaMins, setDriverEtaMins] = useState(3);
  const [transitChannel, setTransitChannel] = useState<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('saferide_transit_channel');
      setTransitChannel(channel);
      return () => {
        channel.close();
      };
    }
    return undefined;
  }, []);

  // Fetch current active ride
  const fetchCurrentRide = async (showToast = false) => {
    try {
      // Check localStorage first for instant responsiveness
      const cached = localStorage.getItem('saferide_active_ride');
      if (cached && !ride) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed._id && parsed.status !== 'COMPLETED' && parsed.status !== 'CANCELLED') {
            setRide(parsed);
          }
        } catch {}
      }

      const res = await api.get('/rides/current');
      const activeRide: IActiveRide = res.data?.data?.ride;

      if (activeRide && activeRide.status !== 'COMPLETED' && activeRide.status !== 'CANCELLED') {
        setRide(activeRide);
        localStorage.setItem('saferide_active_ride', JSON.stringify(activeRide));
        if (showToast) toast.success('Ride status refreshed!');
      } else {
        setRide(null);
        localStorage.removeItem('saferide_active_ride');
      }
    } catch (err: any) {
      console.error('Failed to fetch current ride:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRide();
  }, []);

  // Listen to BroadcastChannel for real-time driver actions
  useEffect(() => {
    if (!transitChannel) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || !data.ride) return;

      const updated: IActiveRide = data.ride;
      if (ride && ride._id !== updated._id) return;

      setRide(updated);
      localStorage.setItem('saferide_active_ride', JSON.stringify(updated));

      if (data.type === 'RIDE_ACCEPTED' || updated.status === 'ASSIGNED') {
        toast.success(`🚗 Driver ${updated.driverName || 'Rajesh Sharma'} accepted your ride!`, {
          duration: 5000,
          icon: '🚗',
        });
      } else if (data.type === 'DRIVER_ARRIVED' || updated.status === 'ARRIVED_PICKUP') {
        setDriverDistanceKm(0);
        setDriverEtaMins(0);
        toast('📍 Driver has arrived at pickup! Share your 4-digit PIN.', {
          duration: 6000,
          icon: '🔔',
        });
      } else if (data.type === 'TRIP_STARTED' || updated.status === 'ACTIVE') {
        toast.success('🚀 PIN verified! Safe transit to destination in progress.', {
          duration: 5000,
        });
      } else if (data.type === 'TRIP_COMPLETED' || updated.status === 'COMPLETED') {
        toast.success('🏁 You have safely reached your destination! Safe ride completed.', {
          duration: 7000,
          icon: '✨',
        });
      }
    };

    transitChannel.onmessage = handleMessage;
  }, [transitChannel, ride]);

  // Polling fallback every 2.5 seconds
  useEffect(() => {
    if (!ride?._id || ride.status === 'COMPLETED' || ride.status === 'CANCELLED') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/rides/${ride._id}`);
        const updated: IActiveRide = res.data?.data?.ride;
        if (!updated) return;

        setRide(updated);
        localStorage.setItem('saferide_active_ride', JSON.stringify(updated));

        if (updated.status === 'ASSIGNED' && ride.status === 'REQUESTED') {
          toast.success(`🚗 Driver ${updated.driverName || 'Rajesh Sharma'} accepted your ride!`);
        } else if (updated.status === 'ARRIVED_PICKUP' && ride.status !== 'ARRIVED_PICKUP') {
          setDriverDistanceKm(0);
          setDriverEtaMins(0);
          toast('📍 Driver has arrived at pickup! Share your 4-digit PIN.');
        } else if (updated.status === 'ACTIVE' && ride.status !== 'ACTIVE') {
          toast.success('🚀 PIN verified! Trip started.');
        } else if (updated.status === 'COMPLETED') {
          toast.success('🏁 You have reached your destination!');
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [ride?._id, ride?.status]);

  // Cancel ride handler
  const handleCancelRide = async () => {
    if (!ride?._id) return;
    try {
      await api.patch(`/rides/${ride._id}/cancel`);
    } catch {}
    setRide(null);
    localStorage.removeItem('saferide_active_ride');
    toast('Ride request cancelled.', { icon: 'ℹ️' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-gray-500">Checking for active campus rides...</p>
      </div>
    );
  }

  // NO ACTIVE RIDE STATE
  if (!ride || ride.status === 'CANCELLED') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-brand-50 dark:bg-gray-800 flex items-center justify-center text-4xl shadow-sm border border-brand-100 dark:border-gray-700">
          🚗
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">No Active Campus Ride</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            You don't have an ongoing ride right now. Select pickup and dropoff points on the campus map to request a safe ride.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/30 transition"
          >
            <FiCompass /> Book Ride on Campus Map
          </Link>
          <button
            onClick={() => fetchCurrentRide(true)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition cursor-pointer"
          >
            <FiRefreshCw /> Check Status
          </button>
        </div>
      </div>
    );
  }

  // ACTIVE RIDE PRESENT
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Banner / Safety Bar */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-800 to-indigo-900 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mb-2">
            <FiShield /> Live SafeRide Transit Tracker
          </span>
          <h1 className="text-2xl font-black">Current Campus Ride</h1>
          <p className="text-xs text-brand-100 mt-0.5">
            Ride ID: <span className="font-mono font-bold">{ride._id.slice(-8).toUpperCase()}</span> &bull; 24/7 Monitored
          </p>
        </div>

        <button
          onClick={() => fetchCurrentRide(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 transition cursor-pointer"
        >
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* STAGE 1: WAITING FOR DRIVER */}
      {ride.status === 'REQUESTED' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-md border border-gray-100 dark:border-gray-700 space-y-6">
          <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center relative overflow-hidden">
            {/* Radar Wave Animation */}
            <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-amber-400 opacity-25 animate-ping"></span>
              <span className="absolute inset-2 rounded-full bg-amber-500 opacity-40 animate-pulse"></span>
              <div className="w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl shadow-xl relative z-10">
                <FiRadio className="animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              Waiting for Driver...
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
              Your ride request has been dispatched to campus transit drivers around Parul University Waghodia Campus.
            </p>
          </div>

          {/* 4-Digit Security PIN */}
          <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-center">
            <span className="block text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Your 4-Digit Security PIN
            </span>
            <span className="font-mono text-4xl font-black tracking-widest text-amber-900 dark:text-amber-200 block mt-1">
              {ride.otp}
            </span>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Keep this PIN handy. Share it with your driver only when they arrive at your pickup point.
            </p>
          </div>

          {/* Trip Waypoint Details */}
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 text-lg mt-0.5">🟢</span>
              <div className="flex-1">
                <span className="text-xs uppercase font-semibold text-gray-400 block">Pickup Location</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">{ride.pickupLocation.address}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700"></div>
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-lg mt-0.5">📍</span>
              <div className="flex-1">
                <span className="text-xs uppercase font-semibold text-gray-400 block">Dropoff Destination</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">{ride.dropoffLocation.address}</span>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Subsidized Fare:</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg">₹{ride.fare}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/"
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white text-center transition shadow-md flex items-center justify-center gap-2"
            >
              <FiCompass /> View on Live Campus Map
            </Link>
            <button
              onClick={handleCancelRide}
              className="py-3 px-5 rounded-xl font-bold text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-800 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <FiXCircle /> Cancel Ride
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2, 3, 4: DRIVER ASSIGNED / ARRIVED / ACTIVE */}
      {(ride.status === 'ASSIGNED' ||
        ride.status === 'EN_ROUTE_TO_PICKUP' ||
        ride.status === 'ARRIVED_PICKUP' ||
        ride.status === 'ACTIVE') && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-md border border-gray-100 dark:border-gray-700 space-y-6 animate-fadeIn">
          {/* Status Header */}
          <div
            className={`p-5 rounded-2xl border ${
              ride.status === 'ARRIVED_PICKUP'
                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 animate-pulse'
                : ride.status === 'ACTIVE'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping"></span>
                {ride.status === 'ASSIGNED' || ride.status === 'EN_ROUTE_TO_PICKUP'
                  ? 'Driver En Route to Pickup'
                  : ride.status === 'ARRIVED_PICKUP'
                  ? 'Driver Has Arrived!'
                  : 'Trip In Progress'}
              </span>
              <span className="text-xs font-mono font-bold text-gray-500">
                {ride._id.slice(-6).toUpperCase()}
              </span>
            </div>

            <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1">
              {ride.status === 'ARRIVED_PICKUP'
                ? 'Your driver has arrived at the pickup location!'
                : ride.status === 'ACTIVE'
                ? 'Safe campus transit to destination in progress.'
                : `Driver is ~${driverDistanceKm} km away (~${driverEtaMins} mins)`}
            </h2>
          </div>

          {/* Driver & Vehicle Details Card */}
          <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-3xl shadow-sm">
                👨‍✈️
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {ride.driverName || 'Rajesh Sharma'}
                  </h3>
                  <FiCheckCircle className="text-emerald-500 text-base" title="Verified Campus Driver" />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                    <FiStar className="fill-current" /> 4.9
                  </span>
                  <span>&bull; Parul Campus Authorized Driver</span>
                </div>
              </div>
            </div>

            {/* Vehicle Model & Plate Badge */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-between border border-gray-200 dark:border-gray-600">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Assigned Vehicle</span>
                <strong className="text-sm text-gray-900 dark:text-white">
                  {ride.driverVehicle || 'Tata Tigor EV (GJ-06-PU-2026)'}
                </strong>
              </div>
              <div className="px-3 py-1 rounded bg-amber-300 dark:bg-amber-400 text-gray-950 font-mono font-black text-xs tracking-wider border border-amber-500 shadow-sm">
                GJ-06-PU-2026
              </div>
            </div>

            {/* Security PIN Callout */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Rider Security PIN
              </span>
              <span className="font-mono text-3xl font-black tracking-widest text-amber-900 dark:text-amber-200 block mt-0.5">
                {ride.otp}
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                {ride.status === 'ACTIVE'
                  ? '✅ Verified by driver upon departure'
                  : 'Share this PIN with your driver to start your ride'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={`tel:${ride.driverPhone || '+919876543210'}`}
              className="py-3 px-4 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white transition flex items-center justify-center gap-2 shadow-md"
            >
              <FiPhone /> Call Driver
            </a>
            <Link
              to="/"
              className="py-3 px-4 rounded-xl font-bold text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-650 text-gray-800 dark:text-white transition flex items-center justify-center gap-2"
            >
              <FiCompass /> Track on Live Map
            </Link>
          </div>
        </div>
      )}

      {/* STAGE 5: COMPLETED */}
      {ride.status === 'COMPLETED' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-md border border-gray-100 dark:border-gray-700 text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl shadow-lg">
            🏁
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">You Have Safely Arrived!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Campus safe transit completed to <strong>{ride.dropoffLocation.address}</strong>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 max-w-sm mx-auto space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Distance:</span>
              <strong className="text-gray-900 dark:text-white">{ride.distanceKm} km</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Subsidized Fare:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹{ride.fare}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-bold text-emerald-600">Paid &bull; Completed</span>
            </div>
          </div>

          <Link
            to="/"
            onClick={() => {
              setRide(null);
              localStorage.removeItem('saferide_active_ride');
            }}
            className="inline-flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white transition shadow-lg shadow-brand-600/30"
          >
            <FiCompass /> Book Another Campus Ride
          </Link>
        </div>
      )}
    </div>
  );
};

export default CurrentRide;
