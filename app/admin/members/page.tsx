'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/authcontext';
import api from '@/services/api';
import { getPhotoUrl } from '@/services/auth.services';
import Navbar from '@/components/Navbar';

export default function AdminMembersPage() {
    const { user, loading: authLoading } = useAuth();

    // State Daftar Member
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // State Tampilan & Form
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [showFormPassword, setShowFormPassword] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State Modal Reset Password Cepat
    const [passwordModal, setPasswordModal] = useState<{
        isOpen: boolean;
        member: any | null;
        newPassword: string;
        confirmPassword: string;
        showPassword: boolean;
        isSaving: boolean;
        error: string;
        success: string;
    }>({
        isOpen: false,
        member: null,
        newPassword: '',
        confirmPassword: '',
        showPassword: false,
        isSaving: false,
        error: '',
        success: '',
    });

    const initialForm = {
        id: null as number | null,
        username: '',
        password: '',
        nama_member: '',
        instansi: '',
        alamat: '',
        telp: '',
        foto: '',
    };
    const [form, setForm] = useState(initialForm);

    // --- FETCH DATA MEMBER (GET /api/admin/members) ---
    const fetchMembers = async (search = '') => {
        setLoading(true);
        try {
            const timestamp = Date.now();
            const url = search.trim()
                ? `/api/admin/members?search=${encodeURIComponent(search.trim())}&_t=${timestamp}`
                : `/api/admin/members?_t=${timestamp}`;

            // Ambil data member dari backend secara real-time (tanpa cache)
            const [res, serverProfilesRes] = await Promise.all([
                api.get(url, {
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                    }
                }),
                api.get(`/api/member/profile?all=true&_t=${timestamp}`).catch(() => ({ data: { data: {} } })),
            ]);

            const rawMembers = res.data.data || [];
            const serverStore = serverProfilesRes.data?.data || {};

            // Sinkronisasi data member dengan server profile store dan cache lokal
            const enriched = rawMembers.map((m: any) => {
                const username = (m.user?.username || m.username || '').toLowerCase();
                const sProfile = serverStore[username] || serverStore[`id_${m.id}`] || {};

                let cleanInstansi = m.instansi || '';
                let photo = m.foto || null;

                // Unpack metadata dari instansi MySQL jika ada
                if (cleanInstansi.includes('|||')) {
                    const parts = cleanInstansi.split('|||');
                    cleanInstansi = parts[0];
                    try {
                        const extra = JSON.parse(parts[1]);
                        if (extra.foto) photo = extra.foto;
                    } catch {}
                }

                if (!photo) {
                    photo = sProfile.foto ||
                        (typeof window !== 'undefined' && localStorage.getItem(`member_avatar_${m.id}`)) ||
                        (typeof window !== 'undefined' && username ? localStorage.getItem(`member_avatar_override_${username}`) : null);
                }

                return {
                    ...m,
                    nama_member: sProfile.nama_member || m.nama_member,
                    instansi: sProfile.instansi || cleanInstansi,
                    telp: sProfile.telp || m.telp,
                    alamat: sProfile.alamat || m.alamat,
                    foto: photo || '',
                };
            });

            setMembers(enriched);
        } catch (error) {
            console.error('Gagal mengambil data member:', error);
            setMembers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin_space') {
            fetchMembers(searchQuery);
        }
    }, [user]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMembers(searchQuery);
    };

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new window.Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 500;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height = Math.round((height * MAX_SIZE) / width);
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width = Math.round((width * MAX_SIZE) / height);
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    } else {
                        resolve((event.target?.result as string) || '');
                    }
                };
                img.onerror = () => resolve((event.target?.result as string) || '');
                img.src = (event.target?.result as string) || '';
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        try {
            const base64Data = await compressImage(file);
            if (!base64Data) throw new Error('Gagal memproses gambar');

            // Set preview instan
            setForm(prev => ({ ...prev, foto: base64Data }));

            // Unggah ke backend endpoint /api/upload/members (HANYA kirim field 'file')
            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await api.post('/api/upload/members', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                const uploadedFilename = res.data?.data?.filename || res.data?.data?.url;
                if (uploadedFilename) {
                    const resolved = getPhotoUrl(uploadedFilename);
                    setForm(prev => ({ ...prev, foto: resolved || uploadedFilename }));
                }
            } catch (err) {
                console.warn('Upload API gagal, menggunakan format Base64 lokal.');
            }
        } catch (error) {
            alert('Gagal memproses file foto profil.');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- CRUD ACTIONS ---
    const handleAddNew = () => {
        setForm(initialForm);
        setConfirmPassword('');
        setShowFormPassword(false);
        setViewMode('form');
    };

    const handleEdit = (member: any) => {
        const username = member.user?.username || member.username || '';
        const cachedAvatar =
            (typeof window !== 'undefined' && localStorage.getItem(`member_avatar_${member.id}`)) ||
            (typeof window !== 'undefined' && username ? localStorage.getItem(`member_avatar_override_${username.toLowerCase()}`) : null);

        setForm({
            id: member.id,
            username: username,
            password: '',
            nama_member: member.nama_member || '',
            instansi: member.instansi || '',
            alamat: member.alamat || '',
            telp: member.telp || '',
            foto: member.foto || cachedAvatar || '',
        });
        setConfirmPassword('');
        setShowFormPassword(false);
        setViewMode('form');
    };

    const handleDelete = async (id: number) => {
        if (!confirm('TINDAKAN INI PERMANEN. HAPUS DATA MEMBER INI?')) return;
        try {
            const targetMember = members.find((m) => m.id === id);
            const targetUsername = targetMember?.user?.username || targetMember?.username;

            // Hapus langsung dari antarmuka seketika (optimistic update real-time)
            setMembers((prev) => prev.filter((m) => m.id !== id));

            await api.delete(`/api/admin/members/${id}`);

            // Hapus juga dari store server
            if (targetUsername) {
                api.delete(`/api/member/profile?username=${encodeURIComponent(targetUsername)}&member_id=${id}`).catch(() => {});
            }

            if (typeof window !== 'undefined') {
                localStorage.removeItem(`member_avatar_${id}`);
                if (targetUsername) {
                    localStorage.removeItem(`member_avatar_override_${targetUsername.toLowerCase()}`);
                    localStorage.removeItem(`profile_override_user_${targetUsername.toLowerCase()}`);
                }
            }

            await fetchMembers(searchQuery);
            alert('Data member berhasil dihapus.');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menghapus member.');
            fetchMembers(searchQuery);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            if (form.id) {
                // Validasi password jika diisi saat edit
                if (form.password) {
                    if (form.password.length < 6) {
                        alert('Password baru akun member minimal 6 karakter!');
                        setIsSaving(false);
                        return;
                    }
                    if (confirmPassword && form.password !== confirmPassword) {
                        alert('Konfirmasi password tidak cocok! Pastikan sandi sama.');
                        setIsSaving(false);
                        return;
                    }
                }

                // Update Member (PUT /api/admin/members/{id})
                const payload: any = {
                    nama_member: form.nama_member.trim(),
                    instansi: form.instansi.trim(),
                    alamat: form.alamat.trim(),
                    telp: form.telp.trim(),
                    foto: form.foto || undefined,
                };
                if (form.password) {
                    payload.password = form.password;
                }

                await api.put(`/api/admin/members/${form.id}`, payload);

                // Sinkronkan ke penyimpanan profil permanen di server Next.js
                try {
                    await api.put('/api/member/profile', {
                        member_id: form.id,
                        target_username: form.username,
                        nama_member: form.nama_member.trim(),
                        instansi: form.instansi.trim(),
                        alamat: form.alamat.trim(),
                        telp: form.telp.trim(),
                        foto: form.foto || undefined,
                    });
                } catch (syncErr) {
                    console.warn('Gagal sinkronisasi data member ke server store:', syncErr);
                }

                // Sinkronkan cache foto avatar lokal
                if (typeof window !== 'undefined') {
                    if (form.foto) {
                        localStorage.setItem(`member_avatar_${form.id}`, form.foto);
                        if (form.username) {
                            localStorage.setItem(`member_avatar_override_${form.username.toLowerCase()}`, form.foto);
                        }
                    }
                    if (form.username) {
                        try {
                            const existing = JSON.parse(localStorage.getItem(`profile_override_user_${form.username.toLowerCase()}`) || '{}');
                            localStorage.setItem(
                                `profile_override_user_${form.username.toLowerCase()}`,
                                JSON.stringify({
                                    ...existing,
                                    nama_member: form.nama_member.trim(),
                                    instansi: form.instansi.trim(),
                                    alamat: form.alamat.trim(),
                                    telp: form.telp.trim(),
                                    foto: form.foto || existing.foto,
                                })
                            );
                        } catch {}
                    }
                    window.dispatchEvent(new Event('member_avatar_updated'));
                    window.dispatchEvent(new Event('profile_updated'));
                }

                alert('Data member berhasil diperbarui.');
            } else {
                // Tambah Member Baru (POST /api/admin/members)
                if (form.password.length < 6) {
                    alert('Password akun member minimal 6 karakter!');
                    setIsSaving(false);
                    return;
                }
                const payload = {
                    username: form.username.trim(),
                    password: form.password,
                    nama_member: form.nama_member.trim(),
                    instansi: form.instansi.trim(),
                    alamat: form.alamat.trim(),
                    telp: form.telp.trim(),
                    foto: form.foto || undefined,
                };
                const res = await api.post('/api/admin/members', payload);
                const newMember = res.data?.data;

                if (typeof window !== 'undefined' && form.foto) {
                    if (newMember?.id) {
                        localStorage.setItem(`member_avatar_${newMember.id}`, form.foto);
                    }
                    localStorage.setItem(`member_avatar_override_${form.username.toLowerCase()}`, form.foto);
                    window.dispatchEvent(new Event('member_avatar_updated'));
                }

                alert('Member baru berhasil ditambahkan.');
            }
            setViewMode('list');
            fetchMembers(searchQuery);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data member.');
        } finally {
            setIsSaving(false);
        }
    };

    // --- QUICK RESET PASSWORD MODAL ACTIONS ---
    const openPasswordModal = (member: any) => {
        setPasswordModal({
            isOpen: true,
            member,
            newPassword: '',
            confirmPassword: '',
            showPassword: false,
            isSaving: false,
            error: '',
            success: '',
        });
    };

    const handleSaveQuickPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordModal.member) return;

        if (passwordModal.newPassword.length < 6) {
            setPasswordModal(prev => ({ ...prev, error: 'Kata sandi minimal 6 karakter!' }));
            return;
        }

        if (passwordModal.newPassword !== passwordModal.confirmPassword) {
            setPasswordModal(prev => ({ ...prev, error: 'Konfirmasi kata sandi tidak cocok!' }));
            return;
        }

        setPasswordModal(prev => ({ ...prev, isSaving: true, error: '', success: '' }));

        try {
            await api.put(`/api/admin/members/${passwordModal.member.id}`, {
                nama_member: passwordModal.member.nama_member,
                instansi: passwordModal.member.instansi || '-',
                alamat: passwordModal.member.alamat || '-',
                telp: passwordModal.member.telp || '-',
                password: passwordModal.newPassword,
            });

            setPasswordModal(prev => ({
                ...prev,
                isSaving: false,
                success: `Password untuk ${passwordModal.member.nama_member} berhasil diperbarui!`,
            }));

            setTimeout(() => {
                setPasswordModal({
                    isOpen: false,
                    member: null,
                    newPassword: '',
                    confirmPassword: '',
                    showPassword: false,
                    isSaving: false,
                    error: '',
                    success: '',
                });
            }, 1200);
        } catch (err: any) {
            setPasswordModal(prev => ({
                ...prev,
                isSaving: false,
                error: err.response?.data?.message || 'Gagal mengubah password member.',
            }));
        }
    };

    if (authLoading) return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#737373]">MEMUAT DATA...</div>;
    if (!user || user.role !== 'admin_space') return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#2D3328]">AKSES DITOLAK</div>;

    return (
        <div className="min-h-screen bg-[#FBFBF9] text-[#2D3328] font-sans pb-24 md:pb-16 selection:bg-[#7C816C] selection:text-white">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-12">

                {/* --- TAMPILAN DAFTAR MEMBER --- */}
                {viewMode === 'list' && (
                    <>
                        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EAECE6] pb-8">
                            <div>
                                <span className="inline-block px-3 py-1 bg-[#F0F1ED] text-[10px] font-bold tracking-widest uppercase rounded-md text-[#6E745F]">
                                    MANAJEMEN PENGGUNA
                                </span>
                                <h1 className="text-3xl font-black uppercase tracking-tight text-[#2D3328] mt-3">
                                    DATA MEMBER / PELANGGAN
                                </h1>
                                <p className="text-xs text-[#6E745F] font-medium mt-1">
                                    Kelola akun pelanggan, foto avatar, reset password, dan profil pengunjung coworking space.
                                </p>
                            </div>
                            <button
                                onClick={handleAddNew}
                                className="px-8 py-3.5 bg-[#2D3328] text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition active:scale-95 shadow-sm cursor-pointer"
                            >
                                + TAMBAH MEMBER BARU
                            </button>
                        </div>

                        {/* PENCARIAN MEMBER */}
                        <form onSubmit={handleSearch} className="mb-8 flex gap-3 max-w-xl">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama member, instansi, atau nomor telepon..."
                                className="flex-1 bg-white border border-[#EAECE6] rounded-full px-5 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none focus:border-[#2D3328] shadow-xs transition"
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-[#2D3328] text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[#3E4538] transition cursor-pointer"
                            >
                                Cari
                            </button>
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        fetchMembers('');
                                    }}
                                    className="px-4 py-3 bg-[#F0F1ED] text-[#2D3328] text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[#D5D8CF] transition cursor-pointer"
                                >
                                    Reset
                                </button>
                            )}
                        </form>

                        {loading ? (
                            <div className="py-20 text-center text-xs font-bold uppercase tracking-widest text-[#737373] animate-pulse">
                                SINKRONISASI DATA MEMBER...
                            </div>
                        ) : members.length === 0 ? (
                            <div className="py-24 text-center bg-white border border-[#EAECE6] rounded-[2rem]">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D3328]">TIDAK ADA DATA MEMBER</h3>
                                <p className="text-xs text-[#6E745F] mt-2">Belum ada pelanggan terdaftar atau hasil pencarian tidak ditemukan.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {members.map((member) => {
                                    const photo = getPhotoUrl(member.foto);
                                    const initial = (member.nama_member || 'M').charAt(0).toUpperCase();

                                    return (
                                        <div key={member.id} className="bg-white rounded-[2rem] border border-[#EAECE6] shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition">
                                            <div>
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-[#F0F1ED] border border-[#EAECE6] overflow-hidden flex items-center justify-center shrink-0">
                                                        {photo ? (
                                                            <img
                                                                src={photo}
                                                                alt={member.nama_member}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                    const parent = (e.target as HTMLElement).parentElement;
                                                                    if (parent && !parent.querySelector('.fallback-initial')) {
                                                                        const span = document.createElement('span');
                                                                        span.className = 'fallback-initial text-base font-black text-[#2D3328]';
                                                                        span.innerText = initial;
                                                                        parent.appendChild(span);
                                                                    }
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="text-base font-black text-[#2D3328]">{initial}</span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAECE6] text-[#2D3328]">
                                                                ID #{member.id}
                                                            </span>
                                                            <span className="text-[10px] font-mono text-[#7C816C]">
                                                                @{member.user?.username || member.username}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-base font-black text-[#2D3328] truncate">
                                                            {member.nama_member}
                                                        </h3>
                                                        <p className="text-xs font-medium text-[#6E745F] truncate">
                                                            {member.instansi || 'Independen'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 p-3.5 bg-[#F8F9F7] rounded-xl border border-[#F0F1ED] text-xs">
                                                    <div className="flex items-center gap-2 text-[#5B6050]">
                                                        <span className="text-[10px] font-bold text-[#8F9485] uppercase w-14">Kontak:</span>
                                                        <span className="font-bold">{member.telp || '-'}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2 text-[#5B6050]">
                                                        <span className="text-[10px] font-bold text-[#8F9485] uppercase w-14 shrink-0">Alamat:</span>
                                                        <span className="line-clamp-2 leading-tight">{member.alamat || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-[#EAECE6] grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => handleEdit(member)}
                                                    className="py-2.5 bg-[#F0F1ED] text-[#2D3328] text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#D5D8CF] transition cursor-pointer"
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    onClick={() => openPasswordModal(member)}
                                                    className="py-2.5 bg-[#F0F1ED] text-[#555C45] hover:text-[#2D3328] border border-[#EAECE6] text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-[#E2E5DC] transition cursor-pointer"
                                                    title="Ubah Password Akun Member"
                                                >
                                                    KATA SANDI
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(member.id)}
                                                    className="py-2.5 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-rose-100 transition cursor-pointer"
                                                >
                                                    HAPUS
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* --- TAMPILAN FORM TAMBAH/EDIT MEMBER --- */}
                {viewMode === 'form' && (
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className="text-[10px] font-bold uppercase tracking-widest text-[#737373] hover:text-[#1A1A1A] transition flex items-center gap-2 mb-3 cursor-pointer"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    KEMBALI KE DAFTAR
                                </button>
                                <h1 className="text-2xl font-black uppercase tracking-tight text-[#2D3328]">
                                    {form.id ? 'PERBARUI DATA MEMBER' : 'TAMBAH MEMBER BARU'}
                                </h1>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-[#EAECE6] shadow-sm p-8 md:p-10">

                            {/* FOTO PROFIL MEMBER */}
                            <div className="mb-8">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-3">
                                    FOTO PROFIL MEMBER (OPSIONAL)
                                </label>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-2xl bg-[#F0F1ED] border border-[#EAECE6] overflow-hidden relative group shrink-0">
                                        {form.foto ? (
                                            <img src={getPhotoUrl(form.foto) || ''} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#A3A897]">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingPhoto}
                                                className="px-2 py-1 bg-white text-[#2D3328] text-[8px] font-bold uppercase tracking-wider rounded-md cursor-pointer"
                                            >
                                                PILIH
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-[#6E745F] font-medium leading-relaxed">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingPhoto}
                                            className="px-4 py-2 bg-[#F0F1ED] text-[#2D3328] text-xs font-bold rounded-xl hover:bg-[#D5D8CF] transition cursor-pointer"
                                        >
                                            {uploadingPhoto ? 'Mengunggah...' : 'Unggah Foto Avatar'}
                                        </button>
                                        <p className="mt-1.5 text-[11px] text-[#8F9485]">Format JPG, PNG, WEBP. Maks 3MB.</p>
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* NAMA LENGKAP */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        NAMA LENGKAP MEMBER *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.nama_member}
                                        onChange={(e) => setForm({ ...form, nama_member: e.target.value })}
                                        placeholder="mis. Budi Raharjo"
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                {/* INSTANSI */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        INSTANSI / PERUSAHAAN *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.instansi}
                                        onChange={(e) => setForm({ ...form, instansi: e.target.value })}
                                        placeholder="mis. SMK Telkom Malang"
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                {/* NOMOR TELEPON */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        NOMOR TELEPON / WHATSAPP *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={form.telp}
                                        onChange={(e) => setForm({ ...form, telp: e.target.value })}
                                        placeholder="mis. 085712345678"
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                {/* USERNAME */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        USERNAME AKUN {form.id ? '(TIDAK DAPAT DIUBAH)' : '*'}
                                    </label>
                                    <input
                                        type="text"
                                        required={!form.id}
                                        disabled={Boolean(form.id)}
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        placeholder="mis. budi_raharjo"
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition disabled:opacity-60"
                                    />
                                </div>

                                {/* PASSWORD BARU */}
                                <div className={form.id ? "md:col-span-1" : "md:col-span-2"}>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F]">
                                            {form.id ? 'KATA SANDI BARU (KOSONGKAN JIKA TIDAK DIUBAH)' : 'PASSWORD AKUN (MIN. 6 KARAKTER) *'}
                                        </label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showFormPassword ? 'text' : 'password'}
                                            required={!form.id}
                                            value={form.password}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                            placeholder={form.id ? 'Masukkan kata sandi baru jika ingin mengganti' : 'Minimal 6 karakter'}
                                            className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 pr-12 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowFormPassword(!showFormPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8F9485] hover:text-[#2D3328] transition p-1"
                                            title={showFormPassword ? 'Sembunyikan password' : 'Lihat password'}
                                        >
                                            {showFormPassword ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* KONFIRMASI PASSWORD JIKA FORM EDIT DIISI */}
                                {Boolean(form.id && form.password) && (
                                    <div className="md:col-span-1">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                            KONFIRMASI KATA SANDI BARU *
                                        </label>
                                        <input
                                            type={showFormPassword ? 'text' : 'password'}
                                            required={Boolean(form.password)}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Ulangi kata sandi baru"
                                            className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                        />
                                    </div>
                                )}

                                {/* ALAMAT DOMISILI */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        ALAMAT DOMISILI LENGKAP *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={form.alamat}
                                        onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                                        placeholder="Alamat lengkap tempat tinggal member..."
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition resize-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-[#EAECE6] flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    disabled={isSaving}
                                    className="px-8 py-3.5 bg-white border border-[#D5D8CF] text-[10px] font-bold uppercase tracking-widest rounded-full text-[#6E745F] hover:bg-[#F0F1ED] transition cursor-pointer"
                                >
                                    BATALKAN
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || uploadingPhoto}
                                    className="px-10 py-3.5 bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition disabled:opacity-50 cursor-pointer"
                                >
                                    {isSaving ? 'MENYIMPAN...' : 'SIMPAN DATA MEMBER'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* --- MODAL CEPAT RESET PASSWORD MEMBER --- */}
                {passwordModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                        <div className="bg-white w-full max-w-md rounded-[2rem] border border-[#EAECE6] shadow-xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#F0F1ED]">
                                <div>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#7C816C]">
                                        AKSI KELOLA KEAMANAN
                                    </span>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-[#2D3328]">
                                        RESET KATA SANDI
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setPasswordModal(prev => ({ ...prev, isOpen: false }))}
                                    className="p-1 rounded-full text-[#8F9485] hover:text-[#2D3328] hover:bg-[#F0F1ED] transition"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <p className="text-xs text-[#555C45] mb-4">
                                Ubah kata sandi untuk akun <strong className="text-[#2D3328]">@{passwordModal.member?.user?.username || passwordModal.member?.username}</strong> ({passwordModal.member?.nama_member}).
                            </p>

                            {passwordModal.error && (
                                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                                    {passwordModal.error}
                                </div>
                            )}

                            {passwordModal.success && (
                                <div className="mb-4 p-3.5 rounded-xl bg-green-50 border border-green-200 text-xs font-bold text-green-700">
                                    {passwordModal.success}
                                </div>
                            )}

                            <form onSubmit={handleSaveQuickPassword} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-1.5">
                                        KATA SANDI BARU * (MIN. 6 KARAKTER)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={passwordModal.showPassword ? 'text' : 'password'}
                                            required
                                            value={passwordModal.newPassword}
                                            onChange={(e) => setPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                                            placeholder="Minimal 6 karakter"
                                            className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition pr-11"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setPasswordModal(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9485] hover:text-[#2D3328] transition p-1"
                                        >
                                            {passwordModal.showPassword ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-1.5">
                                        KONFIRMASI KATA SANDI BARU *
                                    </label>
                                    <input
                                        type={passwordModal.showPassword ? 'text' : 'password'}
                                        required
                                        value={passwordModal.confirmPassword}
                                        onChange={(e) => setPasswordModal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        placeholder="Ketik ulang kata sandi baru"
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#F0F1ED]">
                                    <button
                                        type="button"
                                        onClick={() => setPasswordModal(prev => ({ ...prev, isOpen: false }))}
                                        disabled={passwordModal.isSaving}
                                        className="px-5 py-2.5 rounded-full border border-[#D5D8CF] text-[10px] font-bold uppercase tracking-widest text-[#6E745F] hover:bg-[#F0F1ED] transition cursor-pointer"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={passwordModal.isSaving}
                                        className="px-6 py-2.5 rounded-full bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition disabled:opacity-50 cursor-pointer"
                                    >
                                        {passwordModal.isSaving ? 'Menyimpan...' : 'Simpan Sandi'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
