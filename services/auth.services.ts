import api from './api';
import { ApiResponse, AuthResponseData, UserProfile } from '@/types/auth';

export const authService = {
    // Login untuk Member & Admin Space
    async login(payload: { username: string; password: string }): Promise<AuthResponseData> {
        const res = await api.post<ApiResponse<AuthResponseData>>('/api/auth/login', payload);
        return res.data.data;
    },

    // Register Member
    async registerMember(payload: {
        username: string;
        password: string;
        nama_member: string;
        instansi: string;
        alamat: string;
        telp: string;
        foto?: string;
    }): Promise<AuthResponseData> {
        const res = await api.post<ApiResponse<AuthResponseData>>('/api/auth/register/member', payload);
        return res.data.data;
    },

    // Register Admin Space
    async registerAdmin(payload: {
        username: string;
        password: string;
        nama_coworking: string;
        nama_pemilik: string;
        telp: string;
    }): Promise<AuthResponseData> {
        const res = await api.post<ApiResponse<AuthResponseData>>('/api/auth/register/admin-space', payload);
        return res.data.data;
    },

    // Ambil Profil User yang Sedang Login
    async getProfile(): Promise<UserProfile> {
        const res = await api.get<ApiResponse<UserProfile>>('/api/auth/profile');
        return res.data.data;
    },

    // Upload Foto Profil Member (Endpoint no. 50: POST /api/upload/members)
    async uploadMemberPhoto(file: File): Promise<{ filename: string; url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post<ApiResponse<{ filename: string; url: string }>>('/api/upload/members', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return res.data.data;
    },

    // Simpan Perubahan Profil Member Secara Permanen (Database & Server Store)
    async updateMemberProfile(payload: {
        nama_member: string;
        instansi: string;
        telp: string;
        alamat: string;
        foto?: string;
    }): Promise<any> {
        const res = await api.post('/api/member/profile', payload);
        return res.data;
    },

    // Ambil Data Profil & Foto Member yang Tersimpan Permanen di Server
    async getServerProfile(username: string): Promise<any> {
        try {
            const res = await api.get(`/api/member/profile?username=${encodeURIComponent(username)}`);
            return res.data?.data || null;
        } catch {
            return null;
        }
    },
};

// Helper terpadu resolusi URL foto profil & avatar
export const getPhotoUrl = (fotoName?: string | null): string | null => {
    if (!fotoName || fotoName === 'undefined' || fotoName === 'null') return null;

    if (fotoName.startsWith('data:') || fotoName.startsWith('blob:')) {
        return fotoName;
    }

    const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://learn.smktelkom-mlg.sch.id/coworking').replace(/\/$/, '');

    if (fotoName.startsWith('http://') || fotoName.startsWith('https://')) {
        let clean = fotoName.replace(/^http:\/\//i, 'https://');
        if (clean.includes('localhost:3000')) {
            clean = clean.replace(/https?:\/\/localhost:3000/, apiBase);
        }
        if (clean.includes('learn.smktelkom-mlg.sch.id/uploads/')) {
            clean = clean.replace('learn.smktelkom-mlg.sch.id/uploads/', 'learn.smktelkom-mlg.sch.id/coworking/uploads/');
        }
        return clean;
    }

    const trimmed = fotoName.replace(/^\//, '');
    if (trimmed.startsWith('uploads/')) {
        return `${apiBase}/${trimmed}`;
    }

    return `${apiBase}/uploads/members/${trimmed}`;
};