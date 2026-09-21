'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authcontext';
import api from '@/services/api';
import Navbar from '@/components/Navbar';

export default function AdminProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [form, setForm] = useState({
        nama_coworking: '',
        nama_pemilik: '',
        telp: '',
        alamat: '',
        deskripsi: '',
    });

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Fetch Profil Coworking Space (GET /api/admin/profile)
    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/profile');
            if (res.data?.data) {
                const data = res.data.data;
                setForm({
                    nama_coworking: data.nama_coworking || '',
                    nama_pemilik: data.nama_pemilik || '',
                    telp: data.telp || '',
                    alamat: data.alamat || localStorage.getItem('admin_space_alamat') || 'Jl. Danau Ranau, Sawojajar, Kedungkandang, Kota Malang',
                    deskripsi: data.deskripsi || localStorage.getItem('admin_space_deskripsi') || 'Coworking space modern dengan internet berkecepatan tinggi, meja kerja ergonomis, meeting room kedap suara, dan pantry lengkap.',
                });
            }
        } catch (error) {
            console.error('Gagal mengambil data profil admin:', error);
            // Fallback dari session user
            if (user?.space_owner) {
                setForm({
                    nama_coworking: user.space_owner.nama_coworking || '',
                    nama_pemilik: user.space_owner.nama_pemilik || '',
                    telp: user.space_owner.telp || '',
                    alamat: localStorage.getItem('admin_space_alamat') || 'Jl. Danau Ranau, Sawojajar, Kota Malang',
                    deskripsi: localStorage.getItem('admin_space_deskripsi') || 'Fasilitas kerja bersama dengan teknologi smart space.',
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin_space') {
            fetchProfile();
        }
        if (user?.username && typeof window !== 'undefined') {
            const savedAvatar = localStorage.getItem(`admin_avatar_override_${user.username.toLowerCase()}`);
            if (savedAvatar) {
                setPhotoPreview(savedAvatar);
            }
        }
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setStatusMsg({ type: 'error', text: 'Format file harus berupa gambar (JPG, PNG, WEBP)' });
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            setStatusMsg({ type: 'error', text: 'Ukuran file foto maksimal 3MB' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setPhotoPreview(result);
            if (user?.username && typeof window !== 'undefined') {
                localStorage.setItem(`admin_avatar_override_${user.username.toLowerCase()}`, result);
                window.dispatchEvent(new Event('admin_avatar_updated'));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = () => {
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (user?.username && typeof window !== 'undefined') {
            localStorage.removeItem(`admin_avatar_override_${user.username.toLowerCase()}`);
            window.dispatchEvent(new Event('admin_avatar_updated'));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setStatusMsg(null);

        // Payload sesuai DTO 8: UpdateCoworkingProfileDto (Hal. 9 & 25)
        const payload = {
            nama_coworking: form.nama_coworking.trim(),
            nama_pemilik: form.nama_pemilik.trim(),
            telp: form.telp.trim(),
        };

        try {
            await api.put('/api/admin/profile', payload);

            // Simpan alamat dan deskripsi tambahan ke localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('admin_space_alamat', form.alamat.trim());
                localStorage.setItem('admin_space_deskripsi', form.deskripsi.trim());

                if (user?.username) {
                    if (photoPreview) {
                        localStorage.setItem(`admin_avatar_override_${user.username.toLowerCase()}`, photoPreview);
                    } else {
                        localStorage.removeItem(`admin_avatar_override_${user.username.toLowerCase()}`);
                    }
                    window.dispatchEvent(new Event('admin_avatar_updated'));
                }
            }

            alert('Profil lokasi coworking space berhasil diperbarui!');
            router.push('/admin/dashboard');
        } catch (error: any) {
            setStatusMsg({
                type: 'error',
                text: error.response?.data?.message || 'Gagal menyimpan perubahan profil lokasi.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#737373]">MEMUAT DATA...</div>;
    if (!user || user.role !== 'admin_space') return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#2D3328]">AKSES DITOLAK</div>;

    return (
        <div className="min-h-screen bg-[#FBFBF9] text-[#2D3328] font-sans pb-24 md:pb-16 selection:bg-[#7C816C] selection:text-white">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 pt-12">
                <div className="mb-10 border-b border-[#EAECE6] pb-8">
                    <span className="inline-block px-3 py-1 bg-[#F0F1ED] text-[10px] font-bold tracking-widest uppercase rounded-md text-[#6E745F]">
                        PENGATURAN GEDUNG
                    </span>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-[#2D3328] mt-3">
                        PROFIL LOKASI COWORKING SPACE
                    </h1>
                    <p className="text-xs text-[#6E745F] font-medium mt-1">
                        Informasi identitas coworking space, penanggung jawab operasional, dan fasilitas utama.
                    </p>
                </div>

                {statusMsg && statusMsg.type === 'error' && (
                    <div className="mb-6 p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in bg-rose-50 text-rose-700 border border-rose-200">
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{statusMsg.text}</span>
                    </div>
                )}

                {loading ? (
                    <div className="py-20 text-center text-xs font-bold uppercase tracking-widest text-[#737373] animate-pulse">
                        MEMUAT PROFIL GEDUNG...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-[#EAECE6] shadow-sm p-8 md:p-10 space-y-6">

                        {/* FOTO PROFIL / LOGO ADMIN */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-[#F8F8F7] border border-[#EAECE6]">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                            />
                            <div className="relative group shrink-0">
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-24 h-24 rounded-full border-2 border-dashed border-[#7C816C] bg-white flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#2D3328] transition shadow-xs"
                                >
                                    {photoPreview ? (
                                        <img src={photoPreview} alt="Foto Profil" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[#2D3328] text-white flex items-center justify-center text-2xl font-black">
                                            {form.nama_pemilik ? form.nama_pemilik.charAt(0).toUpperCase() : (user?.username?.charAt(0).toUpperCase() || 'A')}
                                        </div>
                                    )}
                                </div>
                                {photoPreview && (
                                    <button
                                        type="button"
                                        onClick={handleRemovePhoto}
                                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1.5 shadow-sm hover:bg-rose-600 transition cursor-pointer"
                                        title="Hapus foto profil"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            <div className="text-center sm:text-left space-y-1.5">
                                <h3 className="text-sm font-bold text-[#2D3328]">
                                    Foto Profil & Logo Coworking
                                </h3>
                                <p className="text-xs text-[#6E745F]">
                                    Foto ini akan ditampilkan pada navigasi header dan identitas space pengelola.
                                </p>
                                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 bg-white border border-[#D5D8CF] text-[#2D3328] rounded-xl text-xs font-bold hover:bg-[#F4F5F2] hover:border-[#2D3328] transition active:scale-95 shadow-2xs cursor-pointer"
                                    >
                                        {photoPreview ? 'Ganti Foto' : 'Unggah Foto'}
                                    </button>
                                    {photoPreview && (
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition cursor-pointer"
                                        >
                                            Hapus Foto
                                        </button>
                                    )}
                                    <span className="text-[10px] text-[#9AA08F]">PNG, JPG, atau WEBP (Maks. 3MB)</span>
                                </div>
                            </div>
                        </div>

                        {/* INFORMASI UTAMA COWORKING */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                    NAMA COWORKING SPACE / BRAND *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.nama_coworking}
                                    onChange={(e) => setForm({ ...form, nama_coworking: e.target.value })}
                                    placeholder="Contoh: Moklet Hub Coworking Space"
                                    className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                    NAMA PEMILIK / PENANGGUNG JAWAB *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={form.nama_pemilik}
                                    onChange={(e) => setForm({ ...form, nama_pemilik: e.target.value })}
                                    placeholder="Contoh: Ahmad Bidin, S.Kom"
                                    className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                    NOMOR TELEPON / CALL CENTER *
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={form.telp}
                                    onChange={(e) => setForm({ ...form, telp: e.target.value })}
                                    placeholder="Contoh: 081298765432"
                                    className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                    ALAMAT LOKASI LENGKAP GEDUNG
                                </label>
                                <textarea
                                    rows={2}
                                    value={form.alamat}
                                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                                    placeholder="Alamat jalan, kelurahan, kecamatan, dan kota lokasi coworking..."
                                    className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition resize-none"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                    DESKRIPSI FASILITAS & KEUNGGULAN LOKASI
                                </label>
                                <textarea
                                    rows={4}
                                    value={form.deskripsi}
                                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                                    placeholder="Deskripsi fasilitas yang tersedia bagi para pelanggan yang menyewa space..."
                                    className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition resize-none"
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-[#EAECE6] flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-10 py-3.5 bg-[#2D3328] text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition active:scale-95 disabled:opacity-50 shadow-sm"
                            >
                                {isSaving ? 'MENYIMPAN PERUBAHAN...' : 'SIMPAN PERUBAHAN'}
                            </button>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}
