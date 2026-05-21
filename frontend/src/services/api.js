import axios from 'axios';

// Em dev usa o servidor local; em prod usa caminho relativo (Traefik roteia /api → backend)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

// Add a request interceptor to add the JWT token to the header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
