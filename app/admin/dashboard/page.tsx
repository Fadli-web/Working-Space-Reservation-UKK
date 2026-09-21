'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authcontext';
import api from '@/services/api';
import Navbar from '@/components/Navbar';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [report, setReport] = useState<any>(null);
  const [dailyData, setDailyData] = useState<{ day: number; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Default ke bulan & tahun saat ini
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const fetchReport = async () => {
    setLoading(true);
    try {
      // 1. Memanggil endpoint rekapitulasi laporan bulanan admin (Kontrak API no. 46)
      const res = await api.get(`/api/admin/reports/monthly?month=${selectedMonth}&year=${selectedYear}`);
      const raw = res.data.data;

      // Normalisasi struktur API backend → format yang dipakai komponen
      const normalized = {
        // Ringkasan utama
        total_transaksi: raw.ringkasan?.total_reservasi ?? 0,
        realisasi_pendapatan_bersih: raw.ringkasan?.realisasi_pendapatan ?? 0,
        estimasi_pendapatan_kotor: raw.ringkasan?.estimasi_pendapatan_total ?? 0,
        total_jam_terpakai: (() => {
          // Hitung dari per-tipe: desk + meeting_room + private_office
          const tipe = raw.pendapatan_per_tipe_space || {};
          return (tipe.desk?.count ?? 0) + (tipe.meeting_room?.count ?? 0) + (tipe.private_office?.count ?? 0);
        })(),
        total_potongan_diskon: 0,

        // Distribusi per tipe
        rincian_per_tipe_space: (() => {
          const tipe = raw.pendapatan_per_tipe_space || {};
          const map: Record<string, string> = {
            desk: 'Personal Desk',
            meeting_room: 'Meeting Room',
            private_office: 'Private Office',
          };
          return Object.entries(tipe)
            .filter(([, v]: any) => v.count > 0)
            .map(([key, v]: any) => ({
              label: map[key] || key,
              total_booking: v.count,
              total_jam: v.count, // durasi jam tidak tersedia per tipe
              total_pendapatan: v.total_income,
            }));
        })(),
      };

      setReport(normalized);

      // 2. Tren harian dari field tren_harian di response
      const trenHarian: { tanggal: string; total_reservations: number; total_income: number }[] =
        raw.tren_harian || [];
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const map: Record<number, number> = {};
      for (let d = 1; d <= daysInMonth; d++) {
        map[d] = 0;
      }
      trenHarian.forEach((item) => {
        const dayNum = new Date(item.tanggal).getDate();
        if (map[dayNum] !== undefined) {
          map[dayNum] += Number(item.total_income || 0);
        }
      });
      setDailyData(Object.entries(map).map(([k, v]) => ({ day: Number(k), total: v })));

    } catch (error) {
      console.error('Gagal mengambil data laporan:', error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin_space') {
      fetchReport();
    }
  }, [user, selectedMonth, selectedYear]);

  // Proteksi Rute (Hanya untuk Admin)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#737373]">
        MEMUAT PUSAT KENDALI...
      </div>
    );
  }

  if (!user || user.role !== 'admin_space') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-xs font-bold uppercase tracking-widest text-[#2D3328]">
          AKSES DITOLAK. KHUSUS PENGELOLA SPACE.
        </p>
        <Link
          href="/Auth/login"
          className="px-6 py-2.5 bg-[#2D3328] text-white text-xs font-bold uppercase tracking-widest rounded-full"
        >
          KEMBALI KE LOGIN
        </Link>
      </div>
    );
  }

  const months = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#2D3328] font-sans pb-24 md:pb-16 selection:bg-[#7C816C] selection:text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-12">
        {/* HEADER PUSAT KENDALI */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#EAECE6] pb-8">
          <div>
            <span className="inline-block px-3 py-1 bg-[#F0F1ED] text-[10px] font-bold tracking-widest uppercase rounded-md text-[#6E745F]">
              DASHBOARD PENGELOLA
            </span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[#2D3328] mt-3">
              RINGKASAN PENDAPATAN
            </h1>
            <p className="text-xs text-[#6E745F] font-medium mt-1">
              Pantau performa reservasi dan estimasi pendapatan coworking space Anda.
            </p>
          </div>

          {/* KONTROL FILTER BULAN & TAHUN */}
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-[#EAECE6] text-xs font-bold uppercase tracking-widest text-[#2D3328] py-3 px-4 rounded-xl outline-none focus:border-[#7C816C] transition appearance-none cursor-pointer shadow-sm"
            >
              {months.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white border border-[#EAECE6] text-xs font-bold uppercase tracking-widest text-[#2D3328] py-3 px-4 rounded-xl outline-none focus:border-[#7C816C] transition appearance-none cursor-pointer shadow-sm"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-bold uppercase tracking-widest text-[#737373] animate-pulse">
            SINKRONISASI DATA...
          </div>
        ) : !report ? (
          <div className="py-20 text-center bg-white border border-[#EAECE6] rounded-[2rem]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D3328]">DATA TIDAK TERSEDIA</h3>
            <p className="text-xs text-[#6E745F] mt-2">Gagal memuat rekapitulasi data dari server.</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* KARTU STATISTIK UTAMA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Kartu Pendapatan Bersih */}
              <div className="bg-[#2D3328] text-white p-8 rounded-[2rem] shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full pointer-events-none"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#A3A897] mb-4 block relative z-10">
                  REALISASI PENDAPATAN BERSIH
                </span>
                <p className="text-3xl lg:text-4xl font-black tracking-tight relative z-10">
                  Rp {(report.realisasi_pendapatan_bersih || 0).toLocaleString('id-ID')}
                </p>
              </div>

              {/* Kartu Transaksi */}
              <div className="bg-white p-8 rounded-[2rem] border border-[#EAECE6] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-4 block">
                  TOTAL TRANSAKSI
                </span>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black tracking-tight text-[#2D3328]">
                    {report.total_transaksi || 0}
                  </p>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6E745F] mb-1">RESERVASI</span>
                </div>
              </div>

              {/* Kartu Jam Terpakai */}
              <div className="bg-white p-8 rounded-[2rem] border border-[#EAECE6] shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-4 block">
                  TOTAL DURASI SEWA
                </span>
                <div className="flex items-end gap-2">
                  <p className="text-4xl font-black tracking-tight text-[#2D3328]">
                    {report.total_jam_terpakai || 0}
                  </p>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6E745F] mb-1">JAM</span>
                </div>
              </div>
            </div>

            {/* GRAFIK PENDAPATAN PER HARI (Sesuai Wireframe B.9 Halaman 42 UKK) */}
            <div className="bg-white rounded-[2rem] border border-[#EAECE6] p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7C816C]">
                    TREN HARIAN
                  </span>
                  <h3 className="text-sm font-black uppercase tracking-tight text-[#2D3328]">
                    Pendapatan Per Hari ({months[selectedMonth - 1]} {selectedYear})
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-[#6E745F]">
                  Total: Rp {(report.realisasi_pendapatan_bersih || 0).toLocaleString('id-ID')}
                </span>
              </div>

              {/* Responsive SVG Sparkline Chart */}
              <div className="w-full overflow-hidden">
                {(() => {
                  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                  // Build daily array
                  const dataPoints = dailyData.length > 0 
                    ? dailyData 
                    : Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: 0 }));

                  const maxVal = Math.max(...dataPoints.map((d) => d.total), 100000);
                  const svgWidth = 700;
                  const svgHeight = 160;
                  const paddingX = 30;
                  const paddingY = 25;
                  const chartW = svgWidth - paddingX * 2;
                  const chartH = svgHeight - paddingY * 2;

                  const points = dataPoints.map((d) => {
                    const x = paddingX + ((d.day - 1) / (daysInMonth - 1)) * chartW;
                    const y = svgHeight - paddingY - (d.total / maxVal) * chartH;
                    return { ...d, x, y };
                  });

                  const pathD = points.reduce((acc, p, i) => {
                    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, '');

                  const fillD = `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

                  return (
                    <div className="relative">
                      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 sm:h-52 overflow-visible">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2D3328" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#2D3328" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Grid Lines */}
                        {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                          const y = paddingY + ratio * chartH;
                          return (
                            <line
                              key={idx}
                              x1={paddingX}
                              y1={y}
                              x2={svgWidth - paddingX}
                              y2={y}
                              stroke="#F0F1ED"
                              strokeDasharray="4 4"
                              strokeWidth="1"
                            />
                          );
                        })}

                        {/* Area Fill */}
                        <path d={fillD} fill="url(#chartGradient)" />

                        {/* Line Stroke */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#2D3328"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Interactive Data Points */}
                        {points.filter((_, idx) => idx % 4 === 0 || idx === points.length - 1).map((p, idx) => (
                          <g key={idx} className="group cursor-pointer">
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="4.5"
                              fill="#2D3328"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              className="transition-transform group-hover:scale-150"
                            />
                            {p.total > 0 && (
                              <text
                                x={p.x}
                                y={p.y - 10}
                                textAnchor="middle"
                                className="text-[9px] font-bold fill-[#2D3328]"
                              >
                                Rp {Math.round(p.total / 1000)}k
                              </text>
                            )}
                          </g>
                        ))}
                      </svg>

                      {/* X-Axis Date Marks (Sesuai Wireframe: 1, 8, 15, 22, 29) */}
                      <div className="flex justify-between px-7 pt-2 text-[10px] font-bold text-[#7C816C] border-t border-[#F0F1ED]">
                        {[1, 8, 15, 22, Math.min(29, daysInMonth)].map((dayNum) => (
                          <span key={dayNum}>Tgl {dayNum}</span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* RINCIAN PER TIPE SPACE & STATISTIK TAMBAHAN */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Distribusi Tipe Ruangan */}
              <div className="lg:col-span-2 bg-white rounded-[2rem] border border-[#EAECE6] p-8 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#2D3328] mb-6">
                  DISTRIBUSI PENDAPATAN PER JENIS SPACE
                </h3>

                {(!report.rincian_per_tipe_space || report.rincian_per_tipe_space.length === 0) ? (
                  <div className="py-10 text-center text-xs font-bold uppercase text-[#A3A897]">
                    BELUM ADA DATA DISTRIBUSI
                  </div>
                ) : (
                  <div className="space-y-5">
                    {report.rincian_per_tipe_space.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F8F9F7] rounded-2xl border border-[#F0F1ED]">
                        <div>
                          <p className="text-sm font-black text-[#2D3328] uppercase tracking-wide">
                            {item.label}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mt-1">
                            {item.total_booking} Booking • {item.total_jam} Jam
                          </p>
                        </div>
                        <div className="mt-3 sm:mt-0 text-right">
                          <p className="text-base font-black text-[#2D3328]">
                            Rp {item.total_pendapatan.toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail Estimasi Kotor & Diskon */}
              <div className="bg-[#F8F9F7] rounded-[2rem] border border-[#EAECE6] p-8 shadow-sm flex flex-col gap-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#2D3328]">
                  RINCIAN KALKULASI
                </h3>

                <div className="flex-1 bg-white p-5 rounded-2xl border border-[#F0F1ED]">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#6E745F] block mb-1">
                    ESTIMASI PENDAPATAN KOTOR
                  </span>
                  <p className="text-lg font-black text-[#2D3328]">
                    Rp {(report.estimasi_pendapatan_kotor || 0).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="flex-1 bg-white p-5 rounded-2xl border border-[#F0F1ED]">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-rose-500 block mb-1">
                    TOTAL POTONGAN DISKON
                  </span>
                  <p className="text-lg font-black text-rose-600">
                    - Rp {(report.total_potongan_diskon || 0).toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="mt-2 pt-6 border-t border-[#D5D8CF]">
                  <Link
                    href="/admin/reservasi"
                    className="w-full block text-center bg-[#EAECE6] text-[#2D3328] py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#D5D8CF] transition"
                  >
                    KELOLA RESERVASI
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}