'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/services/api';
import { cleanMetadataText } from '@/services/auth.services';

export default function ETicketPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await api.get(`/api/reservasi/${ticketId}/e-ticket`);
        if (res.data?.data) {
          setTicket(res.data.data);
        } else {
          throw new Error('Data tidak lengkap');
        }
      } catch (error: any) {
        try {
          const fallbackRes = await api.get(`/api/reservasi/${ticketId}`);
          if (fallbackRes.data?.data) {
            setTicket(fallbackRes.data.data);
            return;
          }
        } catch {}
        setErrorMsg(error?.response?.data?.message || 'Gagal memuat E-Ticket.');
      } finally {
        setLoading(false);
      }
    };
    if (ticketId) fetchTicket();
  }, [ticketId]);

  const formatDateDisplay = (dateStr: any) => {
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

  const formatNumber = (val: any) => {
    if (val === null || val === undefined || isNaN(Number(val))) return '0';
    return Number(val).toLocaleString('id-ID');
  };

  // Hitung jam selesai dari jam mulai + durasi (contoh: 16:00 + 6 jam = 22:00)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#7C816C] animate-pulse">
        Menyiapkan E-Ticket & Rincian Transaksi...
      </div>
    );
  }

  if (!ticket || errorMsg) {
    return (
      <div className="min-h-screen bg-[#F8F8F7] flex flex-col items-center justify-center gap-3 p-4">
        <p className="font-bold text-[#2D3328]">{errorMsg || 'Tiket tidak ditemukan.'}</p>
        <Link href="/member/reservasi" className="rounded-full bg-[#2D3328] px-5 py-2 text-xs font-bold text-white">
          Kembali ke Histori
        </Link>
      </div>
    );
  }

  // ─── Ekstraksi data lengkap dari API e-ticket atau fallback detail ────────────────
  const kodeBooking = ticket.booking_code || ticket.kode_booking || `RES-${ticketId}`;
  const statusLabel = ticket.status_label || ticket.status_reservasi || ticket.status || 'Aktif';
  const qrValue    = ticket.qr_code_data || ticket.qr_code_payload || kodeBooking;

  const detail = ticket.detail_reservasi?.[0];
  const spaceObj = ticket.space || detail?.space;
  const namaRuangan = spaceObj?.nama || spaceObj?.nama_space || 'Workstation Space';
  const tipeRuangan = spaceObj?.tipe ? String(spaceObj.tipe).toUpperCase() : 'DESK';
  const namaCoworking = ticket.coworking_space?.nama || ticket.owner?.nama_coworking || ticket.nama_coworking || 'SmartSpace Coworking Hub';

  const tanggal  = ticket.jadwal?.tanggal || ticket.tanggal_reservasi;
  const jamMulai = ticket.jadwal?.jam_mulai || ticket.jam_mulai || '09:00';
  const durasiText = ticket.jadwal?.durasi || `${ticket.rincian_biaya?.durasi_jam || ticket.durasi_jam || 1} Jam`;
  const durasiJam  = Number(ticket.rincian_biaya?.durasi_jam || ticket.durasi_jam || parseInt(durasiText) || 1);
  const jamSelesai = hitungJamSelesai(jamMulai, durasiJam);

  // Rincian biaya
  const biaya = ticket.rincian_biaya || {};
  const hargaPerJam = Number(biaya.harga_per_jam || spaceObj?.harga_per_jam || 0);
  const subtotal = Number(biaya.subtotal || (hargaPerJam > 0 ? hargaPerJam * durasiJam : 0));
  
  const diskonObj = detail?.diskon || ticket.diskon;
  const diskonNama = biaya.diskon_nama || diskonObj?.nama_diskon || null;
  const diskonPersen = biaya.diskon_persen || (diskonObj?.persentase_diskon ? `${diskonObj.persentase_diskon}%` : null);
  
  const totalBayar = Number(
    biaya.total_pembayaran || 
    detail?.total_harga || 
    biaya.total_bayar || 
    ticket.total_bayar || 
    (diskonPersen ? subtotal - (subtotal * parseInt(diskonPersen) / 100) : subtotal)
  );

  const potonganNominal = subtotal > totalBayar ? subtotal - totalBayar : 0;
  const isBatal = ticket.status === 'dibatalkan' || statusLabel?.toLowerCase().includes('batal');

  const getTicketStatusBadgeStyle = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('selesai')) return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    if (s.includes('batal')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (s.includes('aktif')) return 'bg-[#2D3328] text-white border-[#2D3328]';
    if (s.includes('setuju')) return 'bg-blue-50 text-blue-700 border-blue-300';
    return 'bg-amber-50 text-amber-800 border-amber-300';
  };

  return (
    <div className="min-h-screen bg-[#F8F8F7] text-[#2D3328] py-10 px-5 flex flex-col items-center font-sans selection:bg-[#7C816C] selection:text-white print-ticket-page">

      {/* Top Bar */}
      <div className="w-full max-w-md mb-6 flex items-center justify-between print-hidden">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAECE6] text-[#2D3328] hover:bg-[#2D3328] hover:text-white transition active:scale-95 cursor-pointer"
          title="Kembali"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-6 w-6 rounded-lg overflow-hidden flex items-center justify-center bg-white border border-[#EAECE6] shadow-2xs group-hover:scale-105 transition">
            <Image src="/icon.jpg" alt="SmartSpace" width={24} height={24} className="h-full w-full object-cover" />
          </div>
          <span className="text-xs font-black uppercase tracking-tight text-[#2D3328]">SMARTSPACE PASS</span>
        </Link>
      </div>

      {/* KARTU E-TICKET */}
      <div className="w-full max-w-md rounded-3xl bg-white border border-[#EAECE6] shadow-lg overflow-hidden relative print-ticket-card">

        {/* Top Accent Strip */}
        <div className={`h-2.5 w-full ${isBatal ? 'bg-rose-500' : 'bg-[#2D3328]'}`}></div>

        {/* Ticket Perforation Holes */}
        <div className="absolute top-[280px] -left-3.5 w-7 h-7 rounded-full bg-[#F8F8F7] border-r border-[#EAECE6]"></div>
        <div className="absolute top-[280px] -right-3.5 w-7 h-7 rounded-full bg-[#F8F8F7] border-l border-[#EAECE6]"></div>

        {/* Header Tiket */}
        <div className="p-7 pb-5 text-center">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#7C816C] bg-[#EAECE6] px-3 py-1 rounded-full inline-block mb-2">
            OFFICIAL DIGITAL PASS • {tipeRuangan}
          </span>
          <h1 className="text-xl font-black uppercase text-[#2D3328] tracking-tight">
            {namaRuangan}
          </h1>
          <p className="text-xs font-semibold text-[#6E745F] mt-1">{namaCoworking}</p>
        </div>

        {/* QR Code */}
        <div className="px-7 py-6 flex flex-col items-center justify-center bg-[#F4F5F2] border-t border-b border-dashed border-[#DFE2D8]">
          <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-[#E8EAE4] mb-3">
            <QRCodeSVG
              value={qrValue}
              size={170}
              bgColor="#ffffff"
              fgColor="#2D3328"
              level="Q"
            />
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#7C816C] text-center max-w-[240px]">
            Scan kode QR ini pada scanner pintu atau resepsionis saat check-in
          </p>
        </div>

        {/* Detail Jadwal & Reservasi */}
        <div className="p-7 bg-white space-y-4">
          <div className="grid grid-cols-2 gap-y-4 gap-x-3">
            <div>
              <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">Kode Booking</span>
              <p className="text-sm font-black text-[#2D3328] mt-0.5 font-mono">{kodeBooking}</p>
            </div>
            <div>
              <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">Status Tiket</span>
              <div className="mt-1">
                <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${getTicketStatusBadgeStyle(statusLabel)}`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            <div className="col-span-2 bg-[#F8F9F7] p-3.5 rounded-2xl border border-[#F0F1ED]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">Tanggal Sewa</span>
                  <p className="text-xs font-black text-[#2D3328] mt-0.5">
                    {formatDateDisplay(tanggal)}
                  </p>
                </div>
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">Waktu & Durasi</span>
                  <p className="text-xs font-black text-[#2D3328] mt-0.5">
                    {jamMulai} – {jamSelesai} <span className="text-[#7C816C] font-semibold">({durasiJam} Jam)</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-2 pt-1 border-t border-[#EAECE6]">
              <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C]">Nama Member & Instansi</span>
              <p className="text-sm font-black text-[#2D3328] mt-0.5">
                {ticket.member?.nama || ticket.member?.nama_member || '-'}
              </p>
              <p className="text-xs font-semibold text-[#6E745F]">
                {cleanMetadataText(ticket.member?.instansi) || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* RINCIAN PEMBAYARAN LENGKAP DENGAN DISKON */}
        <div className="p-7 bg-[#F4F5F2] border-t border-[#EAECE6] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#7C816C]">
              Rincian Pembayaran & Transaksi
            </span>
            <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
              isBatal
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-[#EAECE6] text-[#2D3328] border-[#DFE2D8]'
            }`}>
              {isBatal ? 'Dibatalkan' : 'Terverifikasi Lunas'}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Tarif dasar per jam x durasi */}
            <div className="flex justify-between text-[#6E745F]">
              <span>Tarif Sewa Ruangan ({durasiJam} Jam × Rp {formatNumber(hargaPerJam)})</span>
              <span className="font-bold text-[#2D3328]">Rp {formatNumber(subtotal)}</span>
            </div>

            {/* Potongan diskon promo */}
            {potonganNominal > 0 ? (
              <div className="flex justify-between text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <div>
                  <span className="block font-bold">
                    Diskon Promo {diskonNama || 'Spesial'}
                    {diskonPersen ? ` (${diskonPersen})` : ''}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    Hemat potongan diskon dari harga normal
                  </span>
                </div>
                <span className="font-black text-sm text-emerald-800">
                  – Rp {formatNumber(potonganNominal)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between text-[#8F9485]">
                <span>Potongan Diskon Promo</span>
                <span>Rp 0 (Harga Normal)</span>
              </div>
            )}

            <div className="flex justify-between text-[#6E745F]">
              <span>Fasilitas & Layanan (Wi-Fi, Listrik, Minuman)</span>
              <span className="font-bold text-[#2D3328]">Termasuk</span>
            </div>

            <div className="pt-2.5 border-t border-[#DFE2D8] flex justify-between items-baseline">
              <div>
                <span className="font-black text-xs uppercase tracking-wider text-[#2D3328] block">Total Tagihan</span>
                <span className="text-[10px] text-[#8F9485]">
                  {potonganNominal > 0 ? `Subtotal Rp ${formatNumber(subtotal)} – Diskon Rp ${formatNumber(potonganNominal)}` : 'Sesuai tarif durasi pemesanan'}
                </span>
              </div>
              <span className="font-black text-lg text-[#2D3328]">Rp {formatNumber(totalBayar)}</span>
            </div>
          </div>
        </div>

        {/* Footer Banner */}
        <div className={`p-5 sm:p-6 flex items-center justify-between text-white ${isBatal ? 'bg-rose-700' : 'bg-[#2D3328]'}`}>
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider block opacity-70">Total Pembayaran</span>
            <span className="text-xs font-bold block mt-0.5 opacity-80">
              Status: {isBatal ? 'Dibatalkan' : statusLabel}
            </span>
          </div>
          <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Rp {formatNumber(totalBayar)}
          </span>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3 print-hidden">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-white border border-[#EAECE6] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#2D3328] hover:bg-[#EAECE6] transition cursor-pointer shadow-xs"
        >
          Cetak E-Ticket
        </button>
        <Link
          href="/member/reservasi"
          className="rounded-full bg-[#2D3328] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3E4538] transition shadow-xs flex items-center gap-1.5"
        >
          <span>Daftar Reservasi Saya</span>
          <span>→</span>
        </Link>
      </div>

    </div>
  );
}