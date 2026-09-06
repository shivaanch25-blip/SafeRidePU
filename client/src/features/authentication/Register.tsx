import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { ROLES } from '../../types/shared.js';
import { FiUser, FiMail, FiLock, FiPhone, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: ROLES.RIDER,
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email.toLowerCase().endsWith('@paruluniversity.ac.in')) {
      setError('Only Parul University emails (@paruluniversity.ac.in) are permitted.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters with numbers and special symbols.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
      });

      // Redirect to OTP verification screen with email prefilled and devOtp if available
      const devOtp = res?.data?.devOtp;
      const devOtpParam = devOtp ? `&devOtp=${encodeURIComponent(devOtp)}` : '';
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}&purpose=Register${devOtpParam}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-10 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg text-2xl font-bold">
            PU
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Join SafeRide PU
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Exclusive transport for Parul University students & staff
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">
          {error && (
            <div className="mb-5 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
              <FiAlertCircle className="text-red-500 text-lg mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="mb-5 bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <FiCheckCircle className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Registration requires a verified <strong>@paruluniversity.ac.in</strong> email address.</span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  First Name
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiUser />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    required
                    placeholder="Aarav"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Last Name
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiUser />
                  </div>
                  <input
                    type="text"
                    name="lastName"
                    required
                    placeholder="Patel"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Institutional Email
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiMail />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="210303105001@paruluniversity.ac.in"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                >
                  <option value={ROLES.RIDER}>Student / Staff (Rider)</option>
                  <option value={ROLES.DRIVER}>Driver</option>
                  <option value={ROLES.SECURITY_OFFICE}>Security Office</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Phone Number
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiPhone />
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    placeholder="+91 9876543210"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Password
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiLock />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Min 8 chars"
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Confirm Password
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiLock />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Create Account & Send OTP'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <span className="text-xs text-gray-500">Already registered? </span>
            <Link
              to="/login"
              className="font-semibold text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              Sign In here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
