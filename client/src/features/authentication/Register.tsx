import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { ROLES, UserRole } from '../../types/shared.js';
import {
  FiUser,
  FiMail,
  FiLock,
  FiPhone,
  FiAlertCircle,
  FiCheckCircle,
  FiTruck,
  FiCheck,
  FiX,
} from 'react-icons/fi';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    phoneNumber: string;
    vehicleModel: string;
    plateNumber: string;
    licenseNumber: string;
    password: string;
    confirmPassword: string;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    role: ROLES.RIDER,
    phoneNumber: '',
    vehicleModel: '',
    plateNumber: '',
    licenseNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  const { registerUser } = useAuth();
  const navigate = useNavigate();

  const passwordCriteria = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error as user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const newFieldErrors: Record<string, string> = {};

    if (!formData.email.trim().toLowerCase().endsWith('@paruluniversity.ac.in')) {
      newFieldErrors.email = 'Only Parul University emails (@paruluniversity.ac.in) are permitted.';
    }

    if (formData.firstName.trim().length < 2) {
      newFieldErrors.firstName = 'First name must be at least 2 characters long.';
    }

    if (formData.lastName.trim().length < 2) {
      newFieldErrors.lastName = 'Last name must be at least 2 characters long.';
    }

    if (!isPasswordValid) {
      newFieldErrors.password =
        'Password must have at least 8 characters, 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.';
    }

    if (formData.password !== formData.confirmPassword) {
      newFieldErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError(Object.values(newFieldErrors).join('. '));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        password: formData.password,
      };

      if (formData.role === ROLES.DRIVER) {
        if (formData.vehicleModel.trim()) payload.vehicleModel = formData.vehicleModel.trim();
        if (formData.plateNumber.trim()) payload.plateNumber = formData.plateNumber.trim();
        if (formData.licenseNumber.trim()) payload.licenseNumber = formData.licenseNumber.trim();
      }

      const res = await registerUser(payload);

      // Redirect to OTP verification screen with email prefilled and devOtp if available
      const devOtp = res?.data?.devOtp;
      const devOtpParam = devOtp ? `&devOtp=${encodeURIComponent(devOtp)}` : '';
      navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}&purpose=Register${devOtpParam}`);
    } catch (err: any) {
      const errData = err.response?.data;
      const errorsList = errData?.errors;
      const serverFieldErrors: Record<string, string> = {};

      if (Array.isArray(errorsList) && errorsList.length > 0) {
        errorsList.forEach((e: any) => {
          if (e.field) {
            serverFieldErrors[e.field] = e.message;
          }
        });
        setFieldErrors(serverFieldErrors);
        setError(errorsList.map((e: any) => `${e.field ? `${e.field}: ` : ''}${e.message}`).join('. '));
      } else {
        setError(errData?.message || 'Registration failed. Please check form details and try again.');
      }
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
          Exclusive transport for Parul University students, drivers & staff
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">
          {error && (
            <div className="mb-5 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3 animate-fadeIn">
              <FiAlertCircle className="text-red-500 text-lg mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700 dark:text-red-300">
                <strong className="block font-semibold">Please fix the following validation issues:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="mb-5 bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <FiCheckCircle className="flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Registration requires a verified <strong>@paruluniversity.ac.in</strong> institutional email.</span>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  First Name <span className="text-red-500">*</span>
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
                    className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 text-sm ${
                      fieldErrors.firstName
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {fieldErrors.firstName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Last Name <span className="text-red-500">*</span>
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
                    className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 text-sm ${
                      fieldErrors.lastName
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {fieldErrors.lastName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                Institutional Email <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <FiMail />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@paruluniversity.ac.in"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 text-sm ${
                    fieldErrors.email
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-brand-500'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Role <span className="text-red-500">*</span>
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
                {fieldErrors.role && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.role}</p>
                )}
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
                {fieldErrors.phoneNumber && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.phoneNumber}</p>
                )}
              </div>
            </div>

            {/* DRIVER-SPECIFIC FLEET & VEHICLE DETAILS (Rendered only when Role is Driver) */}
            {formData.role === ROLES.DRIVER && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
                  <FiTruck /> Campus Transit Driver Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Vehicle Model (Optional)
                    </label>
                    <input
                      type="text"
                      name="vehicleModel"
                      placeholder="Tata Tigor EV / Auto Rickshaw"
                      value={formData.vehicleModel}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      License Plate (Optional)
                    </label>
                    <input
                      type="text"
                      name="plateNumber"
                      placeholder="GJ-06-PU-2026"
                      value={formData.plateNumber}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiLock />
                  </div>
                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Min 8 characters"
                    value={formData.password}
                    onFocus={() => setShowPasswordHints(true)}
                    onChange={handleChange}
                    className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 text-sm ${
                      fieldErrors.password
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                  Confirm Password <span className="text-red-500">*</span>
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
                    className={`block w-full pl-9 pr-3 py-2 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 text-sm ${
                      fieldErrors.confirmPassword
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-brand-500'
                    }`}
                  />
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Password Security Requirements Helper Checklist */}
            {(showPasswordHints || formData.password.length > 0) && (
              <div className="p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700 text-[11px] space-y-1 animate-fadeIn">
                <span className="font-semibold block text-gray-700 dark:text-gray-300 mb-1">
                  Password must satisfy:
                </span>
                <div className="grid grid-cols-2 gap-1 text-gray-600 dark:text-gray-400">
                  <div className={`flex items-center gap-1 ${passwordCriteria.length ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                    {passwordCriteria.length ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.upper ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                    {passwordCriteria.upper ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
                    <span>1 uppercase letter (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.lower ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                    {passwordCriteria.lower ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
                    <span>1 lowercase letter (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.number ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                    {passwordCriteria.number ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
                    <span>1 number (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1 col-span-2 ${passwordCriteria.special ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                    {passwordCriteria.special ? <FiCheck className="text-xs" /> : <FiX className="text-xs" />}
                    <span>1 special symbol (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            )}

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
