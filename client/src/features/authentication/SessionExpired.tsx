import React from 'react';
import { Link } from 'react-router-dom';
import { FiClock } from 'react-icons/fi';

export const SessionExpired: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 text-center">
      <div className="w-16 h-16 bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
        <FiClock />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Session Expired</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md">
        For your safety, your session has timed out or another device requested a security rotation. Please sign in again.
      </p>
      <div className="mt-6">
        <Link
          to="/login"
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition"
        >
          Sign In Again
        </Link>
      </div>
    </div>
  );
};

export default SessionExpired;
