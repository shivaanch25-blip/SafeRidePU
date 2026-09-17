import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';

const api = axios.create({
  baseURL: `${apiBase}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('saferide_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints that are public / guest routes where 401 should NOT trigger refresh or session-expired toast
const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
  '/auth/dev-otp',
];

// Axios response interceptor for automatic Refresh Token Rotation (RTR) on HTTP 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    // Check if the URL is a public auth endpoint
    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

    // If it's a 401 on a public auth endpoint, reject immediately without refresh loop or session expired event
    if (isPublicAuth) {
      return Promise.reject(error);
    }

    // Only attempt refresh if we previously had a token and are not already retrying
    const existingToken = localStorage.getItem('saferide_token');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      existingToken
    ) {
      originalRequest._retry = true;

      try {
        // Call refresh rotation endpoint
        const refreshRes = await axios.post(
          `${apiBase}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshRes.data?.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem('saferide_token', newAccessToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
        }

        // Resend the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Clear stored token
        localStorage.removeItem('saferide_token');
        localStorage.removeItem('saferide_user');

        // Dispatch session expiry event to trigger AuthContext logout cleanup
        window.dispatchEvent(new CustomEvent('saferide-session-expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
