import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5205',
  timeout: 15_000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Tự động gắn JWT Bearer token vào mỗi request nếu có
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartfarm_access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Interceptor xử lý lỗi chung và hết hạn phiên đăng nhập
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Nếu 401 trên route được bảo vệ thì xóa token đã hết hạn
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('smartfarm_access_token')
        localStorage.removeItem('smartfarm_refresh_token')
        localStorage.removeItem('smartfarm_user')
      }
    }
    return Promise.reject(error)
  },
)
