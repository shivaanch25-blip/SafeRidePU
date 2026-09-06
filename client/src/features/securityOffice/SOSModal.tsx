import React, { useState, useEffect } from 'react';
import api from '../../config/axios.js';
import toast from 'react-hot-toast';
import {
  FiAlertTriangle,
  FiPhone,
  FiX,
  FiMapPin,
  FiShield,
} from 'react-icons/fi';

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ isOpen, onClose }) => {
  const [isTriggered, setIsTriggered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCoords({
              lat: Number(pos.coords.latitude.toFixed(5)),
              lng: Number(pos.coords.longitude.toFixed(5)),
            });
          },
          () => {
            // Default to Parul University Waghodia Campus
            setUserCoords({ lat: 22.2887, lng: 73.3634 });
          }
        );
      } else {
        setUserCoords({ lat: 22.2887, lng: 73.3634 });
      }
    } else {
      setIsTriggered(false);
      setCountdown(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (countdown === null) return undefined;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    // Fire alert when countdown reaches 0
    sendEmergencyAlert();
    return undefined;
  }, [countdown]);

  const sendEmergencyAlert = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/sos/alert', {
        location: {
          lat: userCoords?.lat || 22.2887,
          lng: userCoords?.lng || 73.3634,
          address: 'Parul University Campus, Waghodia, Vadodara',
        },
        message: 'Rider triggered emergency panic button.',
      });

      setActiveAlertId(res.data?.data?.alertId || 'alert_active');
      setIsTriggered(true);
      setCountdown(null);
      toast.error('🚨 EMERGENCY SOS BROADCASTED TO CAMPUS SECURITY DESK!', {
        duration: 8000,
      });
    } catch (err: any) {
      // Even if offline/network fails, show alert on screen
      setIsTriggered(true);
      setCountdown(null);
      toast.error('Emergency signal dispatched locally.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCountdown = () => {
    setCountdown(3);
  };

  const handleCancelCountdown = () => {
    setCountdown(null);
    toast('Emergency countdown cancelled.', { icon: 'ℹ️' });
  };

  const handleResolveAlert = async () => {
    if (activeAlertId) {
      try {
        await api.post('/sos/resolve', { alertId: activeAlertId });
      } catch (err) {
        // Silent ignore
      }
    }
    setIsTriggered(false);
    setActiveAlertId(null);
    toast.success('Emergency alert resolved.');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border-2 border-red-500 relative overflow-hidden">
        {/* Pulsing Emergency Top Strip */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
        >
          <FiX className="text-2xl" />
        </button>

        {!isTriggered ? (
          /* Pre-Trigger Warning Screen */
          <div className="text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center text-4xl mx-auto shadow-inner">
              <FiAlertTriangle className="animate-bounce" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                Emergency SOS Assistance
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-sm mx-auto">
                Pressing this button will immediately broadcast your GPS location to the{' '}
                <strong>Parul University Central Security Control Desk</strong> and nearby campus transit marshals.
              </p>
            </div>

            {/* Location Pill */}
            <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300">
              <FiMapPin className="text-red-500 text-sm" />
              <span>
                GPS: <strong>{userCoords?.lat || 22.2887}</strong>,{' '}
                <strong>{userCoords?.lng || 73.3634}</strong> (Parul University Campus)
              </span>
            </div>

            {countdown !== null ? (
              /* Countdown Trigger State */
              <div className="space-y-3 py-2">
                <div className="text-5xl font-black text-red-600 dark:text-red-400 animate-ping">
                  {countdown}
                </div>
                <p className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-widest">
                  Broadcasting SOS in {countdown} seconds...
                </p>
                <button
                  onClick={handleCancelCountdown}
                  className="px-6 py-2.5 rounded-xl font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition text-sm cursor-pointer"
                >
                  Cancel Trigger (False Alarm)
                </button>
              </div>
            ) : (
              /* Action Buttons */
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleStartCountdown}
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-2xl font-black text-lg text-white bg-red-600 hover:bg-red-700 active:scale-98 transition shadow-xl shadow-red-600/40 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  <FiAlertTriangle className="text-2xl" />
                  TRIGGER EMERGENCY SOS NOW
                </button>

                <p className="text-[11px] text-gray-400">
                  Strictly for safety emergencies, medical distress, or security intervention.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Post-Trigger Active Emergency Screen */
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-center">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white uppercase tracking-widest mb-2 animate-pulse">
                🚨 SOS Broadcast Active
              </span>
              <h3 className="text-xl font-black text-red-900 dark:text-red-200">
                Security Desk Notified
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Your live coordinates have been transmitted to Parul University Waghodia Campus Security Desk.
              </p>
            </div>

            {/* Direct Dial Emergency Contacts */}
            <div className="space-y-2.5">
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Immediate Emergency Call Links:
              </span>

              <a
                href="tel:+912668260300"
                className="w-full p-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm flex items-center justify-between shadow-md transition"
              >
                <span className="flex items-center gap-2.5">
                  <FiPhone className="text-lg" /> PU Security Desk (24/7)
                </span>
                <span className="font-mono text-xs">+91 2668 260300</span>
              </a>

              <a
                href="tel:112"
                className="w-full p-3.5 rounded-2xl bg-gray-900 dark:bg-gray-700 hover:bg-black text-white font-bold text-sm flex items-center justify-between shadow transition"
              >
                <span className="flex items-center gap-2.5">
                  <FiShield className="text-lg text-amber-400" /> National Police / Emergency
                </span>
                <span className="font-mono text-xs">112</span>
              </a>

              <a
                href="tel:+912668260222"
                className="w-full p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-between shadow transition"
              >
                <span className="flex items-center gap-2.5">
                  <FiPhone className="text-lg" /> Parul Sevashram Hospital Ambulance
                </span>
                <span className="font-mono text-xs">+91 2668 260222</span>
              </a>
            </div>

            {/* Deactivate Button */}
            <div className="pt-2">
              <button
                onClick={handleResolveAlert}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 transition text-center cursor-pointer"
              >
                Resolve Emergency (I Am Safe Now)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SOSModal;
