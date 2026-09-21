'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import Navbar from '@/components/Navbar';

export default function MemberHistoriPage() {
    const [historyData, setHistoryData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());



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

    const enrichItemWithTicket = async (item: any): Promise<any> => {
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
                const totalBayar = Number(t.rincian_biaya?.total_pembayaran ?? detail?.total_harga ?? t.rincian_pembayaran?.total_dibayar ?? item.total_bayar ?? subtotal);

                return {
                    ...item,
                    kode_booking: t.booking_code || t.kode_booking || item.kode_booking || `BOOK-${item.id}`,
                    space: {
                        ...item.space,
                        nama_space: t.space?.nama || t.space?.nama_space || item.space?.nama_space || detail?.space?.nama_space,
                    },
                    total_bayar: totalBayar,
                    jam_mulai: jamMulaiT,
                    jam_selesai: jamSelesaiT,
                    durasi_jam: durasiT,
                };
            }
        } catch {
            // Fallback to local data
        }

        const hargaPerJam = Number(detail?.space?.harga_per_jam || item.space?.harga_per_jam || 0);
        const subtotal = hargaPerJam * durasi;
        const totalBayar = Number(detail?.total_harga ?? item.total_bayar ?? subtotal);

        return {
            ...item,
            kode_booking: item.kode_booking || `BOOK-${item.id}`,
            total_bayar: totalBayar,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            durasi_jam: durasi,
        };
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // Kontrak API UKK no. 21: GET /api/reservasi/my/history?month=...&year=...
            const res = await api.get(`/api/reservasi/my/history?month=${selectedMonth}&year=${selectedYear}`);
            const histData = res.data?.data;

            // Cek apakah backend mengembalikan items yang valid
            if (histData && Array.isArray(histData.items) && histData.items.length > 0) {
                // Enrich items with e-ticket data for accurate pricing
                const enrichedItems = await Promise.all(histData.items.map(enrichItemWithTicket));
                const calcTotal = enrichedItems.reduce((acc: number, cur: any) => {
                    return acc + (Number(cur.total_bayar) || 0);
                }, 0);
                setHistoryData({
                    ...histData,
                    items: enrichedItems,
                    total_pengeluaran: histData.total_pengeluaran > 0 ? histData.total_pengeluaran : calcTotal,
                });
            } else {
                // FALLBACK: Backend mengembalikan items kosong, ambil dari /api/reservasi/my
                // dan filter berdasarkan bulan/tahun yang dipilih
                await fetchHistoryFallback(histData?.total_reservasi);
            }
        } catch (error) {
            console.warn('Gagal memuat histori reservasi dari API, menggunakan fallback:', error);
            await fetchHistoryFallback();
        } finally {
            setLoading(false);
        }
    };

    const fetchHistoryFallback = async (apiTotalReservasi?: number) => {
        try {
            // Kontrak API UKK no. 20: GET /api/reservasi/my
            const res = await api.get('/api/reservasi/my');
            let list: any[] = [];
            if (res.data?.data && Array.isArray(res.data.data)) {
                list = res.data.data;
            }

            // Filter berdasarkan bulan dan tahun yang dipilih
            const filtered = list.filter((item: any) => {
                const dateStr = item.tanggal_reservasi || item.tanggal || item.created_at;
                if (!dateStr) return false;
                try {
                    const d = new Date(String(dateStr).split('T')[0]);
                    return (d.getMonth() + 1) === selectedMonth && d.getFullYear() === selectedYear;
                } catch {
                    return false;
                }
            });

            // Enrich each item with e-ticket data for accurate pricing
            const enrichedItems = await Promise.all(filtered.map(enrichItemWithTicket));

            // Hitung total pengeluaran hanya dari yang SELESAI
            const completedItems = enrichedItems.filter((item: any) => {
                const status = (item.status || '').toUpperCase();
                return status === 'SELESAI' || status === 'COMPLETED' || status === 'DONE';
            });
            const totalPengeluaran = completedItems.reduce((acc: number, cur: any) => {
                return acc + (Number(cur.total_bayar) || 0);
            }, 0);

            setHistoryData({
                month: selectedMonth,
                year: selectedYear,
                total_reservasi: apiTotalReservasi ?? filtered.length,
                total_pengeluaran: totalPengeluaran,
                items: enrichedItems,
            });
        } catch (fallbackError) {
            console.warn('Fallback histori juga gagal:', fallbackError);
            setHistoryData({
                month: selectedMonth,
                year: selectedYear,
                total_reservasi: 0,
                total_pengeluaran: 0,
                items: [],
            });
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [selectedMonth, selectedYear]);

    const formatDateDisplay = (dateStr: any) => {
        if (!dateStr) return '-';
        try {
            const cleanStr = String(dateStr).split('T')[0];
            const parts = cleanStr.split('-');
            if (parts.length === 3) {
                const year = parts[0];
                const monthIndex = parseInt(parts[1], 10) - 1;
                const day = parseInt(parts[2], 10);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                return `${day} ${months[monthIndex] || parts[1]} ${year}`;
            }
            return cleanStr;
        } catch {
            return String(dateStr).split('T')[0];
        }
    };

    const getItemPrice = (item: any): string => {
        if (!item) return '0';
        const val =
            item.total_bayar ??
            item.total_biaya ??
            item.total_harga ??
            item.total_dibayar ??
            item.rincian_pembayaran?.total_dibayar ??
            item.total;

        if (val !== undefined && val !== null && !isNaN(Number(val)) && Number(val) > 0) {
            return Number(val).toLocaleString('id-ID');
        }

        const pricePerHour = item.harga_per_jam || item.space?.harga_per_jam || 20000;
        const duration = item.durasi_jam || 3;
        return Number(pricePerHour * duration).toLocaleString('id-ID');
    };

    const getSpaceTitle = (item: any): string => {
        return (
            item.space?.nama_space ||
            item.space_name ||
            item.nama_space ||
            item.space?.nama ||
            item.nama ||
            'Workstation Space'
        );
    };

    const getStatusStyle = (status: string) => {
        const s = (status || '').toUpperCase();
        if (s === 'SELESAI' || s === 'COMPLETED' || s === 'DONE') {
            return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
        }
        if (s === 'DIBATALKAN' || s === 'CANCELLED') {
            return 'bg-rose-100 text-rose-700 border border-rose-200';
        }
        if (s === 'DISETUJUI' || s === 'APPROVED') {
            return 'bg-blue-100 text-blue-700 border border-blue-200';
        }
        if (s === 'AKTIF' || s === 'ACTIVE' || s === 'SEDANG DIGUNAKAN') {
            return 'bg-emerald-900 text-emerald-100 border border-emerald-800';
        }
        if (s.includes('BELUM') || s.includes('MENUNGGU') || s === 'PENDING') {
            return 'bg-amber-100 text-amber-700 border border-amber-200';
        }
        return 'bg-[#EAECE6] text-[#2D3328]';
    };

    const months = [
        { value: 1, label: 'Januari' },
        { value: 2, label: 'Februari' },
        { value: 3, label: 'Maret' },
        { value: 4, label: 'April' },
        { value: 5, label: 'Mei' },
        { value: 6, label: 'Juni' },
        { value: 7, label: 'Juli' },
        { value: 8, label: 'Agustus' },
        { value: 9, label: 'September' },
        { value: 10, label: 'Oktober' },
        { value: 11, label: 'November' },
        { value: 12, label: 'Desember' }
    ];

    const items = historyData?.items || [];
    const totalReservasi = historyData?.total_reservasi ?? items.length;
    const rawTotalPengeluaran = historyData?.total_pengeluaran ?? items.reduce((acc: number, cur: any) => {
        const val = cur.total_bayar ?? cur.total_biaya ?? cur.total_harga ?? 0;
        return acc + (Number(val) || 0);
    }, 0);
    const totalPengeluaran = Number(rawTotalPengeluaran) || 0;

    return (
        <div className="min-h-screen bg-[#F8F8F7] text-[#2D3328] font-sans pb-24 selection:bg-[#7C816C] selection:text-white">
            <Navbar />

            {/* MAIN CONTENT */}
            <main className="mx-auto w-full max-w-7xl px-5 sm:px-8 pt-8 space-y-7">

                {/* PAGE HEADER */}
                <div className="border-b border-[#EAECE6] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7C816C] bg-[#EAECE6] px-3 py-1 rounded-full inline-block mb-2.5">
                            REKAP HISTORI BULANAN
                        </span>
                        <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#2D3328]">
                            Histori Pemesanan
                        </h1>
                        <p className="text-xs sm:text-sm text-[#6E745F] font-medium mt-1">
                            Laporan rekapitulasi riwayat transaksi dan total pengeluaran sewa coworking space per bulan.
                        </p>
                    </div>

                    {/* Filter Bulan & Tahun */}
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-white border border-[#EAECE6] text-xs font-bold text-[#2D3328] py-2 px-4 rounded-full outline-none shadow-xs"
                        >
                            {months.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-white border border-[#EAECE6] text-xs font-bold text-[#2D3328] py-2 px-4 rounded-full outline-none shadow-xs"
                        >
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                        </select>
                    </div>
                </div>

                {/* SUMMARY METRICS CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#EAECE6] shadow-xs flex flex-col justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#7C816C]">
                            TOTAL RESERVASI BULAN INI
                        </span>
                        <div className="mt-2">
                            <span className="text-2xl sm:text-3xl font-black text-[#2D3328]">
                                {totalReservasi}
                            </span>
                            <span className="text-xs font-bold text-[#6E745F] ml-1.5 uppercase">
                                Transaksi
                            </span>
                        </div>
                    </div>

                    <div className="bg-[#2D3328] rounded-2xl p-5 sm:p-6 border border-[#2D3328] shadow-xs text-white flex flex-col justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#DFE2D8]">
                            TOTAL PENGELUARAN BULAN INI
                        </span>
                        <div className="mt-2">
                            <span className="text-2xl sm:text-3xl font-black text-white">
                                Rp {totalPengeluaran.toLocaleString('id-ID')}
                            </span>
                            {totalPengeluaran > 0 && (
                                <span className="text-xs font-medium text-[#DFE2D8] ml-2">
                                    (Transaksi Selesai)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* MONTH SELECTOR PILLS */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                    {months.map((m) => (
                        <button
                            key={m.value}
                            onClick={() => setSelectedMonth(m.value)}
                            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer ${
                                selectedMonth === m.value
                                    ? 'bg-[#2D3328] text-white border-[#2D3328] shadow-xs'
                                    : 'bg-white text-[#6E745F] border-[#EAECE6] hover:border-[#2D3328] hover:text-[#2D3328]'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* HISTORY ITEMS LIST */}
                {loading ? (
                    <div className="text-center py-24 text-xs font-bold uppercase tracking-widest text-[#7C816C] animate-pulse">
                        Memuat riwayat transaksi...
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-[#EAECE6] p-8 space-y-3">
                        <h2 className="text-base font-black uppercase text-[#2D3328]">Tidak Ada Riwayat</h2>
                        <p className="text-xs text-[#6E745F] max-w-sm mx-auto">
                            Belum ada catatan transaksi pada bulan {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item: any) => {
                            const spaceTitle = getSpaceTitle(item);
                            const displayPrice = getItemPrice(item);
                            const displayDate = formatDateDisplay(item.tanggal_reservasi);
                            const jamMulai = item.jam_mulai || '09:00';
                            const rawJamSelesai = item.jam_selesai;
                            const jamSelesai = rawJamSelesai && String(rawJamSelesai).trim() !== '' ? rawJamSelesai : 'Selesai';
                            const durasiText = item.durasi_jam ? ` (${item.durasi_jam} Jam)` : '';

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white p-5 rounded-2xl border border-[#EAECE6] hover:border-[#D0D4C7] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-black text-[#7C816C]">
                                                {item.kode_booking || `BOOK-${item.id}`}
                                            </span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getStatusStyle(item.status)}`}>
                                                {item.status || 'Selesai'}
                                            </span>
                                        </div>

                                        <h3 className="text-sm font-black uppercase text-[#2D3328]">
                                            {spaceTitle}
                                        </h3>

                                        <p className="text-xs text-[#6E745F]">
                                            {displayDate} • {jamMulai} - {jamSelesai}{durasiText}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#EAECE6]">
                                        <div className="text-left sm:text-right">
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">
                                                DIBAYAR
                                            </span>
                                            <span className="text-sm font-black text-[#2D3328]">
                                                Rp {displayPrice}
                                            </span>
                                        </div>

                                        <Link
                                            href={`/member/reservasi/${item.id}`}
                                            className="rounded-full bg-[#EAECE6] text-[#2D3328] hover:bg-[#2D3328] hover:text-white px-4 py-2 text-xs font-bold transition flex items-center gap-1"
                                        >
                                            <span>Lihat Nota</span>
                                            <span>→</span>
                                        </Link>
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