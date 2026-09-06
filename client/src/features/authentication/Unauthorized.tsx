import React from 'react';
import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';

export const Unauthorized: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 text-center">
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center text-3xl mb-4">
        <FiLock />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Authentication Required</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-md">
        You must be signed in with your verified Parul University credentials to view this page.
      </p>
      <div className="mt-6 flex gap-4">
        <Link
          to="/login"
          className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition"
        >
          Sign In Now
        </Link>
        <Link
          to="/"
          className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-white rounded-xl font-semibold text-sm transition"
        >
          Home
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
