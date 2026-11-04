import axios from 'axios'

// No endpoints are assumed until backend contracts are implemented.
// Axios rejects non-2xx responses; callers handle their own loading/error UI.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5205',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})
