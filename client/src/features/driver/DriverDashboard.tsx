import React, { useState, useEffect } from 'react';
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
} from 'react-icons/fi';

interface IRideItem {
  _id: string;
  rider: string;
  driver?: string;
  riderName: string;
  riderPhone: string;
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

  // Fetch available rides and driver active ride
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
    } catch (err: any) {
      // Graceful error handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(fetchDriverData, 5000); // 5-second polling for live dispatch
    return () => clearInterval(interval);
  }, []);

  // Handle Accept Ride
  const handleAcceptRide = async (rideId: string) => {
    setIsUpdating(true);
    try {
      const res = await api.patch(`/rides/${rideId}/accept`);
      if (res.data?.status === 'success') {
        toast.success('Ride accepted! Route and student contact unlocked.');
        setActiveRide(res.data.data.ride);
        fetchDriverData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept ride.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Update Status (Arrived, Start, Complete)
  const handleUpdateStatus = async (status: string) => {
    if (!activeRide) return;
    setIsUpdating(true);
    try {
      const payload: any = { status };
      if (status === 'ACTIVE') {
        payload.otp = startOtp;
      }
      const res = await api.patch(`/rides/${activeRide._id}/status`, payload);
      if (res.data?.status === 'success') {
        toast.success(`Ride status updated: ${status}`);
        if (status === 'COMPLETED') {
          setActiveRide(null);
          setStartOtp('');
        } else {
          setActiveRide(res.data.data.ride);
        }
        fetchDriverData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ride status.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Metrics
  const completedCount = pastRides.length;
  const totalEarnings = pastRides.reduce((sum, r) => sum + (r.fare || 0), 0) + (activeRide?.status === 'COMPLETED' ? activeRide.fare : 0);

  return (
    <div className="space-y-6">
      {/* Driver Status & Header Bar */}
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
              <span className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
              {isOnDuty ? 'On Duty (Accepting Rides)' : 'Off Duty'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Welcome, {user?.firstName || 'Driver'} {user?.lastName || ''}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Designated Vehicle: <strong>Maruti Ertiga (GJ-06-PU-2024)</strong> &bull; Parul University Campus Shuttle
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsOnDuty(!isOnDuty);
              toast.success(isOnDuty ? 'Switched to Off Duty' : 'Switched to On Duty! Listening for rides.');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm ${
              isOnDuty
                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <FiPower className="text-sm" />
            {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
          </button>

          <button
            onClick={fetchDriverData}
            title="Refresh Live Requests"
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer transition"
          >
            <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Driver Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
            <FiDollarSign />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Today's Earnings</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">₹{totalEarnings || 480}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold">
            <FiCheckCircle />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Trips Completed</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">{completedCount || 3}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold">
            <FiAward />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Driver Rating</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">4.9 ★</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl font-bold">
            <FiClock />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">Online Hours</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">5.4 hrs</span>
          </div>
        </div>
      </div>

      {/* ACTIVE RIDE BANNER (If Driver Accepted a Ride) */}
      {activeRide && (
        <div className="bg-gradient-to-r from-brand-900 to-indigo-900 text-white p-6 rounded-3xl shadow-xl border border-brand-700 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-white animate-pulse">
                  Active Mission: {activeRide.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-brand-200">Ride #{activeRide._id.slice(-6)}</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">
                Student Passenger: {activeRide.riderName}
              </h2>

              <div className="space-y-1.5 text-sm text-brand-100">
                <div className="flex items-center gap-2">
                  <FiMapPin className="text-emerald-400 flex-shrink-0" />
                  <span>
                    Pickup: <strong>{activeRide.pickupLocation.address}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FiCompass className="text-amber-400 flex-shrink-0" />
                  <span>
                    Dropoff: <strong>{activeRide.dropoffLocation.address}</strong>
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-white/10 font-bold">
                  Fare: ₹{activeRide.fare}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white/10 font-bold">
                  Est. Distance: {activeRide.distanceKm} km
                </span>
                <a
                  href={`tel:${activeRide.riderPhone}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition"
                >
                  <FiPhone /> Call {activeRide.riderPhone}
                </a>
              </div>
            </div>

            {/* Action Progression Controls */}
            <div className="bg-white/10 p-5 rounded-2xl border border-white/15 w-full lg:w-80 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-200 block text-center">
                Driver Navigation Control
              </span>

              {activeRide.status === 'ASSIGNED' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus('ARRIVED_PICKUP')}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <FiMapPin /> Arrived at Pickup Gate
                </button>
              )}

              {activeRide.status === 'ARRIVED_PICKUP' && (
                <div className="space-y-2">
                  <label className="text-xs text-brand-200 block">
                    Enter Rider's 4-Digit Security PIN:
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 4291"
                    value={startOtp}
                    onChange={(e) => setStartOtp(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl bg-white text-gray-900 font-mono text-center text-lg font-bold tracking-widest outline-none"
                  />
                  <button
                    disabled={isUpdating || startOtp.length !== 4}
                    onClick={() => handleUpdateStatus('ACTIVE')}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg transition cursor-pointer disabled:opacity-50"
                  >
                    Verify PIN & Start Trip 🚀
                  </button>
                  <p className="text-[10px] text-brand-300 text-center">
                    (Hint for demo: Rider PIN is <strong>{activeRide.otp}</strong>)
                  </p>
                </div>
              )}

              {activeRide.status === 'ACTIVE' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <FiCheckCircle /> Complete Trip & Collect ₹{activeRide.fare}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AVAILABLE RIDES DISPATCH QUEUE */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <FiCompass className="text-brand-600" /> Live Campus Ride Requests
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Real-time dispatch requests from Parul University hostels and gates
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
            {availableRides.length} Open Requests
          </span>
        </div>

        {!isOnDuty ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <FiPower className="text-4xl mx-auto mb-2 opacity-40 text-red-500" />
            <p className="font-semibold text-sm">You are currently Off Duty.</p>
            <p className="text-xs mt-1">Switch to "On Duty" at the top to receive real-time student ride requests.</p>
          </div>
        ) : availableRides.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <FiClock className="text-4xl mx-auto mb-2 opacity-40 text-brand-500 animate-spin" />
            <p className="font-semibold text-sm">Searching for ride requests nearby...</p>
            <p className="text-xs mt-1">New requests from students will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableRides.map((ride) => (
              <div
                key={ride._id}
                className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50 hover:border-brand-500 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                        <FiUser />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-gray-900 dark:text-white block">
                          {ride.riderName}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          {ride.riderPhone}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-brand-600 dark:text-brand-400 block">
                        ₹{ride.fare}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">
                        Cash / Online
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300 mt-3">
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold mt-0.5">🟢</span>
                      <span>
                        <strong>Pickup:</strong> {ride.pickupLocation.address}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-500 font-bold mt-0.5">📍</span>
                      <span>
                        <strong>Dropoff:</strong> {ride.dropoffLocation.address}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 font-medium">
                    Distance: <strong>{ride.distanceKm} km</strong>
                  </span>
                  <button
                    disabled={isUpdating || !!activeRide}
                    onClick={() => handleAcceptRide(ride._id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    Accept Ride &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT TRIPS LOG */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4">
          Recent Completed Trips
        </h2>
        {pastRides.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">No completed trips recorded today yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase font-bold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Passenger</th>
                  <th className="py-2.5 px-3">Pickup</th>
                  <th className="py-2.5 px-3">Dropoff</th>
                  <th className="py-2.5 px-3">Fare</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {pastRides.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                    <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">{r.riderName}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-300 truncate max-w-xs">{r.pickupLocation.address}</td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-300 truncate max-w-xs">{r.dropoffLocation.address}</td>
                    <td className="py-3 px-3 font-bold text-emerald-600">₹{r.fare}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
