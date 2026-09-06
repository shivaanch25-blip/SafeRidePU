import React, { useState } from 'react';
import api from '../../config/axios.js';
import toast from 'react-hot-toast';
import { FiLock, FiAlertCircle } from 'react-icons/fi';

export const ChangePassword: React.FC = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters with numbers and special symbols.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/change-password', { oldPassword, newPassword });
      toast.success(res.data?.message || 'Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Change Password</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Update your SafeRide PU password. Previous 3 passwords cannot be reused.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-3 rounded-r-lg flex items-center gap-3 text-sm text-red-700 dark:text-red-300">
          <FiAlertCircle className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
            Current Password
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FiLock />
            </div>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
            New Password
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FiLock />
            </div>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400 mb-1">
            Confirm New Password
          </label>
          <div className="relative rounded-xl shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <FiLock />
            </div>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? 'Updating...' : 'Save New Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;
