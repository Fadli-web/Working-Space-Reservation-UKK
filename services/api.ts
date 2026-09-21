import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://learn.smktelkom-mlg.sch.id/coworking',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    // Rute internal Next.js API (seperti member profile dan change-password) harus diarahkan ke server Next.js lokal
    const internalRoutes = [
        '/api/member/profile',
        '/api/member/change-password',
    ];
    if (config.url && internalRoutes.some((route) => config.url?.startsWith(route))) {
        config.baseURL = '';
    }

    const makerKey = process.env.NEXT_PUBLIC_MAKER_KEY?.trim();
    if (makerKey) {
        config.headers['x-maker-key'] = makerKey;
    }

    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
    }

    // Jika data adalah FormData, hapus Content-Type agar browser/axios membuat boundary multipart otomatis
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    return config;
});

export default api;