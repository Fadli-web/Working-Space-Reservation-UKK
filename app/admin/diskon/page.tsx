'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/authcontext';
import api from '@/services/api';
import Navbar from '@/components/Navbar';

export default function AdminDiskonPage() {
    const { user, loading: authLoading } = useAuth();

    // State Daftar Diskon
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // State Tampilan & Form
    const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
    const [isSaving, setIsSaving] = useState(false);

    const initialForm = {
        id: null as number | null,
        nama_diskon: '',
        persentase_diskon: 0,
        tanggal_awal: '',
        tanggal_akhir: '',
    };
    const [form, setForm] = useState(initialForm);

    // --- FETCH DATA ---
    const fetchDiscounts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/diskon');
            setDiscounts(res.data.data || []);
        } catch (error) {
            console.error('Gagal mengambil data diskon:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'admin_space') {
            fetchDiscounts();
        }
    }, [user]);

    // --- HELPER FORMAT WAKTU ---
    // Konversi ISO 8601 (Backend) ke format datetime-local (YYYY-MM-DDThh:mm) untuk input HTML
    const formatToLocalDatetime = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        // Menyesuaikan zona waktu lokal
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    // Konversi local input ke format ISO 8601 (UTC) untuk disimpan ke backend sesuai Kontrak API
    const formatToISO = (localString: string) => {
        if (!localString) return '';
        return new Date(localString).toISOString();
    };

    const formatDateDisplay = (isoString: string) => {
        const options: Intl.DateTimeFormatOptions = {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        };
        return new Date(isoString).toLocaleDateString('id-ID', options);
    };

    // Pengecekan status kedaluwarsa
    const checkIsActive = (start: string, end: string) => {
        const now = new Date().getTime();
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        return now >= startTime && now <= endTime;
    };

    // --- CRUD ACTIONS ---
    const handleAddNew = () => {
        setForm(initialForm);
        setViewMode('form');
    };

    const handleEdit = (diskon: any) => {
        setForm({
            id: diskon.id,
            nama_diskon: diskon.nama_diskon,
            persentase_diskon: diskon.persentase_diskon,
            tanggal_awal: formatToLocalDatetime(diskon.tanggal_awal),
            tanggal_akhir: formatToLocalDatetime(diskon.tanggal_akhir),
        });
        setViewMode('form');
    };

    const handleDelete = async (id: number) => {
        if (!confirm('TINDAKAN INI PERMANEN. HAPUS KODE PROMO?')) return;
        try {
            await api.delete(`/api/admin/diskon/${id}`);
            fetchDiscounts();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal menghapus kode promo.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            nama_diskon: form.nama_diskon.trim().toUpperCase(),
            persentase_diskon: Number(form.persentase_diskon),
            tanggal_awal: formatToISO(form.tanggal_awal),
            tanggal_akhir: formatToISO(form.tanggal_akhir),
        };

        // Validasi
        if (payload.persentase_diskon < 1 || payload.persentase_diskon > 100) {
            alert('Persentase diskon harus di antara 1 hingga 100.');
            setIsSaving(false);
            return;
        }

        try {
            if (form.id) {
                await api.put(`/api/admin/diskon/${form.id}`, payload);
                alert('Kode promo berhasil diperbarui.');
            } else {
                await api.post('/api/admin/diskon', payload);
                alert('Kode promo baru berhasil ditambahkan.');
            }
            setViewMode('list');
            fetchDiscounts();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Terjadi kesalahan saat menyimpan.');
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

                {/* --- TAMPILAN DAFTAR KODE PROMO --- */}
                {viewMode === 'list' && (
                    <>
                        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EAECE6] pb-8">
                            <div>
                                <span className="inline-block px-3 py-1 bg-[#F0F1ED] text-[10px] font-bold tracking-widest uppercase rounded-md text-[#6E745F]">
                                    MANAJEMEN KAMPANYE
                                </span>
                                <h1 className="text-3xl font-black uppercase tracking-tight text-[#2D3328] mt-3">
                                    KODE PROMO & DISKON
                                </h1>
                                <p className="text-xs text-[#6E745F] font-medium mt-1">
                                    Atur kode voucher dan persentase potongan harga untuk menarik pelanggan.
                                </p>
                            </div>
                            <button
                                onClick={handleAddNew}
                                className="px-8 py-3.5 bg-[#2D3328] text-white text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition active:scale-95 shadow-sm"
                            >
                                + BUAT KODE PROMO
                            </button>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center text-xs font-bold uppercase tracking-widest text-[#737373] animate-pulse">
                                SINKRONISASI DATA...
                            </div>
                        ) : discounts.length === 0 ? (
                            <div className="py-24 text-center bg-white border border-[#EAECE6] rounded-[2rem]">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D3328]">BELUM ADA PROMO</h3>
                                <p className="text-xs text-[#6E745F] mt-2">Buat kode diskon baru untuk meningkatkan pemesanan workspace.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {discounts.map((diskon) => {
                                    const isActive = checkIsActive(diskon.tanggal_awal, diskon.tanggal_akhir);

                                    return (
                                        <div key={diskon.id} className="bg-white rounded-[2rem] border border-[#EAECE6] shadow-sm flex flex-col hover:shadow-md transition">

                                            {/* Header Card Promo */}
                                            <div className="p-6 md:p-8 flex-1">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${isActive
                                                        ? 'bg-[#E8F0E4] text-[#4A5D23] border-[#D4E2CD]'
                                                        : 'bg-[#F5F5F5] text-[#999999] border-[#EAECE6]'
                                                        }`}>
                                                        {isActive ? 'SEDANG AKTIF' : 'KEDALUWARSA / BELUM DIMULAI'}
                                                    </div>
                                                </div>

                                                <h3 className="text-2xl font-black text-[#2D3328] uppercase tracking-wide font-mono mb-2">
                                                    {diskon.nama_diskon}
                                                </h3>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7C816C]">
                                                    POTONGAN HARGA: <span className="text-sm font-black text-[#2D3328]">{diskon.persentase_diskon}%</span>
                                                </p>

                                                <div className="mt-6 space-y-3 p-4 bg-[#F8F9F7] rounded-xl border border-[#F0F1ED]">
                                                    <div>
                                                        <span className="block text-[8px] font-bold uppercase tracking-widest text-[#8F9485]">BERLAKU MULAI</span>
                                                        <p className="text-[10px] font-bold text-[#2D3328] mt-0.5">{formatDateDisplay(diskon.tanggal_awal)}</p>
                                                    </div>
                                                    <div>
                                                        <span className="block text-[8px] font-bold uppercase tracking-widest text-[#8F9485]">BERAKHIR PADA</span>
                                                        <p className="text-[10px] font-bold text-[#2D3328] mt-0.5">{formatDateDisplay(diskon.tanggal_akhir)}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer Actions */}
                                            <div className="p-4 border-t border-[#EAECE6] grid grid-cols-2 gap-3 bg-[#FBFBF9] rounded-b-[2rem]">
                                                <button
                                                    onClick={() => handleEdit(diskon)}
                                                    className="w-full py-2.5 bg-white border border-[#D5D8CF] text-[#2D3328] text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-[#F0F1ED] transition"
                                                >
                                                    EDIT KODE
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(diskon.id)}
                                                    className="w-full py-2.5 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-bold uppercase tracking-widest rounded-xl hover:bg-rose-100 transition"
                                                >
                                                    HAPUS KODE
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* --- TAMPILAN FORM TAMBAH/EDIT --- */}
                {viewMode === 'form' && (
                    <div className="max-w-3xl mx-auto">
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
                                    {form.id ? 'PERBARUI KODE PROMO' : 'BUAT KODE PROMO BARU'}
                                </h1>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] border border-[#EAECE6] shadow-sm p-8 md:p-10">

                            <div className="space-y-6">
                                {/* NAMA DISKON */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        KODE PROMO VOUCHER
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.nama_diskon}
                                        onChange={(e) => setForm({ ...form, nama_diskon: e.target.value.toUpperCase() })}
                                        placeholder="Contoh: MERDEKA50"
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-sm font-black font-mono text-[#2D3328] uppercase outline-none focus:border-[#2D3328] transition"
                                    />
                                    <p className="text-[9px] text-[#8F9485] mt-1.5 uppercase font-medium">Hanya huruf dan angka tanpa spasi.</p>
                                </div>

                                {/* PERSENTASE DISKON */}
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        PERSENTASE POTONGAN HARGA (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            required
                                            value={form.persentase_diskon || ''}
                                            onChange={(e) => setForm({ ...form, persentase_diskon: Number(e.target.value) })}
                                            placeholder="Contoh: 20"
                                            className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl pl-4 pr-12 py-3.5 text-sm font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#A3A897]">%</span>
                                    </div>
                                </div>

                                {/* PERIODE WAKTU */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                            WAKTU BERLAKU MULAI
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={form.tanggal_awal}
                                            onChange={(e) => setForm({ ...form, tanggal_awal: e.target.value })}
                                            className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition uppercase"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                            WAKTU BERAKHIR
                                        </label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={form.tanggal_akhir}
                                            onChange={(e) => setForm({ ...form, tanggal_akhir: e.target.value })}
                                            className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition uppercase"
                                        />
                                    </div>
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
                                    {isSaving ? 'MENYIMPAN...' : 'SIMPAN KODE PROMO'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}   