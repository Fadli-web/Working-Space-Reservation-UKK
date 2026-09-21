'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/authcontext';
import api from '@/services/api';
import Navbar from '@/components/Navbar';

export default function AdminSpacesPage() {
    const { user, loading: authLoading } = useAuth();

    // State Daftar Ruangan
    const [spaces, setSpaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // State Tampilan & Form
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [isSaving, setIsSaving] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initialForm = {
        id: null as number | null,
        nama_space: '',
        harga_per_jam: 0,
        tipe: 'desk',
        kapasitas: 1,
        deskripsi: '',
        foto: '',
    };
    const [form, setForm] = useState(initialForm);

    // --- FETCH DATA ---
    const fetchSpaces = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/spaces');
            setSpaces(res.data.data || []);
        } catch (error) {
            console.error('Gagal mengambil data spaces:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin_space') {
            fetchSpaces();
        }
    }, [user]);

    // --- HELPER FOTO ---
    const getPhotoUrl = (fotoName?: string) => {
        if (!fotoName) return null;
        if (fotoName.startsWith('data:') || fotoName.startsWith('blob:')) return fotoName;

        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://learn.smktelkom-mlg.sch.id/coworking').replace(/\/$/, '');
        if (fotoName.startsWith('http://') || fotoName.startsWith('https://')) {
            if (fotoName.includes('localhost:3000')) {
                return fotoName.replace('http://localhost:3000', baseUrl);
            }
            return fotoName;
        }
        return `${baseUrl}/uploads/spaces/${fotoName}`;
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validasi tipe & ukuran (max 5MB)
        if (!file.type.startsWith('image/')) {
            alert('Format file harus berupa gambar (JPG, PNG, WEBP)');
            return;
        }

        setSelectedFile(file);
        const previewUrl = URL.createObjectURL(file);
        setForm(prev => ({ ...prev, foto: previewUrl }));
    };

    // --- CRUD ACTIONS ---
    const handleAddNew = () => {
        setSelectedFile(null);
        setForm(initialForm);
        setViewMode('form');
    };

    const handleEdit = (space: any) => {
        setSelectedFile(null);
        setForm({
            id: space.id,
            nama_space: space.nama_space,
            harga_per_jam: space.harga_per_jam,
            tipe: space.tipe,
            kapasitas: space.kapasitas,
            deskripsi: space.deskripsi,
            foto: space.foto || '',
        });
        setViewMode('form');
    };

    const handleDelete = async (id: number) => {
        if (!confirm('TINDAKAN INI PERMANEN. HAPUS RUANGAN?')) return;
        try {
            await api.delete(`/api/admin/spaces/${id}`);
            fetchSpaces();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menghapus ruangan.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append('nama_space', form.nama_space.trim());
            formData.append('harga_per_jam', String(form.harga_per_jam));
            formData.append('tipe', form.tipe);
            formData.append('kapasitas', String(form.kapasitas));
            formData.append('deskripsi', form.deskripsi.trim());
            if (selectedFile) {
                formData.append('foto', selectedFile);
            }

            if (form.id) {
                await api.put(`/api/admin/spaces/${form.id}`, formData);
                alert('Ruangan berhasil diperbarui dengan foto.');
            } else {
                await api.post('/api/admin/spaces', formData);
                alert('Ruangan baru berhasil ditambahkan dengan foto.');
            }
            setViewMode('list');
            fetchSpaces();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan ruangan.');
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#737373]">MEMUAT DATA...</div>;
    if (!user || user.role !== 'admin_space') return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#2D3328]">AKSES DITOLAK</div>;

    return (
        <div className="min-h-screen bg-[#FBFBF9] text-[#2D3328] font-sans pb-24 md:pb-16 selection:bg-[#7C816C] selection:text-white">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-12">

                {/* --- TAMPILAN DAFTAR RUANGAN --- */}
                {viewMode === 'list' && (
                    <>
                        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EAECE6] pb-8">
                            <div>
                                <span className="inline-block px-3 py-1 bg-[#F0F1ED] text-[10px] font-bold tracking-widest uppercase rounded-md text-[#6E745F]">
                                    MANAJEMEN MASTER DATA
                                </span>
                                <h1 className="text-3xl font-black uppercase tracking-tight text-[#2D3328] mt-3">
                                    KATALOG RUANGAN
                                </h1>
                                <p className="text-xs text-[#6E745F] font-medium mt-1">
                                    Kelola daftar ruangan, meja, dan fasilitas yang tersedia untuk dipesan.
                                </p>
                            </div>
                            <button
                                onClick={handleAddNew}
                                className="px-8 py-3.5 bg-[#2D3328] text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition active:scale-95 shadow-sm"
                            >
                                + TAMBAH RUANGAN BARU
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center text-xs font-bold uppercase tracking-widest text-[#737373] animate-pulse">
                                SINKRONISASI DATA...
                            </div>
                        ) : spaces.length === 0 ? (
                            <div className="py-24 text-center bg-white border border-[#EAECE6] rounded-[2rem]">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D3328]">BELUM ADA RUANGAN</h3>
                                <p className="text-xs text-[#6E745F] mt-2">Tambahkan data meja atau ruangan agar pelanggan dapat melakukan reservasi.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {spaces.map((space) => (
                                    <div key={space.id} className="bg-white rounded-[2rem] border border-[#EAECE6] shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition">
                                        <div className="relative h-48 w-full bg-[#F0F1ED] overflow-hidden">
                                            <img
                                                src={getPhotoUrl(space.foto) || 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2'}
                                                alt={space.nama_space}
                                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                            />
                                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-[#2D3328]">
                                                    {space.tipe.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col">
                                            <h3 className="text-sm font-black text-[#2D3328] uppercase tracking-wide truncate">
                                                {space.nama_space}
                                            </h3>
                                            <p className="text-[10px] font-bold text-[#6E745F] mt-1 uppercase tracking-widest">
                                                KAPASITAS: {space.kapasitas} ORANG
                                            </p>
                                            <p className="text-lg font-black text-[#7C816C] mt-3">
                                                Rp {space.harga_per_jam.toLocaleString('id-ID')} <span className="text-[9px] font-bold text-[#A3A897] uppercase tracking-widest">/ JAM</span>
                                            </p>

                                            <div className="mt-6 pt-5 border-t border-[#EAECE6] grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => handleEdit(space)}
                                                    className="w-full py-2.5 bg-[#F0F1ED] text-[#2D3328] text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#D5D8CF] transition"
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(space.id)}
                                                    className="w-full py-2.5 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-100 transition"
                                                >
                                                    HAPUS
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* --- TAMPILAN FORM TAMBAH/EDIT --- */}
                {viewMode === 'form' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className="text-[10px] font-bold uppercase tracking-widest text-[#737373] hover:text-[#1A1A1A] transition flex items-center gap-2 mb-3"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    KEMBALI KE DAFTAR
                                </button>
                                <h1 className="text-2xl font-black uppercase tracking-tight text-[#2D3328]">
                                    {form.id ? 'PERBARUI DATA RUANGAN' : 'TAMBAH RUANGAN BARU'}
                                </h1>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-[#EAECE6] shadow-sm p-8 md:p-10">

                            {/* UPLOAD FOTO RUANGAN */}
                            <div className="mb-8">
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-3">
                                    FOTO RUANGAN / WORKSTATION
                                </label>
                                <div className="flex flex-col sm:flex-row items-start gap-6">
                                    <div className="w-full sm:w-64 h-40 rounded-[1.5rem] bg-[#F0F1ED] border border-[#EAECE6] overflow-hidden relative group">
                                        {form.foto ? (
                                            <img src={getPhotoUrl(form.foto) || form.foto} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[#A3A897]">
                                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isSaving}
                                                className="px-4 py-2 bg-white text-[#2D3328] text-[9px] font-bold uppercase tracking-widest rounded-full"
                                            >
                                                PILIH GAMBAR
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 text-xs text-[#6E745F] font-medium leading-relaxed">
                                        <p>Format yang didukung: JPG, PNG, WEBP. Resolusi optimal 800x600 px.</p>
                                        <p className="mt-1">Gambar yang menarik akan meningkatkan peluang reservasi pelanggan.</p>
                                    </div>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* NAMA SPACE */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        NAMA RUANGAN / MEJA
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.nama_space}
                                        onChange={(e) => setForm({ ...form, nama_space: e.target.value })}
                                        placeholder="Contoh: Personal Desk Alpha 01"
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                {/* TIPE SPACE */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        KATEGORI (TIPE)
                                    </label>
                                    <select
                                        value={form.tipe}
                                        onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-[#2D3328] outline-none focus:border-[#2D3328] transition appearance-none cursor-pointer"
                                    >
                                        <option value="desk">PERSONAL DESK</option>
                                        <option value="meeting_room">MEETING ROOM</option>
                                        <option value="private_office">PRIVATE OFFICE</option>
                                    </select>
                                </div>

                                {/* KAPASITAS */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        KAPASITAS MAKSIMAL (ORANG)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        required
                                        value={form.kapasitas}
                                        onChange={(e) => setForm({ ...form, kapasitas: Number(e.target.value) })}
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                {/* HARGA PER JAM */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        TARIF SEWA PER JAM (RP)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#A3A897]">Rp</span>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            value={form.harga_per_jam}
                                            onChange={(e) => setForm({ ...form, harga_per_jam: Number(e.target.value) })}
                                            className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                        />
                                    </div>
                                </div>

                                {/* DESKRIPSI FASILITAS */}
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        DESKRIPSI & FASILITAS RUANGAN
                                    </label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={form.deskripsi}
                                        onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                                        placeholder="Rincian fasilitas seperti WiFi, Stopkontak, AC, dll."
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition resize-none"
                                    />
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-[#EAECE6] flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    disabled={isSaving}
                                    className="px-8 py-3.5 bg-white border border-[#D5D8CF] text-[10px] font-bold uppercase tracking-widest rounded-full text-[#6E745F] hover:bg-[#F0F1ED] transition"
                                >
                                    BATALKAN
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-10 py-3.5 bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition disabled:opacity-50"
                                >
                                    {isSaving ? 'MENYIMPAN...' : 'SIMPAN DATA RUANGAN'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}