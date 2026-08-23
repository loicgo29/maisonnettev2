import axios, { AxiosInstance } from 'axios';
import { getAuthHeaders } from '../auth/OIDCManager';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api: AxiosInstance = axios.create({
  baseURL: apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth headers to every request
api.interceptors.request.use(async (config) => {
  const headers = await getAuthHeaders();
  const mergedConfig = config as any;
  mergedConfig.headers = {
    ...config.headers,
    ...headers,
  };
  return mergedConfig;
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized, user may need to re-authenticate');
      // Optionally redirect to login, but oidc-client-ts should handle this
    }
    return Promise.reject(error);
  }
);

export default api;
