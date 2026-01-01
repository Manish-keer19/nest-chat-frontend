import axios from 'axios';

const api = axios.create({
    // baseURL: import.meta.env.VITE_API_URL,
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add request interceptor to attach bearer token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('401 Unauthorized Error:', error.response?.data);
            console.log('Current path:', window.location.pathname);
            console.log('Token exists:', !!localStorage.getItem('token'));

            // Only redirect to login if not already on login/register pages
            const currentPath = window.location.pathname;
            if (currentPath !== '/login' && currentPath !== '/register') {
                console.log('Redirecting to login...');
                // Token expired or invalid, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
