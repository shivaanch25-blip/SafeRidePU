import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import api from '../../config/axios.js';
import toast from 'react-hot-toast';
import {
  FiCheckCircle,
  FiMapPin,
  FiPhone,
  FiUser,
  FiDollarSign,
  FiClock,
  FiAward,
  FiRefreshCw,
  FiCompass,
  FiPower,
  FiTruck,
  FiKey,
} from 'react-icons/fi';

interface IRideItem {
  _id: string;
  rider: string;
  driver?: string;
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
  status: string;
  fare: number;
  distanceKm: number;
  otp: string;
  createdAt: string;
}

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [availableRides, setAvailableRides] = useState<IRideItem[]>([]);
  const [activeRide, setActiveRide] = useState<IRideItem | null>(null);
  const [pastRides, setPastRides] = useState<IRideItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startOtp, setStartOtp] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // BroadcastChannel for instant cross-tab sync with student console
  const transitChannel = useMemo(() => {
    try {
      return new BroadcastChannel('saferide_transit_channel');
    } catch {
      return null;
    }
  }, []);

  // Fetch driver data from backend
  const fetchDriverData = async () => {
    try {
      const [availRes, activeRes, pastRes] = await Promise.all([
        api.get('/rides/available'),
        api.get('/rides/active'),
        api.get('/rides/my-rides'),
      ]);

      if (availRes.data?.data?.rides) {
        setAvailableRides(availRes.data.data.rides);
      }
      if (activeRes.data?.data?.ride) {
        setActiveRide(activeRes.data.data.ride);
      } else {
        setActiveRide(null);
      }
      if (pastRes.data?.data?.rides) {
        setPastRides(pastRes.data.data.rides.filter((r: IRideItem) => r.status === 'COMPLETED'));
      }
    } catch {
      // Tolerate temporary connection drop
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(fetchDriverData, 2500); // 2.5-second live refresh

    if (transitChannel) {
      transitChannel.onmessage = (event) => {
        if (event.data?.type === 'RIDE_REQUESTED') {
          fetchDriverData();
          toast('🔔 New campus ride requested by student!', { icon: '🚗' });
        }
      };
    }

    return () => clearInterval(interval);
  }, [transitChannel]);

  // Accept a ride request
  const handleAcceptRide = async (rideId: string) => {
    setIsUpdating(true);
    try {
      const res = await api.patch(`/rides/${rideId}/accept`);
      if (res.data?.status === 'success') {
        const acceptedRide = res.data.data.ride;
        toast.success('🚗 Ride accepted! Heading to student pickup location.');
        setActiveRide(acceptedRide);
        localStorage.setItem('saferide_active_ride', JSON.stringify(acceptedRide));

        // Notify student tab instantly
        if (transitChannel) {
          transitChannel.postMessage({ type: 'RIDE_ACCEPTED', ride: acceptedRide });
        }

        fetchDriverData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept ride.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Update ride status (ARRIVED_PICKUP, ACTIVE, COMPLETED)
  const handleUpdateStatus = async (status: string) => {
    if (!activeRide) return;
    setIsUpdating(true);
    try {
      const payload: any = { status };
      if (status === 'ACTIVE') {
        if (!startOtp.trim()) {
          toast.error('Please enter the 4-digit student security PIN.');
          setIsUpdating(false);
          return;
        }
        payload.otp = startOtp.trim();
      }

      const res = await api.patch(`/rides/${activeRide._id}/status`, payload);
      if (res.data?.status === 'success') {
        const updatedRide = res.data.data.ride;

        if (status === 'ARRIVED_PICKUP') {
          toast.success('📍 Status updated: Arrived at pickup point.');
          if (transitChannel) transitChannel.postMessage({ type: 'DRIVER_ARRIVED', ride: updatedRide });
        } else if (status === 'ACTIVE') {
          toast.success('🚀 PIN Verified! Campus trip started.');
          if (transitChannel) transitChannel.postMessage({ type: 'TRIP_STARTED', ride: updatedRide });
        } else if (status === 'COMPLETED') {
          toast.success(`🎉 Trip completed! ₹${activeRide.fare} added to your earnings.`);
          setStartOtp('');
          if (transitChannel) transitChannel.postMessage({ type: 'TRIP_COMPLETED', ride: updatedRide });
        }

        setActiveRide(status === 'COMPLETED' ? null : updatedRide);
        if (status === 'COMPLETED') {
          localStorage.removeItem('saferide_active_ride');
        } else {
          localStorage.setItem('saferide_active_ride', JSON.stringify(updatedRide));
        }

        fetchDriverData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ride status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Total metrics
  const completedCount = pastRides.length;
  const totalEarnings = pastRides.reduce((sum, r) => sum + (r.fare || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Driver Status Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
              Campus Driver Console
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                isOnDuty
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              ></span>
              {isOnDuty ? 'On Duty (Active)' : 'Off Duty'}
            </span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Welcome, {user ? `${user.firstName} ${user.lastName}` : 'Campus Driver'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Vehicle: <strong>Tata Tigor EV (GJ-06-PU-2026)</strong> &bull; Parul University Campus Transit
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsOnDuty(!isOnDuty);
              toast.success(
                !isOnDuty
                  ? '🟢 You are now ON DUTY. Ready to receive ride requests.'
                  : '⚪ You are now OFF DUTY.'
              );
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              isOnDuty
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200'
            }`}
          >
            <FiPower /> {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
          </button>

          <button
            onClick={fetchDriverData}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition cursor-pointer"
            title="Refresh Dispatches"
          >
            <FiRefreshCw className="text-sm" />
          </button>
        </div>
      </div>

      {/* Driver KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
            <FiDollarSign />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Earnings</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">₹{totalEarnings}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">
            <FiTruck />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Completed Trips</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{completedCount}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
            <FiAward />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Driver Rating</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">4.9 ★</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">
            <FiClock />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Online Time</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">4.5 hrs</h3>
          </div>
        </div>
      </div>

      {/* Active Mission HUD (If Driver has accepted a ride) */}
      {activeRide && (
        <div className="bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-brand-700 space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-5">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5 w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                ACTIVE MISSION &bull; {activeRide.status.replace(/_/g, ' ')}
              </span>
              <h3 className="text-2xl font-black mt-2">Campus Passenger In Transit</h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-brand-200">Trip Fare</span>
              <div className="text-3xl font-black text-emerald-300">₹{activeRide.fare}</div>
            </div>
          </div>

          {/* Passenger & Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-200">Passenger Info</h4>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  <FiUser />
                </div>
                <div>
                  <h5 className="font-bold text-base">{activeRide.riderName}</h5>
                  <p className="text-xs text-brand-200">Parul University Student</p>
                </div>
              </div>
              {activeRide.riderPhone && (
                <a
                  href={`tel:${activeRide.riderPhone}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition"
                >
                  <FiPhone /> Call Passenger ({activeRide.riderPhone})
                </a>
              )}
            </div>

            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-200">Route Waypoints</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">🟢 Pickup:</span>
                  <span className="font-semibold">{activeRide.pickupLocation.address}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">📍 Dropoff:</span>
                  <span className="font-semibold">{activeRide.dropoffLocation.address}</span>
                </div>
                <div className="text-brand-200 pt-1">
                  Est. Distance: <strong>{activeRide.distanceKm} km</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Progress Controls */}
          <div className="bg-black/25 p-5 rounded-2xl border border-white/10 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-200">
              Driver Mission Progression
            </h4>

            {activeRide.status === 'ASSIGNED' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-brand-200">
                  Drive towards the student pickup location. Tap below when you arrive at the spot.
                </p>
                <button
                  onClick={() => handleUpdateStatus('ARRIVED_PICKUP')}
                  disabled={isUpdating}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-gray-900 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <FiMapPin /> Arrived at Pickup Location
                </button>
              </div>
            )}

            {activeRide.status === 'ARRIVED_PICKUP' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2">
                  <FiKey className="text-base shrink-0 mt-0.5 text-amber-300" />
                  <span>
                    <strong>Student Verification:</strong> Ask the student for their 4-digit PIN shown on their screen, enter it below, and start the ride.
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    maxLength={4}
                    value={startOtp}
                    onChange={(e) => setStartOtp(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-mono tracking-widest placeholder-white/40 focus:ring-2 focus:ring-emerald-400 outline-none w-full sm:w-48 text-center"
                  />
                  <button
                    onClick={() => handleUpdateStatus('ACTIVE')}
                    disabled={isUpdating}
                    className="px-6 py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <FiCheckCircle /> Verify PIN & Start Ride
                  </button>
                </div>
              </div>
            )}

            {activeRide.status === 'ACTIVE' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Trip in Progress &bull; Campus Safe Geofence Active
                  </span>
                  <p className="text-xs text-brand-200 mt-1">
                    Once you reach the destination, tap below to complete the ride and credit fare.
                  </p>
                </div>
                <button
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  disabled={isUpdating}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <FiCheckCircle /> Complete Ride & Collect ₹{activeRide.fare}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Ride Dispatches Queue */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FiCompass className="text-brand-600 dark:text-brand-400" /> Incoming Campus Ride Requests
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Students and staff waiting for campus transit
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
            {availableRides.length} Available
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-500">Checking for campus rides...</div>
        ) : availableRides.length === 0 ? (
          <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 text-center">
            <div className="text-3xl mb-2">🚗</div>
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200">No Pending Requests Right Now</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              New ride requests booked by students on the campus map will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRides.map((ride) => (
              <div
                key={ride._id}
                className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 space-y-4 hover:border-brand-500 transition shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 uppercase">
                      Campus Transit
                    </span>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                      {ride.riderName}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Fare</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{ride.fare}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">🟢</span>
                    <div>
                      <span className="text-[10px] uppercase text-gray-400 font-semibold block">Pickup</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {ride.pickupLocation.address}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">📍</span>
                    <div>
                      <span className="text-[10px] uppercase text-gray-400 font-semibold block">Dropoff</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {ride.dropoffLocation.address}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Est. {ride.distanceKm} km
                  </span>
                  <button
                    onClick={() => handleAcceptRide(ride._id)}
                    disabled={isUpdating || !!activeRide || !isOnDuty}
                    className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <FiCheckCircle /> Accept Ride
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Rides History */}
      {pastRides.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <h3 className="text-base font-black text-gray-900 dark:text-white">Recent Completed Trips</h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {pastRides.slice(0, 5).map((r) => (
              <div key={r._id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white">{r.riderName}</span>
                  <p className="text-gray-500 dark:text-gray-400">
                    {r.pickupLocation.address} &rarr; {r.dropoffLocation.address}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{r.fare}</span>
                  <span className="block text-[10px] text-gray-400">Completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
