import React, { useState, useEffect } from 'react';
import api from '../../config/axios.js';
import toast from 'react-hot-toast';
import {
  FiUsers,
  FiTruck,
  FiMap,
  FiDollarSign,
  FiAlertTriangle,
  FiCheckCircle,
  FiSearch,
  FiRefreshCw,
  FiActivity,
  FiServer,
  FiDatabase,
  FiPlus,
  FiX,
  FiCreditCard,
  FiSmartphone,
  FiTrash2,
} from 'react-icons/fi';

interface IAdminStats {
  totalUsers: number;
  activeDrivers: number;
  totalRides: number;
  totalRevenue: number;
  activeSosCount: number;
  dbConnected: boolean;
  serverUptime: number;
}

interface IUserItem {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber?: string;
  status: string;
  isVerified: boolean;
  createdAt?: string;
}

interface IRideItem {
  _id: string;
  rider: string;
  riderName: string;
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
  status: string;
  fare: number;
  distanceKm: number;
  otp: string;
  createdAt: string;
}

interface ISosItem {
  _id: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  status: string;
  locationDescription: string;
  message?: string;
  coordinates: [number, number];
  createdAt: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'drivers' | 'rides' | 'users' | 'payments' | 'devices' | 'sos' | 'health'>('drivers');
  const [stats, setStats] = useState<IAdminStats | null>(null);
  const [users, setUsers] = useState<IUserItem[]>([]);
  const [rides, setRides] = useState<IRideItem[]>([]);
  const [sosAlerts, setSosAlerts] = useState<ISosItem[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [rideFilter, setRideFilter] = useState<'ALL' | 'ACTIVE' | 'REQUESTED' | 'COMPLETED'>('ALL');

  // Register Driver Modal State
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [newDriver, setNewDriver] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    vehicleModel: 'Tata Tigor EV (Campus Fleet)',
    plateNumber: 'GJ-06-PU-2026',
    password: 'Password@123',
  });
  const [isRegisteringDriver, setIsRegisteringDriver] = useState(false);

  // Selected Ride for Live Tracking Inspection Modal
  const [selectedRide, setSelectedRide] = useState<IRideItem | null>(null);

  // Fetch admin dashboard data
  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes, ridesRes, sosRes, paymentsRes, sessionsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/rides'),
        api.get('/admin/sos-alerts'),
        api.get('/admin/payments').catch(() => ({ data: { data: [] } })),
        api.get('/admin/sessions').catch(() => ({ data: { data: [] } })),
      ]);

      if (statsRes.data?.data?.stats) setStats(statsRes.data.data.stats);
      if (usersRes.data?.data?.users) setUsers(usersRes.data.data.users);
      if (ridesRes.data?.data?.rides) setRides(ridesRes.data.data.rides);
      if (sosRes.data?.data?.alerts) setSosAlerts(sosRes.data.data.alerts);
      if (paymentsRes.data?.data) setPayments(paymentsRes.data.data);
      if (sessionsRes.data?.data) setSessions(sessionsRes.data.data);
    } catch {
      // Tolerate temporary connection drop
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.delete(`/admin/sessions/${sessionId}`);
      toast.success('Device session revoked remotely.');
      setSessions((prev) => prev.filter((s) => s._id !== sessionId));
    } catch {
      toast.error('Failed to revoke session.');
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 4000); // 4-second auto refresh
    return () => clearInterval(interval);
  }, []);

  // Update user / driver status (Approve or Suspend)
  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`Account status updated to ${newStatus}`);
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user status.');
    }
  };

  // Register New Campus Driver
  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.firstName || !newDriver.lastName || !newDriver.email) {
      toast.error('Please enter name and institutional email.');
      return;
    }

    setIsRegisteringDriver(true);
    try {
      const res = await api.post('/admin/drivers', newDriver);
      if (res.data?.status === 'success') {
        toast.success(`Driver ${newDriver.firstName} registered and approved successfully!`);
        setIsDriverModalOpen(false);
        setNewDriver({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          vehicleModel: 'Tata Tigor EV (Campus Fleet)',
          plateNumber: 'GJ-06-PU-2026',
          password: 'Password@123',
        });
        fetchAdminData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register driver.');
    } finally {
      setIsRegisteringDriver(false);
    }
  };

  // Resolve SOS Alert
  const handleResolveSos = async (alertId: string) => {
    try {
      await api.patch(`/admin/sos-alerts/${alertId}/resolve`);
      toast.success('SOS Emergency marked as RESOLVED.');
      fetchAdminData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resolve alert.');
    }
  };

  // Filter Drivers
  const driverUsers = users.filter((u) => u.role === 'Driver');

  // Filter Campus Rides
  const filteredRides = rides.filter((r) => {
    if (rideFilter === 'ACTIVE') {
      return ['ASSIGNED', 'ARRIVED_PICKUP', 'ACTIVE'].includes(r.status);
    }
    if (rideFilter === 'REQUESTED') return r.status === 'REQUESTED';
    if (rideFilter === 'COMPLETED') return r.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
              Campus Security & Transit Authority
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Fleet Monitor
            </span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">
            Admin Operations & Fleet Control
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Parul University Waghodia Campus &bull; 24/7 Driver Verification & Mission Tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDriverModalOpen(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white transition flex items-center gap-2 cursor-pointer shadow-md shadow-purple-600/20"
          >
            <FiPlus /> Register New Driver
          </button>
          <button
            onClick={fetchAdminData}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition cursor-pointer"
            title="Refresh Metrics"
          >
            <FiRefreshCw className="text-sm" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl">
            <FiUsers />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Users</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stats?.totalUsers || users.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl">
            <FiTruck />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Campus Drivers</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{driverUsers.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl">
            <FiMap />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Rides</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">{rides.length}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
            <FiDollarSign />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Campus Revenue</span>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              ₹{rides.filter((r) => r.status === 'COMPLETED').reduce((sum, r) => sum + (r.fare || 0), 0)}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl">
            <FiAlertTriangle />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Active SOS</span>
            <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {sosAlerts.filter((s) => s.status === 'ACTIVE').length}
            </h3>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('drivers')}
          className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition ${
            activeTab === 'drivers'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiTruck /> Drivers & Approvals ({driverUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('rides')}
          className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition ${
            activeTab === 'rides'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiMap /> Live Ride Tracker ({rides.length})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiUsers /> Campus Users ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition ${
            activeTab === 'payments'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiCreditCard /> Payments & Revenue ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab('devices')}
          className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition ${
            activeTab === 'devices'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiSmartphone /> Devices & Sessions ({sessions.length})
        </button>

        <button
          onClick={() => setActiveTab('sos')}
          className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition ${
            activeTab === 'sos'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiAlertTriangle /> SOS Emergency Desk ({sosAlerts.filter((s) => s.status === 'ACTIVE').length})
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`pb-3 cursor-pointer flex items-center gap-2 border-b-2 transition ${
            activeTab === 'health'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <FiActivity /> System Health & DB
        </button>
      </div>

      {/* TAB 1: DRIVERS & APPROVALS */}
      {activeTab === 'drivers' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Campus Drivers & Authorization Control
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Approve, onboard, or suspend campus drivers to ensure institutional safety
              </p>
            </div>
            <button
              onClick={() => setIsDriverModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <FiPlus /> Register New Driver
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Driver</th>
                  <th className="p-3.5">Institutional Email</th>
                  <th className="p-3.5">Phone Number</th>
                  <th className="p-3.5">Assigned Vehicle</th>
                  <th className="p-3.5">Authorization Status</th>
                  <th className="p-3.5 rounded-r-xl text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {driverUsers.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center">
                          👨‍✈️
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white block">
                            {d.firstName} {d.lastName}
                          </span>
                          <span className="text-[10px] text-gray-400">Parul Campus Fleet</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-gray-600 dark:text-gray-300">{d.email}</td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-300">{d.phoneNumber || '+91 9876543210'}</td>
                    <td className="p-3.5 text-gray-600 dark:text-gray-300">
                      <strong>Tata Tigor EV</strong> (GJ-06-PU-2026)
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                          d.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        ></span>
                        {d.status === 'Active' ? 'Approved & Active' : 'Suspended / Inactive'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {d.status === 'Active' ? (
                        <button
                          onClick={() => handleUpdateUserStatus(d._id, 'Suspended')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        >
                          Suspend Driver
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateUserStatus(d._id, 'Active')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                        >
                          Approve & Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE RIDE TRACKER */}
      {activeTab === 'rides' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Live Campus Ride Fleet Monitor
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Real-time tracking of student dispatch missions, driver assignments, and trip safety
              </p>
            </div>

            <div className="flex items-center gap-2">
              {(['ALL', 'ACTIVE', 'REQUESTED', 'COMPLETED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setRideFilter(filter)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    rideFilter === filter
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Ride ID</th>
                  <th className="p-3.5">Student Rider</th>
                  <th className="p-3.5">Assigned Driver</th>
                  <th className="p-3.5">Pickup & Dropoff</th>
                  <th className="p-3.5">Subsidized Fare</th>
                  <th className="p-3.5">Start PIN</th>
                  <th className="p-3.5">Trip Status</th>
                  <th className="p-3.5 rounded-r-xl text-right">Live Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredRides.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                    <td className="p-3.5 font-mono font-bold text-purple-600 dark:text-purple-400">
                      {r._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-gray-900 dark:text-white block">{r.riderName}</span>
                      <span className="text-[10px] text-gray-400">{r.riderPhone || 'Student'}</span>
                    </td>
                    <td className="p-3.5">
                      {r.driverName ? (
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white block">
                            👨‍✈️ {r.driverName}
                          </span>
                          <span className="text-[10px] text-gray-400">{r.driverVehicle || 'EV Transit'}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-semibold">
                          Awaiting Driver
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-[200px]">
                      <div className="truncate font-medium text-gray-800 dark:text-gray-200">
                        🟢 {r.pickupLocation.address}
                      </div>
                      <div className="truncate text-gray-500 dark:text-gray-400">
                        📍 {r.dropoffLocation.address}
                      </div>
                    </td>
                    <td className="p-3.5 font-black text-emerald-600 dark:text-emerald-400">₹{r.fare}</td>
                    <td className="p-3.5 font-mono font-black text-amber-600 dark:text-amber-400">{r.otp}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                          r.status === 'REQUESTED'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : r.status === 'ASSIGNED'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : r.status === 'ARRIVED_PICKUP'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : r.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedRide(r)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition cursor-pointer"
                      >
                        Inspect Ride
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPUS USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Campus Users & Accounts
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Institutional @paruluniversity.ac.in verified student and faculty registry
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-3 text-gray-400 text-xs" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3.5 rounded-l-xl">User Name</th>
                  <th className="p-3.5">Institutional Email</th>
                  <th className="p-3.5">System Role</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {users
                  .filter(
                    (u) =>
                      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.lastName.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition">
                      <td className="p-3.5 font-bold text-gray-900 dark:text-white">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="p-3.5 font-mono text-gray-600 dark:text-gray-300">{u.email}</td>
                      <td className="p-3.5 font-semibold text-purple-600 dark:text-purple-400">{u.role}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            u.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() =>
                            handleUpdateUserStatus(u._id, u.status === 'Active' ? 'Suspended' : 'Active')
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:text-purple-600 transition cursor-pointer"
                        >
                          {u.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SOS EMERGENCY DESK */}
      {activeTab === 'sos' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <FiAlertTriangle /> Campus Emergency Dispatch Desk
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              High-priority campus panic triggers monitored by 24/7 Security Office
            </p>
          </div>

          {sosAlerts.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">No emergency alerts recorded.</div>
          ) : (
            <div className="space-y-4">
              {sosAlerts.map((s) => (
                <div
                  key={s._id}
                  className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    s.status === 'ACTIVE'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'ACTIVE'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {s.status} EMERGENCY
                    </span>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                      {s.userName} ({s.userPhone})
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      📍 {s.locationDescription} &bull; Coordinates: [{s.coordinates.join(', ')}]
                    </p>
                    {s.message && <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 italic font-medium">"{s.message}"</p>}
                  </div>

                  {s.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleResolveSos(s._id)}
                      className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <FiCheckCircle /> Resolve Alert
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: HEALTH & DB */}
      {activeTab === 'health' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <FiServer /> System Health & MongoDB Diagnostics
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <span className="font-bold text-gray-500 uppercase tracking-wider block">Database Status</span>
              <div className="flex items-center gap-2">
                <FiDatabase className="text-lg text-emerald-500" />
                <span className="font-bold text-base text-gray-900 dark:text-white">
                  {stats?.dbConnected ? 'MongoDB Atlas Connected' : 'Offline In-Memory Resilient Fallback'}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                {stats?.dbConnected
                  ? 'All campus user records, driver telemetry, and rides persist on MongoDB Atlas.'
                  : 'Running smoothly on high-speed in-memory store. Zero downtime.'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
              <span className="font-bold text-gray-500 uppercase tracking-wider block">Backend Server Uptime</span>
              <div className="flex items-center gap-2">
                <FiActivity className="text-lg text-purple-500" />
                <span className="font-bold text-base text-gray-900 dark:text-white">
                  {stats?.serverUptime || 120} seconds
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                SafeRide Node/Express cluster running on port 5000 (and Render production cloud).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CAMPUS PAYMENTS & REVENUE */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FiCreditCard className="text-purple-600 dark:text-purple-400" /> Campus Payments & Revenue Ledger
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Audit trail of all Razorpay & UPI transactions across the Parul University transit network
              </p>
            </div>
            <button
              onClick={fetchAdminData}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 transition flex items-center gap-1.5"
            >
              <FiRefreshCw className="text-xs" /> Refresh Ledger
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No payment transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-750 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Receipt</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Transaction ID</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-900 dark:text-white">
                        {p.receipt}
                      </td>
                      <td className="py-3.5 px-4">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        {p.method || 'UPI / Razorpay'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px] text-gray-500">
                        {p.razorpayPaymentId || p.razorpayOrderId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          <FiCheckCircle className="text-[10px]" /> {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: DEVICES & SESSIONS AUDIT */}
      {activeTab === 'devices' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FiSmartphone className="text-purple-600 dark:text-purple-400" /> Institutional Device & Session Control
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Monitor logged-in devices across campus and remotely terminate unauthorized sessions
              </p>
            </div>
            <button
              onClick={fetchAdminData}
              className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 transition flex items-center gap-1.5"
            >
              <FiRefreshCw className="text-xs" /> Refresh Sessions
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">No active device sessions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-750 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-4">User Account</th>
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Last Active</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {sessions.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 dark:text-white block">
                          {s.userName || s.userEmail || 'Campus User'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {s.userEmail || s.userId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-purple-600 dark:text-purple-400">
                            {s.deviceName?.toLowerCase().includes('mobile') ? <FiSmartphone /> : <FiServer />}
                          </span>
                          <div>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                              {s.deviceName}
                            </span>
                            <span className="text-[10px] text-gray-400 line-clamp-1 max-w-xs">
                              {s.userAgent}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-300">
                        {s.ipAddress}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {new Date(s.lastActive).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRevokeSession(s._id)}
                          className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer text-xs"
                          title="Terminate session remotely"
                        >
                          <FiTrash2 /> Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: REGISTER NEW CAMPUS DRIVER */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Register Campus Driver
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Onboard a verified Parul University transit driver
                </p>
              </div>
              <button
                onClick={() => setIsDriverModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleRegisterDriver} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDriver.firstName}
                    onChange={(e) => setNewDriver({ ...newDriver, firstName: e.target.value })}
                    placeholder="e.g. Vikram"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDriver.lastName}
                    onChange={(e) => setNewDriver({ ...newDriver, lastName: e.target.value })}
                    placeholder="e.g. Singh"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Institutional Email (@paruluniversity.ac.in)
                </label>
                <input
                  type="email"
                  required
                  value={newDriver.email}
                  onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                  placeholder="driver.vikram@paruluniversity.ac.in"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={newDriver.phoneNumber}
                  onChange={(e) => setNewDriver({ ...newDriver, phoneNumber: e.target.value })}
                  placeholder="+91 9876543212"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Vehicle Model
                  </label>
                  <input
                    type="text"
                    required
                    value={newDriver.vehicleModel}
                    onChange={(e) => setNewDriver({ ...newDriver, vehicleModel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    required
                    value={newDriver.plateNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, plateNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringDriver}
                  className="w-1/2 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-700 text-white transition shadow-md disabled:opacity-50"
                >
                  {isRegisteringDriver ? 'Authorizing...' : 'Authorize Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT INDIVIDUAL RIDE */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-gray-100 dark:border-gray-700 space-y-5 animate-scaleUp">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                  Mission Telemetry &bull; {selectedRide._id.slice(-6).toUpperCase()}
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                  Ride Details & Telemetry
                </h3>
              </div>
              <button
                onClick={() => setSelectedRide(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <FiX />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 space-y-1">
                <span className="font-bold text-gray-500 uppercase text-[10px]">Student Rider</span>
                <div className="font-bold text-sm text-gray-900 dark:text-white">{selectedRide.riderName}</div>
                <div className="text-gray-500">{selectedRide.riderPhone || 'Contact verified'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 space-y-1">
                <span className="font-bold text-gray-500 uppercase text-[10px]">Assigned Driver</span>
                <div className="font-bold text-sm text-gray-900 dark:text-white">
                  {selectedRide.driverName || 'No driver assigned yet'}
                </div>
                {selectedRide.driverVehicle && (
                  <div className="text-gray-500">{selectedRide.driverVehicle}</div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-700/60 space-y-1">
                <span className="font-bold text-gray-500 uppercase text-[10px]">Waypoints</span>
                <div className="text-gray-800 dark:text-gray-200">🟢 <strong>Pickup:</strong> {selectedRide.pickupLocation.address}</div>
                <div className="text-gray-800 dark:text-gray-200">📍 <strong>Dropoff:</strong> {selectedRide.dropoffLocation.address}</div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-center">
                  <span className="text-[10px] text-gray-500 block">Status</span>
                  <strong className="text-purple-600 dark:text-purple-300 font-bold">{selectedRide.status}</strong>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center">
                  <span className="text-[10px] text-gray-500 block">Fare</span>
                  <strong className="text-emerald-600 dark:text-emerald-300 font-bold">₹{selectedRide.fare}</strong>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-center">
                  <span className="text-[10px] text-gray-500 block">Start PIN</span>
                  <strong className="text-amber-600 dark:text-amber-300 font-mono font-bold">{selectedRide.otp}</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedRide(null)}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
