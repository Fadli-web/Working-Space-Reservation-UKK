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
        if (uName) {
            const store = getProfilesStore();
            extraData = store[uName] || {};
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
        
        // 1. Dapatkan profil pemanggil untuk username
        const profileRes = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
            headers: {
                'x-maker-key': MAKER_KEY,
                'Authorization': `Bearer ${token}`,
            },
        });
        const userData = profileRes.data?.data;
        if (!userData || userData.role !== 'admin_space') {
            return NextResponse.json({ status: false, message: 'Akses ditolak.' }, { status: 403 });
        }
        const uName = userData.username?.toLowerCase()?.trim();

        // 2. Kirim update ke backend asli (hanya field yang didukung)
        const backendPayload = {
            nama_coworking: body.nama_coworking,
            nama_pemilik: body.nama_pemilik,
            telp: body.telp,
        };
        
        const res = await axios.put(`${API_BASE_URL}/api/admin/profile`, backendPayload, {
            headers: {
                'x-maker-key': MAKER_KEY,
                'Authorization': `Bearer ${token}`,
            },
        });

        // 3. Simpan extra fields secara lokal
        if (uName) {
            const store = getProfilesStore();
            const existing = store[uName] || {};
            store[uName] = {
                ...existing,
                alamat: body.alamat !== undefined ? body.alamat : existing.alamat,
                deskripsi: body.deskripsi !== undefined ? body.deskripsi : existing.deskripsi,
                foto: body.foto !== undefined ? body.foto : existing.foto,
                updated_at: new Date().toISOString(),
            };
            saveProfilesStore(store);
        }

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
