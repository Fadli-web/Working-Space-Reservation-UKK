'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/services/api';
import Navbar from '@/components/Navbar';

export default function SpaceDetailBookingPage() {
  const router = useRouter();
  const params = useParams();
  const spaceId = params.id;

  const [space, setSpace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper resolusi URL foto ruangan dari backend API
  const getSpacePhotoUrl = (sp: any) => {
    if (!sp) return 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80';
    const rawFoto = sp.foto;
    const rawUrl = sp.foto_url;
    const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://learn.smktelkom-mlg.sch.id/coworking').replace(/\/$/, '');

    if (rawFoto) {
      if (rawFoto.startsWith('http://') || rawFoto.startsWith('https://') || rawFoto.startsWith('data:')) {
        return rawFoto;
      }
      return `${baseUrl}/uploads/spaces/${rawFoto}`;
    }

    if (rawUrl) {
      if (rawUrl.includes('/uploads/spaces/')) {
        const filename = rawUrl.split('/uploads/spaces/').pop();
        return `${baseUrl}/uploads/spaces/${filename}`;
      }
      if (rawUrl.startsWith('http://')) {
        return rawUrl.replace('http://', 'https://');
      }
      return rawUrl;
    }

    if (sp.tipe === 'private_office') {
      return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80';
    }
    if (sp.tipe === 'meeting_room') {
      return 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80';
    }
    return 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80';
  };

  // Form Booking State
  const getTodayDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [booking, setBooking] = useState({
    tanggal_reservasi: getTodayDate(),
    jam_mulai: '09:00',
    durasi_jam: 3,
    kode_promo: '',
  });

  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [idDiskon, setIdDiskon] = useState<number | null>(null);
  const [promoMessage, setPromoMessage] = useState<string>('');
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  // Ketersediaan Jadwal Real-time (Kontrak API no. 13: GET /api/spaces/availability)
  const [availability, setAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    jamSelesai?: string;
    message?: string;
  }>({
    checking: false,
    available: null,
  });

  // Daftar Promo Aktif (Kontrak API no. 16: GET /api/diskon/active & Wireframe A.4)
  const [activePromos, setActivePromos] = useState<any[]>([]);
  const [ownerPromos, setOwnerPromos] = useState<any[]>([]); // Diskon milik pemilik space
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Payment gateway modal
  const [bookingError, setBookingError] = useState(''); // Error di dalam modal

  // State Payment Gateway Interaktif
  type PaymentMethodType = 'qris' | 'bank' | 'ewallet';
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('qris');
  const [selectedBank, setSelectedBank] = useState<'bca' | 'mandiri' | 'bni' | 'bri'>('bca');
  const [selectedEwallet, setSelectedEwallet] = useState<'gopay' | 'ovo' | 'dana' | 'shopeepay'>('gopay');
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 2500);
    }
  };

  // Fallback mock space sesuai database API
  const fallbackSpaceMap: Record<string, any> = {
    '1': {
      id: 1,
      nama_space: 'Meeting Room',
      nama_coworking: 'LIDAP Workspace',
      tipe: 'meeting_room',
      kapasitas: 15,
      harga_per_jam: 25000,
      rating: 4.9,
      reviews: 48,
      foto_url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80',
      deskripsi:
        'Ruang rapat kedap suara yang nyaman dengan koneksi WiFi kencang, stopkontak pribadi, dan layar presentasi.',
      fasilitas: ['WiFi 100Mbps', 'Whiteboard', 'Stop Kontak', 'AC Ruangan', 'Air Mineral'],
    },
    '2': {
      id: 2,
      nama_space: 'PUNTADEWA',
      nama_coworking: 'Moklet Hub Coworking',
      tipe: 'private_office',
      kapasitas: 12313,
      harga_per_jam: 1231232,
      rating: 4.9,
      reviews: 32,
      foto_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      deskripsi:
        'Ruang kerja private modern lengkap dengan teknologi smart space dan fasilitas lengkap.',
      fasilitas: ['Smart Lock RFID', 'WiFi Fiber High Speed', 'Stop Kontak', 'AC Inverter', 'Pantry'],
    },
    '3': {
      id: 3,
      nama_space: 'PUNTADEWA',
      nama_coworking: 'Moklet Hub Coworking',
      tipe: 'private_office',
      kapasitas: 50,
      harga_per_jam: 500,
      rating: 4.8,
      reviews: 21,
      foto_url: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80',
      deskripsi:
        'Tempat meeting kapasitas besar dengan perlengkapan rapat dan presentasi lengkap.',
      fasilitas: ['Tempat Meeting', 'AC Dingin', 'Stop Kontak', 'Whiteboard', 'WiFi Kencang'],
    },
  };

  // 1. Fetch Detail Space & Promo Aktif
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await api.get(`/api/spaces/${spaceId}`);
        if (res.data?.data) {
          setSpace(res.data.data);
        } else {
          const fb = fallbackSpaceMap[String(spaceId)] || fallbackSpaceMap['1'];
          setSpace(fb);
        }
      } catch (error) {
        console.warn('Gagal mengambil detail dari API, menggunakan mock space:', error);
        const fb = fallbackSpaceMap[String(spaceId)] || fallbackSpaceMap['1'];
        setSpace(fb);
      } finally {
        setLoading(false);
      }

      // Kontrak API no. 16: GET /api/diskon/active (Daftar Diskon Aktif - Global)
      try {
        const diskonRes = await api.get('/api/diskon/active');
        if (Array.isArray(diskonRes.data?.data)) {
          setActivePromos(diskonRes.data.data);
        }
      } catch (diskonErr) {
        console.warn('Gagal memuat diskon global:', diskonErr);
      }

      // Juga muat diskon dari pemilik space (maker-specific) - fallback untuk diskon admin sendiri
      try {
        const ownerDiskonRes = await api.get('/api/diskon/active');
        if (Array.isArray(ownerDiskonRes.data?.data)) {
          setOwnerPromos(ownerDiskonRes.data.data);
        }
      } catch (e) { /* silent */ }
    };

    if (spaceId) fetchInitialData();
  }, [spaceId]);

  // 2. Kontrak API no. 13: GET /api/spaces/availability (Live Cek Jadwal Ruangan)
  useEffect(() => {
    let isMounted = true;
    const checkAvailability = async () => {
      if (!spaceId || !booking.tanggal_reservasi || !booking.jam_mulai || !booking.durasi_jam) return;
      setAvailability((prev) => ({ ...prev, checking: true }));

      try {
        const query = `?id_space=${spaceId}&tanggal=${booking.tanggal_reservasi}&jam_mulai=${booking.jam_mulai}&durasi_jam=${booking.durasi_jam}`;
        const res = await api.get(`/api/spaces/availability${query}`);
        if (isMounted) {
          if (res.data?.data?.available) {
            setAvailability({
              checking: false,
              available: true,
              jamSelesai: res.data.data.jam_selesai,
              message: res.data.message || 'Space tersedia untuk dipesan pada jadwal yang diminta',
            });
          } else {
            setAvailability({
              checking: false,
              available: false,
              message: res.data.message || 'Jadwal telah terisi.',
            });
          }
        }
      } catch (err: any) {
        if (isMounted) {
          // Jika backend mengembalikan 400 space sudah terisi
          const msg = err.response?.data?.message || 'Maaf, space sudah terisi atau dibooking pada jam tersebut!';
          setAvailability({
            checking: false,
            available: false,
            message: msg,
          });
        }
      }
    };

    const timer = setTimeout(checkAvailability, 400);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [spaceId, booking.tanggal_reservasi, booking.jam_mulai, booking.durasi_jam]);

  // Handle Pilih Promo dari Daftar Cepat (Wireframe A.4)
  const handleSelectPromo = (promo: any) => {
    setBooking((prev) => ({ ...prev, kode_promo: promo.nama_diskon }));
    setIdDiskon(promo.id || null);
    const percent = Number(promo.persentase_diskon) || 0;
    setDiscountPercent(percent);
    setPromoMessage(`Promo ${promo.nama_diskon} diterapkan! Hemat ${percent}%.`);
  };

  // Gabungkan semua diskon yang tersedia (global + owner specific)
  const allAvailablePromos = [...activePromos, ...ownerPromos].filter(
    (p, idx, self) => self.findIndex((x) => x.id === p.id) === idx
  );

  // Handle Validasi Promo API (Kontrak API no. 17: POST /api/diskon/check)
  const handleCheckPromo = async () => {
    if (!booking.kode_promo.trim()) return;
    setIsCheckingPromo(true);
    setPromoMessage('');

    // 1. Coba dari daftar promo yang sudah dimuat (termasuk promo admin space)
    const kodeUpper = booking.kode_promo.trim().toUpperCase();
    const localMatch = allAvailablePromos.find(
      (p) => p.nama_diskon?.toUpperCase() === kodeUpper
    );
    if (localMatch) {
      const percent = Number(localMatch.persentase_diskon);
      setDiscountPercent(percent);
      setIdDiskon(localMatch.id);
      setPromoMessage(`Promo ${localMatch.nama_diskon} diterapkan! Hemat ${percent}%.`);
      setIsCheckingPromo(false);
      return;
    }

    // 2. Fallback: hit API /api/diskon/check
    try {
      const res = await api.post('/api/diskon/check', {
        nama_diskon: booking.kode_promo.trim(),
      });

      if (res.data?.data?.persentase_diskon) {
        const percent = Number(res.data.data.persentase_diskon);
        setDiscountPercent(percent);
        setIdDiskon(res.data.data.id || null);
        setPromoMessage(`Kode promo berhasil digunakan! Diskon ${percent}%.`);
      } else {
        setDiscountPercent(0);
        setIdDiskon(null);
        setPromoMessage('Kode promo tidak valid atau sudah berakhir.');
      }
    } catch (err: any) {
      setDiscountPercent(0);
      setIdDiskon(null);
      setPromoMessage(err.response?.data?.message || 'Kode promo tidak valid atau telah berakhir.');
    } finally {
      setIsCheckingPromo(false);
    }
  };

  // Kalkulasi Pembayaran
  const hargaPerJam = Number(space?.harga_per_jam) || 20000;
  const tarifKotor = hargaPerJam * booking.durasi_jam;
  const nominalPotongan = discountPercent > 0 ? Math.round((tarifKotor * discountPercent) / 100) : 0;
  const totalBayar = Math.max(0, tarifKotor - nominalPotongan);

  // Tampilkan modal konfirmasi pembayaran sebelum booking
  const handleOpenPaymentModal = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setShowPaymentModal(true);
  };

  const handleBookingSubmit = async () => {
    setBookingError('');
    setIsSubmitting(true);
    try {
      // Kontrak API UKK no. 19: POST /api/reservasi
      const payload: any = {
        id_space: Number(spaceId),
        tanggal_reservasi: booking.tanggal_reservasi,
        jam_mulai: booking.jam_mulai,
        durasi_jam: Number(booking.durasi_jam),
      };

      if (idDiskon) payload.id_diskon = idDiskon;

      const res = await api.post('/api/reservasi', payload);
      const newId = res.data?.data?.id;
      setShowPaymentModal(false);
      if (newId) {
        router.push(`/member/reservasi/${newId}`);
      } else {
        router.push('/member/reservasi');
      }
    } catch (error: any) {
      // Tampilkan error di dalam modal — jangan tutup modal
      setBookingError(
        error.response?.data?.message ||
          'Gagal membuat pemesanan. Silakan cek kembali jadwal atau hubungi pengelola.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center font-bold text-xs uppercase tracking-widest text-[#7C816C] animate-pulse">
        Menyiapkan detail ruangan...
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-[#F8F8F7] flex flex-col items-center justify-center gap-3 p-4">
        <p className="font-bold text-[#2D3328]">Ruangan tidak ditemukan.</p>
        <Link href="/member/spaces" className="rounded-full bg-[#2D3328] px-5 py-2 text-xs font-bold text-white">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] text-[#2D3328] pb-24 md:pb-16 font-sans selection:bg-[#7C816C] selection:text-white">
      
      {/* HEADER NAVBAR */}
      <Navbar />

      {/* SUB-HEADER BREADCRUMB & BACK ACTION */}
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 pt-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6E745F] hover:text-[#2D3328] transition py-1.5 px-3 rounded-full hover:bg-[#EAECE6] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Kembali</span>
        </button>

        <div className="text-[11px] font-mono text-[#7C816C]">
          Katalog Ruangan / <span className="text-[#2D3328] font-bold">{space?.nama || 'Detail Workstation'}</span>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="mx-auto w-full max-w-7xl px-5 sm:px-8 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-10">
        
        {/* KOLOM KIRI: Informasi & Visual Ruangan */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          
          <div className="relative h-80 sm:h-96 md:h-[420px] w-full overflow-hidden rounded-3xl bg-[#EBECE7] shadow-xs">
            <img
              src={getSpacePhotoUrl(space)}
              alt={space.nama_space || space.nama || 'Detail Ruangan'}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  space.tipe === 'private_office'
                    ? 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80'
                    : space.tipe === 'meeting_room'
                    ? 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1200&q=80'
                    : 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=1200&q=80';
              }}
            />
            <div className="absolute top-5 left-5 rounded-full bg-[#2D3328] text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-wider shadow-xs">
              {space.tipe?.replace('_', ' ')}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 sm:p-8 border border-[#EAECE6] shadow-xs space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#7C816C]">
                {space.tipe === 'meeting_room' ? 'MEETING ROOM' : space.tipe === 'private_office' ? 'PRIVATE OFFICE' : 'PERSONAL DESK'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#2D3328] uppercase tracking-tight mt-1">
                {space.nama || space.nama_space || 'Detail Ruangan'}
              </h1>
              <p className="text-xs sm:text-sm text-[#6E745F] font-medium mt-1">
                Lokasi: {space.owner?.nama_coworking || space.coworking_space?.nama || space.nama_coworking || 'Moklet Hub Coworking Space, Sawojajar, Malang'}
              </p>
            </div>

            {/* Quick Spec Matrix (NO ICONS) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#F4F5F2] p-3.5 border border-[#E8EAE4]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[#7C816C]">
                  Kapasitas
                </span>
                <p className="text-sm sm:text-base font-black text-[#2D3328] mt-0.5">
                  {space.kapasitas} Orang
                </p>
              </div>

              <div className="rounded-2xl bg-[#ECEEE8] p-3.5 border border-[#DFE2D8]">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[#7C816C]">
                  Tarif Sewa
                </span>
                <p className="text-sm sm:text-base font-black text-[#2D3328] mt-0.5">
                  Rp {Number(space.harga_per_jam).toLocaleString('id-ID')}
                  <span className="text-[10px] font-normal text-[#6E745F]"> / jam</span>
                </p>
              </div>

              <div className="rounded-2xl bg-[#F4F5F2] p-3.5 border border-[#E8EAE4] col-span-2 sm:col-span-1">
                <span className="block text-[10px] font-black uppercase tracking-wider text-[#7C816C]">
                  Ulasan Member
                </span>
                <p className="text-sm sm:text-base font-black text-[#2D3328] mt-0.5">
                  Rating {space.rating || 4.9} <span className="text-[11px] font-normal text-[#6E745F]">({space.reviews || 48} ulasan)</span>
                </p>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="pt-4 border-t border-[#EAECE6] space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#2D3328]">
                Deskripsi Ruangan
              </h2>
              <p className="text-xs sm:text-sm text-[#6E745F] leading-relaxed">
                {space.deskripsi}
              </p>
            </div>

            {/* Fasilitas Ruangan (NO CHECK ICONS) */}
            <div className="pt-4 border-t border-[#EAECE6] space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#2D3328]">
                Fasilitas Termasuk
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(space.fasilitas || [
                  'WiFi 100Mbps Stabil',
                  'Kursi Ergonomis Mesh',
                  'Free Flow Kopi & Teh',
                  'AC Ruangan Dingin',
                  'Stopkontak Pribadi',
                ]).map((fas: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-[#F4F5F2] border border-[#E8EAE4] p-3 text-xs font-bold text-[#2D3328]"
                  >
                    <span>{fas}</span>
                    <span className="text-[10px] uppercase font-bold text-[#7C816C]">Tersedia</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* KOLOM KANAN: Form Pemesanan Space (Layar 4 UKK) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <form
            onSubmit={handleOpenPaymentModal}
            className="sticky top-24 rounded-3xl bg-white p-6 sm:p-7 border border-[#EAECE6] shadow-xs space-y-5"
          >
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#7C816C] bg-[#EAECE6] px-2.5 py-0.5 rounded-full inline-block">
                FORMULIR RESERVASI
              </span>
              <h2 className="text-lg font-black uppercase tracking-tight text-[#2D3328] mt-1.5">
                Atur Jadwal Sewa
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                  Tanggal Reservasi
                </label>
                <input
                  type="date"
                  required
                  value={booking.tanggal_reservasi}
                  onChange={(e) => setBooking({ ...booking, tanggal_reservasi: e.target.value })}
                  className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-4 py-2.5 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    required
                    value={booking.jam_mulai}
                    onChange={(e) => setBooking({ ...booking, jam_mulai: e.target.value })}
                    className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-4 py-2.5 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                    Durasi (Jam)
                  </label>
                  <div className="flex items-center rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-2 py-1">
                    <button
                      type="button"
                      onClick={() => setBooking({ ...booking, durasi_jam: Math.max(1, booking.durasi_jam - 1) })}
                      className="h-7 w-7 rounded-full bg-white flex items-center justify-center font-bold text-xs hover:bg-neutral-200 transition"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-black text-xs text-[#2D3328]">
                      {booking.durasi_jam} Jam
                    </span>
                    <button
                      type="button"
                      onClick={() => setBooking({ ...booking, durasi_jam: Math.min(12, booking.durasi_jam + 1) })}
                      className="h-7 w-7 rounded-full bg-white flex items-center justify-center font-bold text-xs hover:bg-neutral-200 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Status Ketersediaan Ruangan (Kontrak API no. 13: GET /api/spaces/availability) */}
              <div className="rounded-2xl p-3 border transition text-xs font-semibold">
                {availability.checking ? (
                  <div className="flex items-center gap-2 text-[#7C816C] animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <span>Memeriksa ketersediaan jadwal...</span>
                  </div>
                ) : availability.available === true ? (
                  <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 -m-3 p-3 rounded-2xl border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                      <span className="font-bold">Jadwal Tersedia!</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      Selesai: {availability.jamSelesai || 'Sesuai Durasi'}
                    </span>
                  </div>
                ) : availability.available === false ? (
                  <div className="flex items-center gap-2 text-rose-700 bg-rose-50 -m-3 p-3 rounded-2xl border border-rose-200">
                    <span className="h-2 w-2 rounded-full bg-rose-600"></span>
                    <span className="font-bold text-[11px]">{availability.message || 'Jadwal telah terisi pada rentang jam ini.'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[#7C816C]">
                    <span className="h-2 w-2 rounded-full bg-[#7C816C]"></span>
                    <span>Pilih tanggal dan jam sewa</span>
                  </div>
                )}
              </div>

              {/* Input Kode Promo Manual (Hanya yang diketahui/diberikan oleh pengelola) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                    Kode Promo / Voucher (Opsional)
                  </label>
                  {booking.kode_promo && (
                    <button
                      type="button"
                      onClick={() => {
                        setBooking({ ...booking, kode_promo: '' });
                        setIdDiskon(null);
                        setDiscountPercent(0);
                        setPromoMessage('');
                      }}
                      className="text-[9px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Reset Promo
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="MASUKKAN KODE PROMO"
                    value={booking.kode_promo}
                    onChange={(e) => setBooking({ ...booking, kode_promo: e.target.value.toUpperCase() })}
                    className="flex-1 rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-4 py-2.5 text-xs font-bold text-[#2D3328] placeholder-[#9AA08F] outline-none focus:border-[#2D3328] transition uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleCheckPromo}
                    disabled={isCheckingPromo || !booking.kode_promo.trim()}
                    className="rounded-full bg-[#EAECE6] hover:bg-[#2D3328] hover:text-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-[#2D3328] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isCheckingPromo ? 'Cek...' : 'Terapkan'}
                  </button>
                </div>
                <p className="mt-1 text-[9px] text-[#9AA08F] font-semibold">
                  Punya kode voucher dari pengelola? Masukkan kode di atas untuk mendapatkan potongan diskon.
                </p>
                {promoMessage && (
                  <p className={`mt-1.5 text-[10px] font-bold ${discountPercent > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {promoMessage}
                  </p>
                )}
              </div>
            </div>

            {/* RINCIAN TAGIHAN */}
            <div className="mt-5 pt-4 border-t border-[#EAECE6] space-y-2">
              <div className="flex justify-between text-xs text-[#6E745F]">
                <span>Tarif Dasar ({booking.durasi_jam} Jam):</span>
                <span>Rp {tarifKotor.toLocaleString('id-ID')}</span>
              </div>
              {nominalPotongan > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-bold">
                  <span>Potongan Diskon ({discountPercent}%):</span>
                  <span>- Rp {nominalPotongan.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="pt-2 border-t border-[#EAECE6] flex items-center justify-between">
                <div>
                  <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#7C816C]">
                    Total Pembayaran
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-[#2D3328]">
                    Rp {totalBayar.toLocaleString('id-ID')}
                  </span>
                </div>
                <span className="rounded-full bg-[#EAECE6] px-3 py-1 text-[10px] font-black text-[#2D3328]">
                  {booking.durasi_jam} Jam Sewa
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[#2D3328] py-3.5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#3E4538] transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Memproses Reservasi...' : 'Lanjutkan Pesanan'}</span>
              {!isSubmitting && <span>→</span>}
            </button>

            <p className="text-center text-[10px] font-bold text-[#7C816C]">
              E-Ticket digital dengan QR Code resmi diterbitkan setelah pesanan dikonfirmasi
            </p>
          </form>
        </div>

      </main>

      {/* ====================== PAYMENT GATEWAY MODAL ====================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 border border-[#EAECE6]">

            {/* Header Sticky */}
            <div className="bg-[#2D3328] text-white px-6 pt-5 pb-4 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-white/10 px-3 py-1 rounded-full">
                  KONFIRMASI PEMBAYARAN
                </span>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                {space?.nama_space}
              </h2>
              <p className="text-[11px] text-white/70 mt-0.5">{space?.nama_coworking || space?.space_owner?.nama_coworking || 'Moklet Hub Coworking'}</p>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

              {/* Rincian Singkat Booking */}
              <div className="bg-[#F8F9F7] rounded-2xl p-3.5 border border-[#F0F1ED] space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs pb-2 border-b border-[#EAECE6]">
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-[#7C816C]">Tanggal Reservasi</span>
                    <span className="font-black text-[#2D3328]">{booking.tanggal_reservasi}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-[#7C816C]">Waktu & Durasi</span>
                    <span className="font-black text-[#2D3328]">{booking.jam_mulai} • {booking.durasi_jam} Jam</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-1">
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-[#7C816C]">Total Tagihan</span>
                    <span className="text-base sm:text-lg font-black text-[#2D3328]">
                      Rp {totalBayar.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {nominalPotongan > 0 && (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      Hemat {discountPercent}% (-Rp {nominalPotongan.toLocaleString('id-ID')})
                    </span>
                  )}
                </div>
              </div>

              {/* Peringatan ketersediaan jadwal jika ada */}
              {availability.available === false && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="font-bold">Jadwal mungkin sudah terisi. Pesanan akan dikirim ke admin untuk verifikasi ketersediaan.</span>
                </div>
              )}

              {/* METODE PEMBAYARAN SELECTOR */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#7C816C]">
                    PILIH METODE PEMBAYARAN
                  </p>
                  <span className="text-[9px] font-bold text-[#9AA08F] uppercase">
                    {selectedMethod === 'qris' ? 'QRIS Standar' : selectedMethod === 'bank' ? 'Virtual Account' : 'Dompet Digital'}
                  </span>
                </div>

                {/* Tab Pilihan Metode */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('qris')}
                    className={`py-2.5 px-2 rounded-xl text-center transition cursor-pointer border ${
                      selectedMethod === 'qris'
                        ? 'bg-[#2D3328] text-white border-[#2D3328] shadow-xs'
                        : 'bg-[#F8F9F7] text-[#6E745F] border-[#EAECE6] hover:border-[#2D3328] hover:text-[#2D3328]'
                    }`}
                  >
                    <span className="block text-[11px] font-black uppercase">QRIS</span>
                    <span className={`block text-[8px] uppercase tracking-wider font-semibold ${selectedMethod === 'qris' ? 'text-white/70' : 'text-[#9AA08F]'}`}>
                      Semua E-Wallet
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('bank')}
                    className={`py-2.5 px-2 rounded-xl text-center transition cursor-pointer border ${
                      selectedMethod === 'bank'
                        ? 'bg-[#2D3328] text-white border-[#2D3328] shadow-xs'
                        : 'bg-[#F8F9F7] text-[#6E745F] border-[#EAECE6] hover:border-[#2D3328] hover:text-[#2D3328]'
                    }`}
                  >
                    <span className="block text-[11px] font-black uppercase">Transfer Bank</span>
                    <span className={`block text-[8px] uppercase tracking-wider font-semibold ${selectedMethod === 'bank' ? 'text-white/70' : 'text-[#9AA08F]'}`}>
                      Virtual Account
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('ewallet')}
                    className={`py-2.5 px-2 rounded-xl text-center transition cursor-pointer border ${
                      selectedMethod === 'ewallet'
                        ? 'bg-[#2D3328] text-white border-[#2D3328] shadow-xs'
                        : 'bg-[#F8F9F7] text-[#6E745F] border-[#EAECE6] hover:border-[#2D3328] hover:text-[#2D3328]'
                    }`}
                  >
                    <span className="block text-[11px] font-black uppercase">E-Wallet</span>
                    <span className={`block text-[8px] uppercase tracking-wider font-semibold ${selectedMethod === 'ewallet' ? 'text-white/70' : 'text-[#9AA08F]'}`}>
                      GoPay, OVO, dll
                    </span>
                  </button>
                </div>
              </div>

              {/* Toast Notifikasi Salin */}
              {copiedLabel && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 text-center animate-in fade-in">
                  {copiedLabel} berhasil disalin ke clipboard!
                </div>
              )}

              {/* KONTEN METODE 1: QRIS */}
              {selectedMethod === 'qris' && (
                <div className="rounded-2xl border border-[#EAECE6] bg-white p-5 space-y-4 animate-in fade-in">
                  <div className="text-center pb-3 border-b border-[#F0F1ED]">
                    <span className="inline-block px-3 py-0.5 bg-[#F0F1ED] text-[9px] font-black tracking-wider uppercase text-[#6E745F] rounded-full mb-1">
                      QRIS STANDAR PEMBAYARAN NASIONAL
                    </span>
                    <h3 className="text-sm font-black text-[#2D3328] uppercase">
                      MOKLET HUB COWORKING SPACE
                    </h3>
                    <p className="text-[10px] text-[#7C816C] font-mono">NMID: ID1020349812739</p>
                  </div>

                  {/* QR Code Canvas */}
                  <div className="flex flex-col items-center justify-center p-4 bg-[#FBFBF9] rounded-2xl border border-[#EAECE6]">
                    <div className="bg-white p-3.5 rounded-xl shadow-xs border border-[#E8EAE4]">
                      <QRCodeSVG
                        value={`00020101021226670016ID.CO.QRIS.WWW01189360091800000000000215ID10203498127390303UMI51440014ID.LINKAJA.WWW021520260921${totalBayar}520459995303360540${totalBayar}5802ID5919MOKLET HUB COWORK6006MALANG61056514162150111RES${Date.now()}6304`}
                        size={175}
                        bgColor="#ffffff"
                        fgColor="#2D3328"
                        level="M"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        SIAP SCAN & BAYAR
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-[#2D3328] mt-1">
                      Rp {totalBayar.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="bg-[#F8F9F7] p-3 rounded-xl border border-[#F0F1ED] space-y-1 text-[10px] text-[#6E745F]">
                    <p className="font-bold text-[#2D3328]">Panduan Pembayaran QRIS:</p>
                    <p>1. Buka aplikasi BCA Mobile, Livin Mandiri, GoPay, OVO, DANA, ShopeePay, atau mobile banking apa pun.</p>
                    <p>2. Pilih menu Bayar / QRIS dan scan kode QR di atas.</p>
                    <p>3. Pastikan nominal tagihan sesuai: <strong>Rp {totalBayar.toLocaleString('id-ID')}</strong>.</p>
                    <p>4. Selesaikan pembayaran, lalu klik tombol Konfirmasi Pesan di bawah.</p>
                  </div>
                </div>
              )}

              {/* KONTEN METODE 2: TRANSFER BANK */}
              {selectedMethod === 'bank' && (
                <div className="rounded-2xl border border-[#EAECE6] bg-white p-5 space-y-4 animate-in fade-in">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-[#7C816C] mb-2">
                      PILIH BANK VIRTUAL ACCOUNT
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'bca', name: 'BCA' },
                        { id: 'mandiri', name: 'Mandiri' },
                        { id: 'bni', name: 'BNI' },
                        { id: 'bri', name: 'BRI' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setSelectedBank(b.id as any)}
                          className={`py-2 px-1 rounded-xl text-center transition cursor-pointer border ${
                            selectedBank === b.id
                              ? 'bg-[#2D3328] text-white border-[#2D3328] font-black shadow-xs'
                              : 'bg-[#F8F9F7] text-[#6E745F] border-[#EAECE6] hover:border-[#2D3328] font-bold'
                          }`}
                        >
                          <span className="text-[10px] block">{b.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detail Virtual Account */}
                  <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#EAECE6] space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#7C816C]">
                          Nomor Virtual Account {selectedBank.toUpperCase()}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Verifikasi Otomatis
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base sm:text-lg font-mono font-black text-[#2D3328] tracking-wider">
                          {selectedBank === 'bca' && '8277 0823 4234 7890'}
                          {selectedBank === 'mandiri' && '8890 0823 4234 7890'}
                          {selectedBank === 'bni' && '9880 0823 4234 7890'}
                          {selectedBank === 'bri' && '1280 0823 4234 7890'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const va =
                              selectedBank === 'bca'
                                ? '8277082342347890'
                                : selectedBank === 'mandiri'
                                ? '8890082342347890'
                                : selectedBank === 'bni'
                                ? '9880082342347890'
                                : '1280082342347890';
                            handleCopy(va, `Nomor VA ${selectedBank.toUpperCase()}`);
                          }}
                          className="px-3 py-1 rounded-full bg-[#EAECE6] hover:bg-[#2D3328] hover:text-white text-[10px] font-bold uppercase tracking-wider transition cursor-pointer text-[#2D3328]"
                        >
                          Salin
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#EAECE6] flex justify-between items-center text-xs">
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-[#7C816C]">Atas Nama Rekening</span>
                        <span className="font-bold text-[#2D3328]">Moklet Hub Coworking Space</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-[#7C816C]">Total Tagihan</span>
                        <span className="font-black text-[#2D3328]">Rp {totalBayar.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F8F9F7] p-3 rounded-xl border border-[#F0F1ED] space-y-1 text-[10px] text-[#6E745F]">
                    <p className="font-bold text-[#2D3328]">Petunjuk Transfer Virtual Account:</p>
                    <p>1. Buka aplikasi m-Banking atau ATM bank pilihan Anda.</p>
                    <p>2. Pilih menu Transfer / Bayar &gt; Virtual Account.</p>
                    <p>3. Masukkan nomor Virtual Account di atas dan periksa nominal tagihan.</p>
                    <p>4. Setelah transaksi berhasil, klik tombol Konfirmasi Pesan di bawah.</p>
                  </div>
                </div>
              )}

              {/* KONTEN METODE 3: E-WALLET */}
              {selectedMethod === 'ewallet' && (
                <div className="rounded-2xl border border-[#EAECE6] bg-white p-5 space-y-4 animate-in fade-in">
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-[#7C816C] mb-2">
                      PILIH APLIKASI E-WALLET
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'gopay', name: 'GoPay' },
                        { id: 'ovo', name: 'OVO' },
                        { id: 'dana', name: 'DANA' },
                        { id: 'shopeepay', name: 'ShopeePay' },
                      ].map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => setSelectedEwallet(w.id as any)}
                          className={`py-2 px-1 rounded-xl text-center transition cursor-pointer border ${
                            selectedEwallet === w.id
                              ? 'bg-[#2D3328] text-white border-[#2D3328] font-black shadow-xs'
                              : 'bg-[#F8F9F7] text-[#6E745F] border-[#EAECE6] hover:border-[#2D3328] font-bold'
                          }`}
                        >
                          <span className="text-[10px] block">{w.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detail E-Wallet */}
                  <div className="bg-[#FBFBF9] p-4 rounded-2xl border border-[#EAECE6] space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#7C816C]">
                          Nomor Akun {selectedEwallet.toUpperCase()}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Instan
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-base sm:text-lg font-mono font-black text-[#2D3328] tracking-wider">
                          0823-4234-7890
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy('082342347890', `Nomor ${selectedEwallet.toUpperCase()}`)}
                          className="px-3 py-1 rounded-full bg-[#EAECE6] hover:bg-[#2D3328] hover:text-white text-[10px] font-bold uppercase tracking-wider transition cursor-pointer text-[#2D3328]"
                        >
                          Salin
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#EAECE6] flex justify-between items-center text-xs">
                      <div>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-[#7C816C]">Nama Akun</span>
                        <span className="font-bold text-[#2D3328]">SmartSpace Moklet Hub</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-[#7C816C]">Total Tagihan</span>
                        <span className="font-black text-[#2D3328]">Rp {totalBayar.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F8F9F7] p-3 rounded-xl border border-[#F0F1ED] space-y-1 text-[10px] text-[#6E745F]">
                    <p className="font-bold text-[#2D3328]">Petunjuk Pembayaran E-Wallet:</p>
                    <p>1. Buka aplikasi {selectedEwallet.toUpperCase()} di ponsel Anda.</p>
                    <p>2. Pilih menu Kirim / Transfer ke nomor telepon <strong>0823-4234-7890</strong>.</p>
                    <p>3. Masukkan nominal tagihan: <strong>Rp {totalBayar.toLocaleString('id-ID')}</strong>.</p>
                    <p>4. Setelah transfer selesai, tekan tombol Konfirmasi Pesan di bawah.</p>
                  </div>
                </div>
              )}

            </div>

            {/* Sticky Action Footer */}
            <div className="px-6 py-4 bg-white border-t border-[#EAECE6] shrink-0 space-y-2">
              {/* Error booking jika terjadi */}
              {bookingError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-800">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-bold">{bookingError}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setBookingError(''); }}
                  className="flex-1 py-3 rounded-full border border-[#EAECE6] text-xs font-bold text-[#6E745F] hover:bg-[#F4F5F2] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleBookingSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-full bg-[#2D3328] text-white text-xs font-black uppercase tracking-wider hover:bg-black transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? 'Memproses Reservasi...' : 'Konfirmasi Pesan'}
                </button>
              </div>

              <p className="text-center text-[9px] text-[#9AA08F] font-bold">
                E-Ticket digital diterbitkan otomatis setelah konfirmasi pemesanan.
              </p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}