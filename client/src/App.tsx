import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import ProtectedRoute from './routes/ProtectedRoutes.js';

// Auth feature views
import Login from './features/authentication/Login.js';
import Register from './features/authentication/Register.js';
import VerifyOtp from './features/authentication/VerifyOtp.js';
import ForgotPassword from './features/authentication/ForgotPassword.js';
import ResetPassword from './features/authentication/ResetPassword.js';
import ChangePassword from './features/authentication/ChangePassword.js';
import DeviceManagement from './features/authentication/DeviceManagement.js';
import Unauthorized from './features/authentication/Unauthorized.js';
import Forbidden from './features/authentication/Forbidden.js';
import SessionExpired from './features/authentication/SessionExpired.js';

// Payment views
import PaymentHistory from './features/payment/PaymentHistory.js';

// Map & Transit views
import VadodaraMap from './features/maps/VadodaraMap.js';

// Emergency & AI views
import SOSModal from './features/securityOffice/SOSModal.js';
import AIChatbotModal from './features/chatbot/AIChatbotModal.js';

// Icons
import { FiShield, FiLogOut, FiCreditCard, FiSmartphone, FiKey, FiAlertTriangle } from 'react-icons/fi';

const NavigationBar: React.FC<{ onOpenSOS: () => void }> = ({ onOpenSOS }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-brand-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        {/* Brand Logo & Title */}
        <Link to="/" className="flex items-center gap-2.5 font-black text-xl tracking-tight">
          <div className="w-9 h-9 rounded-xl bg-white text-brand-800 flex items-center justify-center font-bold text-base shadow-sm">
            PU
          </div>
          <span>SafeRide PU</span>
        </Link>

        {/* Center / Right Navigation Links */}
        <nav className="flex items-center gap-3 text-sm font-medium">
          {/* Emergency SOS Button */}
          <button
            onClick={onOpenSOS}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30 transition animate-pulse cursor-pointer border border-red-400"
            title="Emergency SOS Panic Assistance"
          >
            <FiAlertTriangle className="text-sm" /> SOS
          </button>

          <Link
            to="/"
            className="hover:text-brand-200 transition px-2.5 py-1.5 rounded-lg"
          >
            Campus Map
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/payments"
                className="hover:text-brand-200 transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              >
                <FiCreditCard className="text-xs" /> Payments
              </Link>
              <Link
                to="/devices"
                className="hover:text-brand-200 transition flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
              >
                <FiSmartphone className="text-xs" /> Devices
              </Link>

              {/* User Role Badge & Dropdown / Logout */}
              <div className="flex items-center gap-3 pl-3 border-l border-brand-700">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold leading-tight">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-[10px] text-brand-200 uppercase tracking-wider font-semibold">
                    {user?.role}
                  </div>
                </div>

                <Link
                  to="/change-password"
                  title="Change Password"
                  className="p-2 hover:bg-brand-700 rounded-lg transition text-brand-100"
                >
                  <FiKey />
                </Link>

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 hover:bg-red-700/50 hover:text-red-200 rounded-lg transition text-brand-100 cursor-pointer"
                >
                  <FiLogOut />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-bold bg-white text-brand-800 rounded-xl hover:bg-brand-50 transition shadow-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-block px-4 py-2 text-xs font-bold bg-brand-700 hover:bg-brand-650 text-white rounded-xl transition border border-brand-600"
              >
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

// Main Dashboard Landing Page
const DashboardHome: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-2">
            <FiShield /> Institutional Safety Protocol Active
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {user ? `Welcome back, ${user.firstName}!` : 'SafeRide PU Transit Platform'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time GPS ride monitoring between Parul University Waghodia Campus and Vadodara District.
          </p>
        </div>

        <div className="flex gap-2">
          <div className="px-4 py-3 bg-brand-50 dark:bg-gray-750 rounded-2xl text-center border border-brand-100 dark:border-gray-600">
            <span className="block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Parul Campus</span>
            <span className="font-bold text-brand-700 dark:text-brand-300 text-sm">Waghodia Zone</span>
          </div>
          <div className="px-4 py-3 bg-emerald-50 dark:bg-gray-750 rounded-2xl text-center border border-emerald-100 dark:border-gray-600">
            <span className="block text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Security Desk</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">24/7 Active</span>
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Vadodara Map Component */}
      <VadodaraMap />
    </div>
  );
};

function App() {
  const [isSOSOpen, setIsSOSOpen] = useState(false);

  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col justify-between bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-50 transition-colors relative">
          <NavigationBar onOpenSOS={() => setIsSOSOpen(true)} />

          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<DashboardHome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Authenticated Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/payments" element={<PaymentHistory />} />
                <Route path="/devices" element={<DeviceManagement />} />
                <Route path="/change-password" element={<ChangePassword />} />
              </Route>

              {/* Error & Session Handling Pages */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/forbidden" element={<Forbidden />} />
              <Route path="/session-expired" element={<SessionExpired />} />
              <Route path="*" element={<DashboardHome />} />
            </Routes>
          </main>

          {/* Floating Emergency SOS Button (Bottom-Left) */}
          <button
            onClick={() => setIsSOSOpen(true)}
            className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl shadow-red-600/40 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold text-xs border border-white/20 animate-pulse"
            title="Emergency SOS Panic Button"
          >
            <FiAlertTriangle className="text-lg" />
            <span className="hidden sm:inline">Emergency SOS</span>
          </button>

          {/* 24/7 AI Campus Transit Chatbot (Bottom-Right) */}
          <AIChatbotModal />

          {/* Emergency SOS Modal */}
          <SOSModal isOpen={isSOSOpen} onClose={() => setIsSOSOpen(false)} />

          <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 text-center text-xs text-gray-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
              <p>&copy; {new Date().getFullYear()} SafeRide PU &bull; Parul University, Vadodara, Gujarat</p>
              <div className="flex gap-4">
                <span>Free OpenStreetMap & OSRM Engine</span>
                <span>&bull;</span>
                <span>Razorpay Secured Gateway</span>
              </div>
            </div>
          </footer>
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}

export default App;
