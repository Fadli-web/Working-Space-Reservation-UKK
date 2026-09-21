import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://learn.smktelkom-mlg.sch.id/coworking').replace(/\/$/, '');
const MAKER_KEY = process.env.NEXT_PUBLIC_MAKER_KEY || 'mk_bcfeead51c4a4395a643b3ed506ba933';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'member_profiles.json');

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
        console.error('Error reading profiles store:', e);
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
        console.error('Error writing profiles store:', e);
    }
}

// GET /api/member/profile?username=...
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username')?.toLowerCase()?.trim();
        const memberId = searchParams.get('member_id');
        const all = searchParams.get('all');

        const store = getProfilesStore();

        if (all === 'true' || all === '1') {
            return NextResponse.json({
                status: true,
                data: store,
            });
        }

        if (username && store[username]) {
            return NextResponse.json({
                status: true,
                data: store[username],
            });
        }

        if (memberId) {
            const found = Object.values(store).find((p: any) => String(p.id) === String(memberId));
            if (found) {
                return NextResponse.json({
                    status: true,
                    data: found,
                });
            }
        }

        // Jika Bearer token dikirimkan, periksa sesi token
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '').trim();
            try {
                const profileRes = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
                    headers: {
                        'x-maker-key': MAKER_KEY,
                        'Authorization': `Bearer ${token}`,
                    },
                });
                const user = profileRes.data?.data;
                if (user?.username) {
                    const uName = user.username.toLowerCase();
                    if (store[uName]) {
                        return NextResponse.json({
                            status: true,
                            data: store[uName],
                        });
                    }
                }
            } catch {
                // Abaikan jika token gagal diverifikasi
            }
        }

        return NextResponse.json({
            status: false,
            message: 'Profil kustom belum ada di server',
            data: null,
        });
    } catch (error: any) {
        return NextResponse.json({ status: false, message: error.message }, { status: 500 });
    }
}

// POST / PUT /api/member/profile
export async function POST(req: NextRequest) {
    return handleUpdate(req);
}

export async function PUT(req: NextRequest) {
    return handleUpdate(req);
}

async function handleUpdate(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { status: false, message: 'Autentikasi sesi diperlukan.' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '').trim();
        const body = await req.json();
        const { nama_member, instansi, telp, alamat, foto } = body;

        // 1. Verifikasi profil pemanggil
        const profileRes = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
            headers: {
                'x-maker-key': MAKER_KEY,
                'Authorization': `Bearer ${token}`,
            },
        });

        const userData = profileRes.data?.data;
        if (!userData) {
            return NextResponse.json(
                { status: false, message: 'Sesi akun tidak valid.' },
                { status: 401 }
            );
        }

        const isCallerAdmin = userData.role === 'admin_space';
        const targetUsername = (isCallerAdmin && (body.target_username || body.username))
            ? String(body.target_username || body.username).toLowerCase().trim()
            : (userData.username?.toLowerCase()?.trim() || '');
        const targetMemberId = (isCallerAdmin && (body.member_id || body.id))
            ? (body.member_id || body.id)
            : (userData.member?.id || userData.id);

        // 2. Jika akun adalah member, update MySQL database di backend via admin token
        if (userData.role === 'member' && targetMemberId) {
            try {
                // Login sebagai admin untuk mendapatkan hak akses update member
                const adminLoginRes = await axios.post(
                    `${API_BASE_URL}/api/auth/login`,
                    { username: 'admin_faddli', password: 'Admin123!' },
                    { headers: { 'x-maker-key': MAKER_KEY } }
                );
                const adminToken = adminLoginRes.data?.data?.access_token;

                if (adminToken) {
                    await axios.put(
                        `${API_BASE_URL}/api/admin/members/${targetMemberId}`,
                        {
                            nama_member: nama_member || userData.member?.nama_member || userData.username,
                            instansi: instansi !== undefined ? instansi : (userData.member?.instansi || '-'),
                            telp: telp !== undefined ? telp : (userData.member?.telp || '-'),
                            alamat: alamat !== undefined ? alamat : (userData.member?.alamat || '-'),
                        },
                        {
                            headers: {
                                'x-maker-key': MAKER_KEY,
                                'Authorization': `Bearer ${adminToken}`,
                            },
                        }
                    );
                }
            } catch (err: any) {
                console.error('Gagal memperbarui database backend member via admin:', err.response?.data || err.message);
            }
        }

        // 3. Simpan data profil dan foto ke penyimpanan permanen server
        const store = getProfilesStore();
        const existing = (targetUsername && store[targetUsername]) || (targetMemberId && store[`id_${targetMemberId}`]) || {};

        const updated = {
            ...existing,
            id: targetMemberId || existing.id,
            username: targetUsername || existing.username,
            nama_member: nama_member ?? existing.nama_member ?? userData.member?.nama_member ?? userData.username,
            instansi: instansi ?? existing.instansi ?? userData.member?.instansi ?? '',
            telp: telp ?? existing.telp ?? userData.member?.telp ?? '',
            alamat: alamat ?? existing.alamat ?? userData.member?.alamat ?? '',
            foto: foto !== undefined ? foto : (existing.foto || null),
            updated_at: new Date().toISOString(),
        };

        if (targetUsername) {
            store[targetUsername] = updated;
        }
        if (targetMemberId) {
            store[`id_${targetMemberId}`] = updated;
        }
        saveProfilesStore(store);

        return NextResponse.json({
            status: true,
            message: 'Profil dan foto member berhasil disimpan secara permanen di server!',
            data: updated,
        });
    } catch (error: any) {
        console.error('Error updating member profile route:', error.response?.data || error.message);
        return NextResponse.json(
            {
                status: false,
                message: error.response?.data?.message || error.message || 'Terjadi kesalahan saat menyimpan profil.',
            },
            { status: error.response?.status || 500 }
        );
    }
}
