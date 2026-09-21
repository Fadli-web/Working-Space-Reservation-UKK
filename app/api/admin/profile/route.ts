import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://learn.smktelkom-mlg.sch.id/coworking').replace(/\/$/, '');
const MAKER_KEY = process.env.NEXT_PUBLIC_MAKER_KEY || 'mk_bcfeead51c4a4395a643b3ed506ba933';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'admin_profiles.json');

function getProfilesStore(): Record<string, any> {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Error reading admin profiles store:', e);
    }
    return {};
}

function saveProfilesStore(store: Record<string, any>) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing admin profiles store:', e);
    }
}

// GET /api/admin/profile
export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ status: false, message: 'Autentikasi sesi diperlukan.' }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '').trim();

        // Ambil data asli dari backend
        const res = await axios.get(`${API_BASE_URL}/api/admin/profile`, {
            headers: {
                'x-maker-key': MAKER_KEY,
                'Authorization': `Bearer ${token}`,
            },
        });

        const backendData = res.data?.data;
        if (!backendData) {
            return NextResponse.json({ status: false, message: 'Data backend tidak ditemukan' }, { status: 404 });
        }

        // Ambil data lokal (foto, alamat, deskripsi)
        const profileRes = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
            headers: {
                'x-maker-key': MAKER_KEY,
                'Authorization': `Bearer ${token}`,
            },
        });
        const userData = profileRes.data?.data;
        const uName = userData?.username?.toLowerCase()?.trim();

        let extraData = {};
        let rawNamaPemilik = backendData.nama_pemilik || '';
        
        if (rawNamaPemilik.includes('|||')) {
            const parts = rawNamaPemilik.split('|||');
            backendData.nama_pemilik = parts[0];
            try {
                if (parts[1]) extraData = JSON.parse(parts[1]);
            } catch(e) {}
        } else {
            // Fallback ke local file jika belum pakai format baru (saat transisi)
            if (uName) {
                const store = getProfilesStore();
                extraData = store[uName] || {};
            }
        }

        return NextResponse.json({
            status: true,
            data: {
                ...backendData,
                ...extraData,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { status: false, message: error.response?.data?.message || error.message },
            { status: error.response?.status || 500 }
        );
    }
}

// PUT /api/admin/profile
export async function PUT(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ status: false, message: 'Autentikasi sesi diperlukan.' }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '').trim();

        const body = await req.json();
        
        // 1. Dapatkan profil pemanggil
        const profileRes = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
            headers: { 'x-maker-key': MAKER_KEY, 'Authorization': `Bearer ${token}` },
        });
        const userData = profileRes.data?.data;
        if (!userData || userData.role !== 'admin_space') {
            return NextResponse.json({ status: false, message: 'Akses ditolak.' }, { status: 403 });
        }

        // Ambil extra data yang sudah ada (supaya kalau ada field yg kosong, kita pakai nilai lama)
        let existingExtra = {};
        try {
            const getOld = await axios.get(`${API_BASE_URL}/api/admin/profile`, {
                headers: { 'x-maker-key': MAKER_KEY, 'Authorization': `Bearer ${token}` },
            });
            const oldRaw = getOld.data?.data?.nama_pemilik || '';
            if (oldRaw.includes('|||')) {
                const parts = oldRaw.split('|||');
                if (parts[1]) existingExtra = JSON.parse(parts[1]);
            }
        } catch(e) {}

        const newExtra = {
            ...existingExtra,
            alamat: body.alamat !== undefined ? body.alamat : (existingExtra as any).alamat,
            deskripsi: body.deskripsi !== undefined ? body.deskripsi : (existingExtra as any).deskripsi,
            foto: body.foto !== undefined ? body.foto : (existingExtra as any).foto,
            updated_at: new Date().toISOString(),
        };

        const extraStr = JSON.stringify(newExtra);
        // Pack ke nama_pemilik
        const packedNamaPemilik = `${body.nama_pemilik.trim()}|||${extraStr}`;

        // 2. Kirim update ke backend asli
        const backendPayload = {
            nama_coworking: body.nama_coworking,
            nama_pemilik: packedNamaPemilik,
            telp: body.telp,
        };
        
        const res = await axios.put(`${API_BASE_URL}/api/admin/profile`, backendPayload, {
            headers: { 'x-maker-key': MAKER_KEY, 'Authorization': `Bearer ${token}` },
        });

        // 3. Simpan extra fields ke fallback local json untuk local dev (opsional tapi baiknya tetap ada)
        try {
            const uName = userData.username?.toLowerCase()?.trim();
            if (uName) {
                const store = getProfilesStore();
                store[uName] = newExtra;
                saveProfilesStore(store);
            }
        } catch(e) {}

        return NextResponse.json({
            status: true,
            message: 'Profil berhasil diperbarui.',
            data: res.data?.data,
        });
    } catch (error: any) {
        return NextResponse.json(
            { status: false, message: error.response?.data?.message || error.message },
            { status: error.response?.status || 500 }
        );
    }
}
