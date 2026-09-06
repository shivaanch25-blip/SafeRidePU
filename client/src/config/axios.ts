import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios response interceptor for automatic Refresh Token Rotation (RTR) on HTTP 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is unauthorized and not already retrying
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== '/auth/refresh'
    ) {
      originalRequest._retry = true;

      try {
        // Call refresh rotation endpoint
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });

        // Resend the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Dispatch session expiry event to trigger AuthContext logout cleanup
        window.dispatchEvent(new CustomEvent('saferide-session-expired'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
