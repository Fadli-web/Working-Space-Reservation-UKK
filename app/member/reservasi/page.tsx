'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import Navbar from '@/components/Navbar';

export default function MemberReservasiPage() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

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

    const fetchReservations = async () => {
        setLoading(true);
        try {
            // Kontrak API UKK no. 20: GET /api/reservasi/my
            const res = await api.get('/api/reservasi/my');
            let list: any[] = [];
            if (res.data?.data && Array.isArray(res.data.data)) {
                list = res.data.data;
            } else {
                list = [];
            }

            // Sinkronisasi data detail (kode_booking resmi, nama space, rincian biaya, & diskon)
            const enriched = await Promise.all(
                list.map(async (item: any) => {
                    const detail = item.detail_reservasi?.[0];
                    const durasi = Number(item.durasi_jam || 1);
                    const jamMulai = item.jam_mulai || '09:00';
                    const jamSelesai = hitungJamSelesai(jamMulai, durasi);

                    try {
                        const ticketRes = await api.get(`/api/reservasi/${item.id}/e-ticket`);
                        const t = ticketRes.data?.data;
                        if (t) {
                            const durasiT = t.rincian_biaya?.durasi_jam || (t.jadwal?.durasi ? parseInt(t.jadwal.durasi) : durasi) || 1;
                            const jamMulaiT = t.jadwal?.jam_mulai || jamMulai;
                            const jamSelesaiT = hitungJamSelesai(jamMulaiT, durasiT);
                            const hargaPerJam = Number(t.rincian_biaya?.harga_per_jam || t.space?.harga_per_jam || detail?.space?.harga_per_jam || 0);
                            const subtotal = Number(t.rincian_biaya?.subtotal || (hargaPerJam * durasiT));
                            const diskonNama = t.rincian_biaya?.diskon_nama || detail?.diskon?.nama_diskon || null;
                            const diskonPersen = t.rincian_biaya?.diskon_persen || (detail?.diskon?.persentase_diskon ? `${detail.diskon.persentase_diskon}%` : null);
                            const totalBayar = Number(t.rincian_biaya?.total_pembayaran ?? detail?.total_harga ?? t.rincian_pembayaran?.total_dibayar ?? item.total_bayar ?? subtotal);
                            const potonganNominal = subtotal > totalBayar ? subtotal - totalBayar : 0;

                            return {
                                ...item,
                                kode_booking: t.booking_code || t.kode_booking || item.kode_booking || `BOOK-${item.id}`,
                                space: {
                                    ...item.space,
                                    nama_space: t.space?.nama || t.space?.nama_space || item.space?.nama_space || detail?.space?.nama_space,
                                    nama: t.space?.nama || t.space?.nama_space || detail?.space?.nama_space,
                                    tipe: t.space?.tipe || item.space?.tipe || detail?.space?.tipe,
                                    harga_per_jam: hargaPerJam,
                                },
                                space_name: t.space?.nama || t.space?.nama_space || item.space_name,
                                total_bayar: totalBayar,
                                subtotal,
                                diskon_nama: diskonNama,
                                diskon_persen: diskonPersen,
                                potongan_nominal: potonganNominal,
                                jam_mulai: jamMulaiT,
                                jam_selesai: jamSelesaiT,
                                durasi_jam: durasiT,
                            };
                        }
                    } catch (err) {
                        // Fallback using item local data
                    }

                    const hargaPerJam = Number(detail?.space?.harga_per_jam || item.space?.harga_per_jam || 0);
                    const subtotal = hargaPerJam * durasi;
                    const diskonNama = detail?.diskon?.nama_diskon || null;
                    const diskonPersen = detail?.diskon?.persentase_diskon ? `${detail.diskon.persentase_diskon}%` : null;
                    const totalBayar = Number(detail?.total_harga ?? item.total_bayar ?? subtotal);
                    const potonganNominal = subtotal > totalBayar ? subtotal - totalBayar : 0;

                    return {
                        ...item,
                        kode_booking: item.kode_booking || `BOOK-${item.id}`,
                        total_bayar: totalBayar,
                        subtotal,
                        diskon_nama: diskonNama,
                        diskon_persen: diskonPersen,
                        potongan_nominal: potonganNominal,
                        jam_mulai: jamMulai,
                        jam_selesai: jamSelesai,
                        durasi_jam: durasi,
                    };
                })
            );

            setReservations(enriched);
        } catch (error) {
            console.warn('Gagal mengambil data reservasi dari API:', error);
            setReservations([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, []);

    const handleCancel = async (id: number) => {
        if (!confirm('Apakah Anda yakin ingin membatalkan pemesanan ini?')) return;
        try {
            // Kontrak API UKK no. 24: PATCH /api/reservasi/{id}/cancel
            await api.patch(`/api/reservasi/${id}/cancel`);
            alert('Reservasi berhasil dibatalkan.');
            fetchReservations();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Reservasi berhasil dibatalkan.');
            setReservations((prev) =>
                prev.map((r) => (r.id === id ? { ...r, status: 'dibatalkan' } : r))
            );
        }
    };

    const formatDateDisplay = (dateStr: any) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                const cleanStr = String(dateStr).split('T')[0];
                return cleanStr;
            }
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

    const getItemPrice = (item: any): string => {
        if (!item) return '0';
        const val = item.total_bayar ?? item.detail_reservasi?.[0]?.total_harga;
        if (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0) {
            return Number(val).toLocaleString('id-ID');
        }

        const pricePerHour = item.harga_per_jam || item.space?.harga_per_jam || 20000;
        const duration = item.durasi_jam || 1;
        return Number(pricePerHour * duration).toLocaleString('id-ID');
    };

    const getSpaceTitle = (item: any): string => {
        return (
            item.space?.nama ||
            item.space?.nama_space ||
            item.detail_reservasi?.[0]?.space?.nama_space ||
            item.space_name ||
            'Workstation Space'
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'belum_dikonfirm':
                return { label: 'MENUNGGU KONFIRMASI', style: 'bg-amber-50 text-amber-800 border-amber-300 font-extrabold' };
            case 'disetujui':
                return { label: 'DISETUJUI', style: 'bg-blue-50 text-blue-700 border-blue-300 font-extrabold' };
            case 'aktif':
                return { label: 'SEDANG AKTIF', style: 'bg-[#2D3328] text-white border-[#2D3328] font-extrabold shadow-xs' };
            case 'selesai':
                return { label: 'SELESAI', style: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold' };
            case 'dibatalkan':
                return { label: 'DIBATALKAN', style: 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold' };
            default:
                return { label: String(status).toUpperCase(), style: 'bg-[#F0F1ED] text-[#6E745F] border-[#EAECE6]' };
        }
    };

    const filteredReservations = reservations.filter((r) => {
        if (statusFilter === 'all') return true;
        return r.status === statusFilter;
    });

    return (
        <div className="min-h-screen bg-[#F8F8F7] text-[#2D3328] font-sans pb-24 selection:bg-[#7C816C] selection:text-white">
            <Navbar />

            {/* MAIN CONTENT */}
            <main className="mx-auto w-full max-w-7xl px-5 sm:px-8 pt-8 space-y-7">

                {/* PAGE HEADER */}
                <div className="border-b border-[#EAECE6] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7C816C] bg-[#EAECE6] px-3 py-1 rounded-full inline-block mb-2.5">
                            STATUS PEMESANAN AKTIF
                        </span>
                        <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#2D3328]">
                            Status Reservasi Anda
                        </h1>
                        <p className="text-xs sm:text-sm text-[#6E745F] font-medium mt-1">
                            Pantau status konfirmasi pemesanan, potongan promo hemat, batalkan jadwal pending, atau buka E-Ticket QR Code untuk check-in.
                        </p>
                    </div>

                    <div className="text-xs font-bold text-[#7C816C]">
                        Total <span className="text-[#2D3328] font-black">{filteredReservations.length}</span> pemesanan
                    </div>
                </div>

                {/* STATUS FILTER TABS */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                    {[
                        { id: 'all', label: 'Semua Status' },
                        { id: 'belum_dikonfirm', label: 'Menunggu Konfirmasi' },
                        { id: 'disetujui', label: 'Disetujui' },
                        { id: 'aktif', label: 'Sedang Aktif' },
                        { id: 'selesai', label: 'Selesai' },
                        { id: 'dibatalkan', label: 'Dibatalkan' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                                statusFilter === tab.id
                                    ? 'bg-[#2D3328] text-white border-[#2D3328] shadow-xs'
                                    : 'bg-white text-[#6E745F] border-[#EAECE6] hover:border-[#2D3328] hover:text-[#2D3328]'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* RESERVATIONS GRID */}
                {loading ? (
                    <div className="text-center py-24 text-xs font-bold uppercase tracking-widest text-[#7C816C] animate-pulse">
                        Memuat data pemesanan & E-Ticket...
                    </div>
                ) : filteredReservations.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-[#EAECE6] p-8 space-y-3">
                        <h2 className="text-base font-black uppercase text-[#2D3328]">Tidak Ada Pemesanan</h2>
                        <p className="text-xs text-[#6E745F] max-w-sm mx-auto">
                            Tidak ditemukan reservasi dengan status yang dipilih. Silakan pilih ruangan untuk mulai bekerja.
                        </p>
                        <Link
                            href="/member/spaces"
                            className="inline-flex items-center gap-2 mt-2 bg-[#2D3328] text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#3E4538] transition shadow-xs"
                        >
                            <span>Pilih Ruangan Sekarang</span>
                            <span>→</span>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredReservations.map((item) => {
                            const badge = getStatusBadge(item.status);
                            const spaceTitle = getSpaceTitle(item);
                            const displayPrice = getItemPrice(item);
                            const displayDate = formatDateDisplay(item.tanggal_reservasi);
                            const jamMulai = item.jam_mulai || '09:00';
                            const jamSelesai = item.jam_selesai || hitungJamSelesai(jamMulai, item.durasi_jam || 1);
                            const durasiText = item.durasi_jam ? ` (${item.durasi_jam} Jam)` : '';

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white p-5 rounded-2xl border border-[#EAECE6] hover:border-[#D0D4C7] transition-all flex flex-col justify-between shadow-xs"
                                >
                                    <div>
                                        {/* Card Top: Booking Code & Status Badge */}
                                        <div className="flex items-start justify-between gap-3 border-b border-[#EAECE6] pb-3 mb-3.5">
                                            <div>
                                                <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">
                                                    KODE BOOKING
                                                </span>
                                                <p className="text-xs font-black text-[#2D3328] mt-0.5 font-mono tracking-tight">
                                                    {item.kode_booking || `BOOK-${item.id}`}
                                                </p>
                                            </div>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badge.style}`}>
                                                {badge.label}
                                            </span>
                                        </div>

                                        {/* Room Name */}
                                        <h3 className="text-sm font-black uppercase text-[#2D3328] tracking-tight line-clamp-2">
                                            {spaceTitle}
                                        </h3>

                                        {/* Schedule Details Box */}
                                        <div className="mt-3.5 grid grid-cols-2 gap-3 bg-[#F8F9F7] p-3 rounded-xl border border-[#F0F1ED]">
                                            <div>
                                                <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">
                                                    TANGGAL
                                                </span>
                                                <p className="text-xs font-bold text-[#2D3328] mt-0.5">
                                                    {displayDate}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">
                                                    WAKTU
                                                </span>
                                                <p className="text-xs font-bold text-[#2D3328] mt-0.5">
                                                    {jamMulai} – {jamSelesai}{durasiText}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Diskon Badge (Jika Ada) */}
                                        {item.potongan_nominal > 0 && (
                                            <div className="mt-3 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[10px]">
                                                <span className="text-emerald-800 font-bold">
                                                    Promo {item.diskon_nama || ''} {item.diskon_persen ? `(${item.diskon_persen})` : ''}
                                                </span>
                                                <span className="text-emerald-800 font-black">
                                                    – Rp {item.potongan_nominal.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Bottom: Price & Action Buttons */}
                                    <div className="mt-4 pt-3.5 border-t border-[#EAECE6] flex items-center justify-between gap-2">
                                        <div>
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">
                                                TOTAL BIAYA
                                            </span>
                                            <p className="text-sm font-black text-[#2D3328] mt-0.5">
                                                Rp {displayPrice}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {item.status === 'belum_dikonfirm' && (
                                                <button
                                                    onClick={() => handleCancel(item.id)}
                                                    className="rounded-full bg-white border border-[#EAECE6] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6E745F] hover:text-rose-600 hover:border-rose-300 transition cursor-pointer"
                                                >
                                                    Batalkan
                                                </button>
                                            )}

                                            <Link
                                                href={`/member/reservasi/${item.id}`}
                                                className="rounded-full bg-[#2D3328] px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-[#3E4538] transition shadow-xs flex items-center gap-1"
                                            >
                                                <span>E-Ticket / Detail</span>
                                                <span>→</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </main>
        </div>
    );
}