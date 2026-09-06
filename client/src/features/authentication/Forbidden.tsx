import React from 'react';
import { Link } from 'react-router-dom';
import { FiShieldOff } from 'react-icons/fi';

export const Forbidden: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
        <FiShieldOff />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Access Denied (403)</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md">
        Your university account role does not have authorization to view this administrative or security section.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default Forbidden;
