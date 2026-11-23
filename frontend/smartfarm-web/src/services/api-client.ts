import axios from 'axios';
import type { AuthResponseDto } from '../types/auth';

export const ACCESS_TOKEN_KEY = 'smartfarm_access_token';
export const REFRESH_TOKEN_KEY = 'smartfarm_refresh_token';
export const USER_INFO_KEY = 'smartfarm_user';

// Remove auth values written by earlier versions. User preferences remain untouched.
if (typeof window !== 'undefined') {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5205',
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 & token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints to avoid infinite loops
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/Auth/login') &&
      !originalRequest.url?.includes('/api/Auth/register') &&
      !originalRequest.url?.includes('/api/Auth/refresh-token')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post<AuthResponseDto>(
          `${apiClient.defaults.baseURL}/api/Auth/refresh-token`,
          { refreshToken }
        );

        sessionStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        sessionStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        if (data.user) {
          sessionStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
        }

        apiClient.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(USER_INFO_KEY);
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
