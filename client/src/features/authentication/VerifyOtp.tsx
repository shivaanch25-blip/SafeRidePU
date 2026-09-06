import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import api from '../../config/axios.js';
import { FiKey, FiAlertCircle, FiRefreshCw, FiZap } from 'react-icons/fi';

export const VerifyOtp: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const purposeParam = (searchParams.get('purpose') as 'Register' | 'Reset' | 'Verify') || 'Register';
  const devOtpParam = searchParams.get('devOtp') || '';

  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState(emailParam);
  const [devOtp, setDevOtp] = useState<string | null>(devOtpParam || null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();

  // Try to automatically retrieve active development OTP if not provided in URL
  useEffect(() => {
    if (!devOtp && email) {
      api
        .get('/auth/dev-otp', { params: { email, purpose: purposeParam } })
        .then((res) => {
          if (res.data?.data?.otp) {
            setDevOtp(res.data.data.otp);
          }
        })
        .catch(() => {
          // Dev route only; fail silently in production
        });
    }
  }, [email, purposeParam, devOtp]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    setCanResend(true);
    return undefined;
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await verifyOtp(email, otp, purposeParam);
      if (purposeParam === 'Register') {
        navigate('/login');
      } else if (purposeParam === 'Reset' && data?.resetToken) {
        navigate(`/reset-password?token=${data.resetToken}`);
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      const res = await resendOtp(email, purposeParam);
      if (res?.data?.devOtp) {
        setDevOtp(res.data.devOtp);
      }
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-lg text-2xl font-bold">
            <FiKey />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Verify OTP Code
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Enter the 6-digit security code sent to <br />
          <strong className="text-gray-900 dark:text-white">{email || 'your email'}</strong>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">
          {devOtp && (
            <div className="mb-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 p-4 rounded-xl shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    <FiZap className="text-amber-600 dark:text-amber-400" />
                    <span>Dev Mode: Active OTP Code</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Outbound SMTP is not configured. Use this generated security code:
                  </p>
                  <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-brand-600 dark:text-brand-400 bg-white dark:bg-gray-900/80 px-3 py-1 rounded-lg inline-block border border-amber-200 dark:border-amber-800/60">
                    {devOtp}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="mt-1 px-3.5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  Auto-Fill
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3">
              <FiAlertCircle className="text-red-500 text-lg mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!emailParam && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Institutional Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-center text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="block w-full text-center tracking-widest text-3xl font-mono py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || otp.length !== 6}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Verify & Proceed'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {canResend ? (
              <button
                onClick={handleResend}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
              >
                <FiRefreshCw className="text-xs" /> Resend Code
              </button>
            ) : (
              <span>Resend code in {countdown} seconds</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
