import React, { useEffect, useState } from 'react';
import api from '../../config/axios.js';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext.js';
import { FiSmartphone, FiMonitor, FiTrash2, FiShield } from 'react-icons/fi';

interface IDevice {
  _id: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  lastActive: string;
  isTrusted: boolean;
}

export const DeviceManagement: React.FC = () => {
  const [sessions, setSessions] = useState<IDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { logoutAll } = useAuth();

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/auth/sessions');
      if (res.data?.status === 'success') {
        setSessions(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load active sessions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      toast.success('Session revoked.');
      setSessions(sessions.filter((s) => s._id !== sessionId));
    } catch (err: any) {
      toast.error('Could not revoke session.');
    }
  };

  const handleLogoutAll = async () => {
    if (window.confirm('Are you sure you want to log out from all devices?')) {
      await logoutAll();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiShield className="text-brand-600 dark:text-brand-400" /> Active Device Sessions
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Devices that currently have access to your SafeRide PU account.
          </p>
        </div>
        <button
          onClick={handleLogoutAll}
          className="px-3.5 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold hover:bg-red-100 transition cursor-pointer border border-red-200 dark:border-red-900"
        >
          Logout All Devices
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading devices...</div>
      ) : sessions.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">No active device sessions found.</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white dark:bg-gray-700 rounded-xl text-brand-600 dark:text-brand-400 shadow-sm text-lg">
                  {session.deviceName.toLowerCase().includes('mobile') ? (
                    <FiSmartphone />
                  ) : (
                    <FiMonitor />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {session.deviceName}
                  </h4>
                  <p className="text-xs text-gray-500">
                    IP: {session.ipAddress} &bull; Last active: {new Date(session.lastActive).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRevoke(session._id)}
                title="Revoke session"
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
