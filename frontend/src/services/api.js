import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor – attach JWT token from localStorage
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('agribill_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor – handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('agribill_token');
            localStorage.removeItem('agribill_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getSalesChart: () => api.get('/dashboard/sales-chart'),
    getMonthlyRevenue: () => api.get('/dashboard/monthly-revenue'),
};

// ─── Farmers ─────────────────────────────────────────────────────────────────
export const farmersAPI = {
    getAll: (params) => api.get('/farmers', { params }),
    getById: (id) => api.get(`/farmers/${id}`),
    create: (data) => api.post('/farmers', data),
    update: (id, data) => api.put(`/farmers/${id}`, data),
    delete: (id) => api.delete(`/farmers/${id}`),
    getTransactions: (id) => api.get(`/farmers/${id}/transactions`),
};

// ─── Products ────────────────────────────────────────────────────────────────
export const productsAPI = {
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    getLowStock: () => api.get('/products/low-stock'),
};

// ─── Bills ───────────────────────────────────────────────────────────────────
export const billsAPI = {
    getAll: (params) => api.get('/bills', { params }),
    getById: (id) => api.get(`/bills/${id}`),
    create: (data) => api.post('/bills', data),
    downloadPDF: (id) => api.get(`/bills/${id}/pdf`, { responseType: 'blob' }),
    sendWhatsApp: (id) => api.post(`/bills/${id}/whatsapp`),
};

// ─── Payments ────────────────────────────────────────────────────────────────
export const paymentsAPI = {
    getAll: (params) => api.get('/payments', { params }),
    create: (data) => api.post('/payments', data),
    getByFarmer: (farmerId) => api.get(`/payments/farmer/${farmerId}`),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsAPI = {
    getMonthlySales: (params) => api.get('/reports/monthly-sales', { params }),
    getTopProducts: (params) => api.get('/reports/top-products', { params }),
    getCreditReport: (params) => api.get('/reports/credit', { params }),
    exportCSV: (type, params) => api.get(`/reports/export/${type}`, { params, responseType: 'blob' }),
};

export default api;
