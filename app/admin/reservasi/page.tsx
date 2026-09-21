'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/authcontext';
import api from '@/services/api';
import { getPhotoUrl } from '@/services/auth.services';
import Navbar from '@/components/Navbar';

export default function AdminReservasiPage() {
    const { user, loading: authLoading } = useAuth();

    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

    // State Filters
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
    const [searchKeyword, setSearchKeyword] = useState<string>('');

    const fetchReservations = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterMonth) params.append('month', filterMonth.toString());
            if (filterYear) params.append('year', filterYear.toString());
            if (filterStatus) params.append('status', filterStatus);

            const [res, serverProfilesRes] = await Promise.all([
                api.get(`/api/admin/reservasi?${params.toString()}`),
                api.get('/api/member/profile?all=true').catch(() => ({ data: { data: {} } })),
            ]);

            const rawReservations = res.data.data || [];
            const serverStore = serverProfilesRes.data?.data || {};

            const enriched = rawReservations.map((item: any) => {
                const member = item.member;
                if (!member) return item;
                const username = (member.user?.username || member.username || '').toLowerCase();
                const sProfile = serverStore[username] || serverStore[`id_${member.id}`] || {};
                return {
                    ...item,
                    member: {
                        ...member,
                        nama_member: sProfile.nama_member || member.nama_member,
                        instansi: sProfile.instansi || member.instansi,
                        telp: sProfile.telp || member.telp,
                        foto: sProfile.foto || member.foto || '',
                    },
                };
            });

            setReservations(enriched);
        } catch (error) {
            console.error('Gagal mengambil data reservasi:', error);
            setReservations([]);
        } finally {
            setLoading(false);
        }
    }, [filterMonth, filterYear, filterStatus]);

    useEffect(() => {
        if (user?.role === 'admin_space') {
            fetchReservations();
        }
    }, [user, fetchReservations]);

    const filteredReservations = reservations.filter((item) => {
        if (!searchKeyword.trim()) return true;
        const q = searchKeyword.toLowerCase().trim();
        const matchCode = item.kode_booking?.toLowerCase().includes(q);
        const matchMember = item.member?.nama_member?.toLowerCase().includes(q);
        const matchSpace = item.space?.nama_space?.toLowerCase().includes(q) || 
                           item.detail_reservasi?.[0]?.space?.nama_space?.toLowerCase().includes(q);
        return matchCode || matchMember || matchSpace;
    });

    // --- HELPER TIME & FINANCIAL CALCULATIONS ---
    const hitungJamSelesai = (jamMulai: string, durasiJam: number): string => {
        if (!jamMulai) return '-';
        try {
            const parts = jamMulai.split(':');
            const h = parseInt(parts[0], 10);
            const m = parseInt(parts[1] || '0', 10);
            if (isNaN(h)) return jamMulai;
            const totalMenit = h * 60 + m + (durasiJam || 1) * 60;
            const jamSelesai = Math.floor(totalMenit / 60) % 24;
            const menitSelesai = totalMenit % 60;
            return `${String(jamSelesai).padStart(2, '0')}:${String(menitSelesai).padStart(2, '0')}`;
        } catch {
            return '-';
        }
    };

    const formatDateDisplay = (dateStr: any) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
            return d.toLocaleDateString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return String(dateStr).split('T')[0];
        }
    };

    const formatFullDate = (dateStr: any) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
            return d.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return String(dateStr).split('T')[0];
        }
    };

    const getReservationFinancials = (item: any) => {
        const detail = item?.detail_reservasi?.[0];
        const space = detail?.space || item?.space;
        const durasi = Number(item?.durasi_jam || 1);
        const hargaPerJam = Number(space?.harga_per_jam || 0);
        const subtotal = hargaPerJam > 0 ? hargaPerJam * durasi : Number(detail?.total_harga || item?.total_bayar || 0);
        const diskon = detail?.diskon || item?.diskon;
        const diskonNama = diskon?.nama_diskon || null;
        const diskonPersen = Number(diskon?.persentase_diskon || 0);

        const totalBayar = detail?.total_harga !== undefined && detail?.total_harga !== null
            ? Number(detail.total_harga)
            : Number(item?.total_bayar ?? (diskonPersen > 0 ? subtotal - (subtotal * diskonPersen / 100) : subtotal));

        const nominalDiskon = subtotal > totalBayar
            ? subtotal - totalBayar
            : (diskonPersen > 0 ? Math.round(subtotal * (diskonPersen / 100)) : 0);

        const jamMulai = item?.jam_mulai || '09:00';
        const jamSelesai = hitungJamSelesai(jamMulai, durasi);

        return {
            space,
            durasi,
            hargaPerJam,
            subtotal,
            diskon,
            diskonNama,
            diskonPersen,
            totalBayar,
            nominalDiskon,
            jamMulai,
            jamSelesai,
        };
    };

    // --- FUNGSI AKSI OPERASIONAL ADMIN ---
    const handleUpdateStatus = async (id: number, newStatus: string) => {
        if (!confirm(`Tindakan ini akan mengubah status menjadi ${newStatus.toUpperCase()}. Lanjutkan?`)) return;
        setProcessingId(id);
        try {
            await api.patch(`/api/admin/reservasi/${id}/status`, { status: newStatus });
            await fetchReservations();
            if (selectedReservation?.id === id) {
                setSelectedReservation((prev: any) => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal memperbarui status.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleCheckIn = async (id: number) => {
        if (!confirm('Proses Check-In pengunjung untuk mulai menggunakan ruangan?')) return;
        setProcessingId(id);
        try {
            await api.post(`/api/admin/reservasi/${id}/check-in`);
            await fetchReservations();
            if (selectedReservation?.id === id) {
                setSelectedReservation((prev: any) => prev ? { ...prev, status: 'aktif' } : null);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal melakukan check-in.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleCheckOut = async (id: number) => {
        if (!confirm('Proses Check-Out pengunjung? Transaksi ini akan ditandai selesai.')) return;
        setProcessingId(id);
        try {
            await api.post(`/api/admin/reservasi/${id}/check-out`);
            await fetchReservations();
            if (selectedReservation?.id === id) {
                setSelectedReservation((prev: any) => prev ? { ...prev, status: 'selesai' } : null);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || 'Gagal melakukan check-out.');
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusStyle = (status: string) => {
        const s = (status || '').toLowerCase().trim();
        if (s === 'belum_dikonfirm' || s === 'pending') return 'bg-amber-50 text-amber-800 border-amber-300';
        if (s === 'disetujui' || s === 'approved') return 'bg-blue-50 text-blue-700 border-blue-300';
        if (s === 'aktif' || s === 'active') return 'bg-[#2D3328] text-white border-[#2D3328] shadow-xs';
        if (s === 'selesai' || s === 'completed' || s === 'done') return 'bg-emerald-50 text-emerald-800 border-emerald-300';
        if (s === 'dibatalkan' || s === 'cancelled') return 'bg-rose-50 text-rose-700 border-rose-200';
        return 'bg-[#F0F1ED] text-[#6E745F] border-[#EAECE6]';
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'belum_dikonfirm': return 'Menunggu Konfirmasi';
            case 'disetujui': return 'Disetujui';
            case 'aktif': return 'Sedang Aktif (Check-In)';
            case 'selesai': return 'Selesai';
            case 'dibatalkan': return 'Dibatalkan';
            default: return status.replace('_', ' ');
        }
    };

    if (authLoading) return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#737373]">MEMUAT DATA...</div>;
    if (!user || user.role !== 'admin_space') return <div className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#2D3328]">AKSES DITOLAK</div>;

    return (
        <div className="min-h-screen bg-[#FBFBF9] text-[#2D3328] font-sans pb-24 md:pb-16">
            <Navbar />

            <main className="max-w-7xl mx-auto px-6 pt-12">
                {/* HEADER & FILTER */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EAECE6] pb-8">
                    <div>
                        <span className="inline-block px-3 py-1 bg-[#F0F1ED] text-[10px] font-bold tracking-widest uppercase rounded-md text-[#6E745F]">
                            OPERASIONAL & TRANSAKSI
                        </span>
                        <h1 className="text-3xl font-black uppercase tracking-tight text-[#2D3328] mt-3">
                            MANAJEMEN RESERVASI
                        </h1>
                        <p className="text-xs text-[#6E745F] font-medium mt-1">
                            Kelola persetujuan, rincian potongan diskon, jadwal sewa, dan alur check-in/out pengunjung.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                placeholder="Cari Kode Booking / Nama..."
                                className="bg-white border border-[#EAECE6] text-xs font-medium text-[#2D3328] placeholder-[#9AA08F] py-2.5 px-4 rounded-xl outline-none focus:border-[#7C816C] w-64 shadow-xs"
                            />
                            {searchKeyword && (
                                <button
                                    onClick={() => setSearchKeyword('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 hover:text-black cursor-pointer"
                                >
                                    x
                                </button>
                            )}
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-white border border-[#EAECE6] text-[10px] font-bold uppercase tracking-widest text-[#2D3328] py-3 px-4 rounded-xl outline-none focus:border-[#7C816C]"
                        >
                            <option value="">SEMUA STATUS</option>
                            <option value="belum_dikonfirm">BELUM DIKONFIRMASI</option>
                            <option value="disetujui">DISETUJUI</option>
                            <option value="aktif">AKTIF (CHECK-IN)</option>
                            <option value="selesai">SELESAI</option>
                            <option value="dibatalkan">DIBATALKAN</option>
                        </select>
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(Number(e.target.value))}
                            className="bg-white border border-[#EAECE6] text-[10px] font-bold uppercase tracking-widest text-[#2D3328] py-3 px-4 rounded-xl outline-none focus:border-[#7C816C]"
                        >
                            <option value={0}>SEMUA BULAN</option>
                            {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>BULAN {i + 1}</option>
                            ))}
                        </select>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            className="bg-white border border-[#EAECE6] text-[10px] font-bold uppercase tracking-widest text-[#2D3328] py-3 px-4 rounded-xl outline-none focus:border-[#7C816C]"
                        >
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                        </select>
                    </div>
                </div>

                {/* DAFTAR RESERVASI */}
                {loading ? (
                    <div className="py-20 text-center text-xs font-bold uppercase tracking-widest text-[#737373] animate-pulse">
                        SINKRONISASI DATA RESERVASI...
                    </div>
                ) : filteredReservations.length === 0 ? (
                    <div className="py-24 text-center bg-white border border-[#EAECE6] rounded-[2rem]">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D3328]">TIDAK ADA DATA RESERVASI</h3>
                        <p className="text-xs text-[#6E745F] mt-2">Belum ada transaksi yang sesuai dengan filter pencarian.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredReservations.map((item) => {
                            const fin = getReservationFinancials(item);
                            const kodeBooking = item.kode_booking || `BOOK-${item.id}`;

                            return (
                                <div key={item.id} className="bg-white p-6 md:p-8 rounded-[2rem] border border-[#EAECE6] shadow-sm hover:border-[#D0D4C7] transition-all flex flex-col justify-between">

                                    {/* Header Card */}
                                    <div className="border-b border-[#EAECE6] pb-5 mb-5 flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <span className="block text-[9px] font-bold uppercase tracking-widest text-[#6E745F]">
                                                KODE BOOKING
                                            </span>
                                            <p className="text-sm font-black text-[#2D3328] mt-1 tracking-wider font-mono">
                                                {kodeBooking}
                                            </p>
                                        </div>
                                        <div className={`px-4 py-2 rounded-full border text-[9px] font-bold uppercase tracking-widest ${getStatusStyle(item.status)}`}>
                                            {getStatusLabel(item.status)}
                                        </div>
                                    </div>

                                    {/* Informasi Pelanggan & Ruangan */}
                                    <div className="flex-1 space-y-5">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-lg font-black uppercase tracking-tight text-[#2D3328]">
                                                    {fin.space?.nama_space || fin.space?.nama || 'Ruangan Coworking'}
                                                </h4>
                                                <p className="text-[10px] font-bold text-[#7C816C] mt-1 uppercase tracking-widest">
                                                    OLEH: {item.member?.nama_member || 'Pengguna'} {item.member?.instansi ? `• ${item.member.instansi}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[9px] font-bold uppercase tracking-widest text-[#6E745F]">TOTAL TAGIHAN</span>
                                                <p className="text-base font-black text-[#2D3328]">
                                                    Rp {fin.totalBayar.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Box Tanggal & Waktu Sewa Lengkap */}
                                        <div className="grid grid-cols-2 gap-4 bg-[#F8F9F7] p-5 rounded-2xl border border-[#F0F1ED]">
                                            <div>
                                                <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8F9485]">TANGGAL SEWA</span>
                                                <p className="text-xs font-black text-[#2D3328] mt-1">{formatDateDisplay(item.tanggal_reservasi)}</p>
                                            </div>
                                            <div>
                                                <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8F9485]">DURASI WAKTU</span>
                                                <p className="text-xs font-black text-[#2D3328] mt-1">
                                                    {fin.jamMulai} – {fin.jamSelesai} <span className="text-[#7C816C] font-semibold">({fin.durasi} Jam)</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Rincian Potongan Diskon (Jika Ada) */}
                                        {fin.nominalDiskon > 0 ? (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                                                <div className="text-emerald-800">
                                                    <span>
                                                        Diskon Promo <strong>{fin.diskonNama || 'Spesial'}</strong> ({fin.diskonPersen}%)
                                                    </span>
                                                </div>
                                                <span className="font-black text-emerald-800">
                                                    – Rp {fin.nominalDiskon.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="px-4 py-2 bg-[#FBFBF9] rounded-xl border border-[#F0F1ED] flex items-center justify-between text-[11px] text-[#6E745F]">
                                                <span>Tarif Normal: Rp {fin.hargaPerJam.toLocaleString('id-ID')} / jam × {fin.durasi} Jam</span>
                                                <span className="font-semibold text-[#2D3328]">Tanpa Diskon</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* ACTION BUTTONS */}
                                    <div className="mt-6 pt-5 border-t border-[#EAECE6] flex flex-wrap items-center justify-between gap-3">
                                        <button
                                            onClick={() => setSelectedReservation(item)}
                                            className="px-4 py-2.5 bg-[#F0F1ED] hover:bg-[#E4E6DF] text-[10px] font-bold uppercase tracking-widest rounded-full text-[#2D3328] transition cursor-pointer"
                                        >
                                            Lihat Detail
                                        </button>

                                        <div className="flex items-center gap-2">
                                            {item.status === 'belum_dikonfirm' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(item.id, 'dibatalkan')}
                                                        disabled={processingId === item.id}
                                                        className="px-4 py-2.5 bg-white border border-[#D5D8CF] text-[10px] font-bold uppercase tracking-widest rounded-full text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition disabled:opacity-50 cursor-pointer"
                                                    >
                                                        TOLAK
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(item.id, 'disetujui')}
                                                        disabled={processingId === item.id}
                                                        className="px-5 py-2.5 bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition disabled:opacity-50 cursor-pointer shadow-xs"
                                                    >
                                                        SETUJUI
                                                    </button>
                                                </>
                                            )}

                                            {item.status === 'disetujui' && (
                                                <button
                                                    onClick={() => handleCheckIn(item.id)}
                                                    disabled={processingId === item.id}
                                                    className="px-6 py-2.5 bg-[#7C816C] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-[#6E745F] transition shadow-xs disabled:opacity-50 cursor-pointer"
                                                >
                                                    PROSES CHECK-IN
                                                </button>
                                            )}

                                            {item.status === 'aktif' && (
                                                <button
                                                    onClick={() => handleCheckOut(item.id)}
                                                    disabled={processingId === item.id}
                                                    className="px-6 py-2.5 bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition shadow-xs disabled:opacity-50 cursor-pointer"
                                                >
                                                    PROSES CHECK-OUT
                                                </button>
                                            )}

                                            {item.status === 'selesai' && (
                                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-300">
                                                    TRANSAKSI SELESAI
                                                </span>
                                            )}

                                            {item.status === 'dibatalkan' && (
                                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200">
                                                    TRANSAKSI DIBATALKAN
                                                </span>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* MODAL POPUP DETAIL RESERVASI & TRANSAKSI */}
            {selectedReservation && (() => {
                const fin = getReservationFinancials(selectedReservation);
                const kodeBooking = selectedReservation.kode_booking || `BOOK-${selectedReservation.id}`;
                const member = selectedReservation.member;

                return (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
                        <div className="bg-white rounded-3xl border border-[#EAECE6] shadow-2xl w-full max-w-2xl overflow-hidden my-8">
                            
                            {/* Header Modal */}
                            <div className="bg-[#2D3328] text-white px-7 py-5 flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#C2C7B8] block">
                                        INFORMASI DETAIL RESERVASI
                                    </span>
                                    <h3 className="text-lg font-black tracking-tight mt-0.5 font-mono">
                                        {kodeBooking}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${getStatusStyle(selectedReservation.status)}`}>
                                        {getStatusLabel(selectedReservation.status)}
                                    </span>
                                    <button
                                        onClick={() => setSelectedReservation(null)}
                                        className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer text-xs font-bold"
                                        title="Tutup"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto">

                                {/* Section 1: Profil Tamu / Member */}
                                <div className="bg-[#F8F9F7] rounded-2xl p-5 border border-[#F0F1ED]">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-[#7C816C]">
                                            INFORMASI MEMBER / PENYEWA
                                        </h5>
                                        {member?.foto && (
                                            <div className="w-9 h-9 rounded-xl bg-white border border-[#EAECE6] overflow-hidden shrink-0 shadow-2xs">
                                                <img src={getPhotoUrl(member.foto) || member.foto} alt={member?.nama_member} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-[#8F9485] font-semibold block text-[10px] uppercase tracking-wider">Nama Lengkap</span>
                                            <p className="font-black text-[#2D3328] text-sm mt-0.5">{member?.nama_member || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-[#8F9485] font-semibold block text-[10px] uppercase tracking-wider">Instansi / Perusahaan</span>
                                            <p className="font-bold text-[#2D3328] mt-0.5">{member?.instansi || '-'}</p>
                                        </div>
                                        <div>
                                            <span className="text-[#8F9485] font-semibold block text-[10px] uppercase tracking-wider">Kontak WhatsApp / HP</span>
                                            <p className="font-bold text-[#2D3328] mt-0.5 flex items-center gap-2">
                                                <span>{member?.telp || '-'}</span>
                                                {member?.telp && (
                                                    <a
                                                        href={`https://wa.me/${member.telp.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[10px] font-bold text-emerald-700 hover:underline bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                                                    >
                                                        Chat WA
                                                    </a>
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-[#8F9485] font-semibold block text-[10px] uppercase tracking-wider">Alamat</span>
                                            <p className="font-medium text-[#2D3328] mt-0.5 line-clamp-2">{member?.alamat || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Jadwal & Ruangan */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-[#F8F9F7] rounded-2xl p-5 border border-[#F0F1ED]">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-[#7C816C] mb-3">
                                            SPESIFIKASI RUANGAN
                                        </h5>
                                        <div className="space-y-2 text-xs">
                                            <div>
                                                <span className="text-[#8F9485] font-semibold text-[10px] uppercase tracking-wider block">Ruangan</span>
                                                <p className="font-black text-[#2D3328] mt-0.5">{fin.space?.nama_space || 'Workstation Space'}</p>
                                            </div>
                                            <div className="flex justify-between pt-1">
                                                <span className="text-[#8F9485]">Tipe Ruangan:</span>
                                                <span className="font-bold text-[#2D3328] uppercase">{fin.space?.tipe || '-'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#8F9485]">Kapasitas:</span>
                                                <span className="font-bold text-[#2D3328]">{fin.space?.kapasitas ? `${fin.space.kapasitas} Orang` : '1 Orang'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#8F9485]">Tarif Normal:</span>
                                                <span className="font-bold text-[#2D3328]">Rp {fin.hargaPerJam.toLocaleString('id-ID')} / jam</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-[#F8F9F7] rounded-2xl p-5 border border-[#F0F1ED]">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-[#7C816C] mb-3">
                                            JADWAL PEMAKAIAN
                                        </h5>
                                        <div className="space-y-2 text-xs">
                                            <div>
                                                <span className="text-[#8F9485] font-semibold text-[10px] uppercase tracking-wider block">Tanggal Reservasi</span>
                                                <p className="font-black text-[#2D3328] mt-0.5">{formatFullDate(selectedReservation.tanggal_reservasi)}</p>
                                            </div>
                                            <div className="flex justify-between pt-1">
                                                <span className="text-[#8F9485]">Waktu Sewa:</span>
                                                <span className="font-bold text-[#2D3328]">{fin.jamMulai} – {fin.jamSelesai} WIB</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-[#8F9485]">Total Durasi:</span>
                                                <span className="font-black text-[#2D3328]">{fin.durasi} Jam Penuh</span>
                                            </div>
                                             <div className="flex justify-between items-center">
                                                 <span className="text-[#8F9485]">Status Check-In:</span>
                                                 <span className={`font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full border ${getStatusStyle(selectedReservation.status)}`}>
                                                     {getStatusLabel(selectedReservation.status)}
                                                 </span>
                                             </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Rincian Transaksi Keuangan Lengkap */}
                                <div className="bg-white rounded-2xl p-5 border border-[#EAECE6] shadow-xs space-y-3">
                                    <div className="flex items-center justify-between border-b border-[#EAECE6] pb-3">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-[#7C816C]">
                                            DETAIL TRANSAKSI & PEMBAYARAN
                                        </h5>
                                        <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                            Terverifikasi
                                        </span>
                                    </div>

                                    <div className="space-y-2.5 text-xs">
                                        <div className="flex justify-between text-[#6E745F]">
                                            <span>Biaya Sewa Ruangan ({fin.durasi} Jam × Rp {fin.hargaPerJam.toLocaleString('id-ID')})</span>
                                            <span className="font-bold text-[#2D3328]">Rp {fin.subtotal.toLocaleString('id-ID')}</span>
                                        </div>

                                        {fin.nominalDiskon > 0 ? (
                                            <div className="flex justify-between text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60 font-semibold">
                                                <div>
                                                    <span className="block font-bold">Diskon Promo {fin.diskonNama || ''}</span>
                                                    <span className="text-[10px] text-emerald-700">Potongan sebesar {fin.diskonPersen}% dari subtotal sewa</span>
                                                </div>
                                                <span className="font-black text-sm text-emerald-800">
                                                    – Rp {fin.nominalDiskon.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between text-[#8F9485]">
                                                <span>Potongan Diskon Promo</span>
                                                <span>Rp 0 (Tidak ada diskon)</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between text-[#6E745F]">
                                            <span>Fasilitas & Layanan (Wi-Fi, Listrik, Minuman)</span>
                                            <span className="font-bold text-[#2D3328]">Termasuk (Rp 0)</span>
                                        </div>

                                        <div className="pt-3 border-t border-[#DFE2D8] flex items-baseline justify-between">
                                            <div>
                                                <span className="text-xs font-black uppercase tracking-wider text-[#2D3328] block">
                                                    Total Bersih Tagihan
                                                </span>
                                                <span className="text-[10px] text-[#8F9485] font-medium">
                                                    {fin.nominalDiskon > 0 ? `Subtotal Rp ${fin.subtotal.toLocaleString('id-ID')} dikurangi diskon Rp ${fin.nominalDiskon.toLocaleString('id-ID')}` : 'Sesuai tarif durasi pemesanan'}
                                                </span>
                                            </div>
                                            <span className="text-2xl font-black text-[#2D3328]">
                                                Rp {fin.totalBayar.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer Modal Actions */}
                            <div className="bg-[#F8F9F7] px-7 py-4 border-t border-[#EAECE6] flex flex-wrap items-center justify-between gap-3">
                                <button
                                    onClick={() => setSelectedReservation(null)}
                                    className="px-5 py-2.5 rounded-full border border-[#EAECE6] text-xs font-bold text-[#6E745F] hover:bg-white transition cursor-pointer"
                                >
                                    Tutup
                                </button>

                                <div className="flex items-center gap-2">
                                    {selectedReservation.status === 'belum_dikonfirm' && (
                                        <>
                                            <button
                                                onClick={() => handleUpdateStatus(selectedReservation.id, 'dibatalkan')}
                                                disabled={processingId === selectedReservation.id}
                                                className="px-4 py-2.5 bg-white border border-[#D5D8CF] text-[10px] font-bold uppercase tracking-widest rounded-full text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                                            >
                                                Tolak
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(selectedReservation.id, 'disetujui')}
                                                disabled={processingId === selectedReservation.id}
                                                className="px-5 py-2.5 bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition cursor-pointer shadow-xs disabled:opacity-50"
                                            >
                                                Setujui Pesanan
                                            </button>
                                        </>
                                    )}

                                    {selectedReservation.status === 'disetujui' && (
                                        <button
                                            onClick={() => handleCheckIn(selectedReservation.id)}
                                            disabled={processingId === selectedReservation.id}
                                            className="px-6 py-2.5 bg-[#7C816C] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-[#6E745F] transition cursor-pointer shadow-xs disabled:opacity-50"
                                        >
                                            Proses Check-In
                                        </button>
                                    )}

                                    {selectedReservation.status === 'aktif' && (
                                        <button
                                            onClick={() => handleCheckOut(selectedReservation.id)}
                                            disabled={processingId === selectedReservation.id}
                                            className="px-6 py-2.5 bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition cursor-pointer shadow-xs disabled:opacity-50"
                                        >
                                            Proses Check-Out
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                );
            })()}

        </div>
    );
}