import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../config/axios.js';
import { IUserShared } from '@saferide/shared';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: IUserShared | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerUser: (data: any) => Promise<any>;
  verifyOtp: (email: string, otp: string, purpose: 'Register' | 'Reset' | 'Verify') => Promise<any>;
  resendOtp: (email: string, purpose: 'Register' | 'Reset' | 'Verify') => Promise<any>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<IUserShared | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.status === 'success') {
        setUser(response.data.data.user);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();

    const handleSessionExpired = () => {
      setUser(null);
      toast.error('Your session has expired. Please log in again.');
    };

    window.addEventListener('saferide-session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('saferide-session-expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data?.status === 'success') {
        setUser(response.data.data.user);
        toast.success('Logged in successfully!');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Login failed';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', data);
      if (response.data?.status === 'success') {
        const devOtp = response.data.data?.devOtp;
        if (devOtp) {
          toast.success(`[DEV MODE] OTP: ${devOtp}`, { duration: 10000, icon: '🔑' });
        } else {
          toast.success('Registration initiated. Verification OTP has been sent to your email.');
        }
        return response.data;
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Registration failed';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (email: string, otp: string, purpose: 'Register' | 'Reset' | 'Verify') => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', { email, otp, purpose });
      if (response.data?.status === 'success') {
        toast.success(response.data.message || 'OTP verified successfully.');
        return response.data.data;
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Verification failed';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async (email: string, purpose: 'Register' | 'Reset' | 'Verify') => {
    try {
      const response = await api.post('/auth/resend-otp', { email, purpose });
      if (response.data?.status === 'success') {
        const devOtp = response.data.data?.devOtp;
        if (devOtp) {
          toast.success(`[DEV MODE] New OTP: ${devOtp}`, { duration: 10000, icon: '🔑' });
        } else {
          toast.success('OTP resent successfully.');
        }
        return response.data;
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to resend OTP';
      toast.error(msg);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Silent catch
    } finally {
      setUser(null);
      toast.success('Logged out successfully.');
    }
  };

  const logoutAll = async () => {
    setIsLoading(true);
    try {
      await api.post('/auth/logout-all');
      setUser(null);
      toast.success('Logged out from all devices successfully.');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to log out from all devices';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      const devOtp = response.data?.data?.devOtp;
      if (devOtp) {
        toast.success(`[DEV MODE] Reset OTP: ${devOtp}`, { duration: 10000, icon: '🔑' });
      } else {
        toast.success('Verification OTP has been sent if the email exists.');
      }
      return response.data;
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Request failed';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (data: any) => {
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', data);
      toast.success('Password reset successfully. You can now log in.');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Password reset failed';
      toast.error(msg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        registerUser,
        verifyOtp,
        resendOtp,
        logout,
        logoutAll,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
