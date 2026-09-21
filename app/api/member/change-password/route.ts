import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://learn.smktelkom-mlg.sch.id/coworking').replace(/\/$/, '');
const MAKER_KEY = process.env.NEXT_PUBLIC_MAKER_KEY || 'mk_bcfeead51c4a4395a643b3ed506ba933';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { status: false, message: 'Autentikasi sesi member diperlukan.' },
                { status: 401 }
            );
        }

        const memberToken = authHeader.replace('Bearer ', '').trim();
        const body = await req.json();
        const { currentPassword, newPassword } = body;

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json(
                { status: false, message: 'Kata sandi baru minimal 6 karakter!' },
                { status: 400 }
            );
        }

        // 1. Verifikasi profil member yang sedang login
        const profileRes = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
            headers: {
                'x-maker-key': MAKER_KEY,
                'Authorization': `Bearer ${memberToken}`,
            },
        });

        const memberData = profileRes.data?.data;
        if (!memberData || memberData.role !== 'member') {
            return NextResponse.json(
                { status: false, message: 'Akun ini bukan akun member yang valid.' },
                { status: 403 }
            );
        }

        const username = memberData.username;
        const memberDetail = memberData.member;
        const memberId = memberDetail?.id || memberData.id;

        // 2. Verifikasi kata sandi lama/saat ini jika dikirimkan
        if (currentPassword) {
            try {
                await axios.post(
                    `${API_BASE_URL}/api/auth/login`,
                    { username, password: currentPassword },
                    { headers: { 'x-maker-key': MAKER_KEY } }
                );
            } catch (loginErr: any) {
                return NextResponse.json(
                    { status: false, message: 'Kata sandi saat ini tidak cocok atau salah.' },
                    { status: 400 }
                );
            }
        }

        // 3. Autentikasi Admin untuk memperbarui password member di backend (Endpoint 30)
        let adminToken = '';
        try {
            const adminLoginRes = await axios.post(
                `${API_BASE_URL}/api/auth/login`,
                { username: 'admin_faddli', password: 'Admin123!' },
                { headers: { 'x-maker-key': MAKER_KEY } }
            );
            adminToken = adminLoginRes.data?.data?.access_token;
        } catch {
            return NextResponse.json(
                { status: false, message: 'Gagal menghubungkan otoritas pengelola untuk memperbarui sandi.' },
                { status: 500 }
            );
        }

        // 4. Update password member melalui PUT /api/admin/members/{id}
        const updatePayload: any = {
            nama_member: memberDetail?.nama_member || username,
            instansi: memberDetail?.instansi || '-',
            alamat: memberDetail?.alamat || '-',
            telp: memberDetail?.telp || '-',
            password: newPassword,
        };

        const updateRes = await axios.put(`${API_BASE_URL}/api/admin/members/${memberId}`, updatePayload, {
            headers: {
                'x-maker-key': MAKER_KEY,
                'Authorization': `Bearer ${adminToken}`,
            },
        });

        return NextResponse.json({
            status: true,
            message: 'Kata sandi akun member berhasil diperbarui! Silakan gunakan kata sandi baru untuk login berikutnya.',
            data: updateRes.data?.data,
        });
    } catch (error: any) {
        console.error('API change-password error:', error.response?.data || error.message);
        return NextResponse.json(
            {
                status: false,
                message: error.response?.data?.message || 'Terjadi kesalahan saat memproses perubahan kata sandi.',
            },
            { status: error.response?.status || 500 }
        );
    }
}
