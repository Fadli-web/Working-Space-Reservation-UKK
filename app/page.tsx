'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  const router = useRouter();

  // State pencarian & filter
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterModalOpen, setFilterModalOpen] = useState<boolean>(false);
  const [qrModalOpen, setQrModalOpen] = useState<boolean>(false);
  const [orderModalOpen, setOrderModalOpen] = useState<boolean>(false);
  const [savedSpaces, setSavedSpaces] = useState<string[]>(['space-1']);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);

  // Filter form
  const [selectedRating, setSelectedRating] = useState<number | null>(4);
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>('$$');
  const [durationHours, setDurationHours] = useState<number>(3);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'WiFi 100Mbps',
    'Stopkontak',
  ]);

  const toggleSave = (id: string) => {
    if (savedSpaces.includes(id)) {
      setSavedSpaces(savedSpaces.filter((s) => s !== id));
    } else {
      setSavedSpaces([...savedSpaces, id]);
    }
  };

  const toggleAmenity = (item: string) => {
    if (selectedAmenities.includes(item)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== item));
    } else {
      setSelectedAmenities([...selectedAmenities, item]);
    }
  };

  // Spaces Catalog Data
  const spaces = [
    {
      id: '1',
      code: 'LIDAP-01',
      title: 'Meeting Room - LIDAP Workspace',
      type: 'meeting_room',
      typeLabel: 'Meeting Room',
      rating: 4.9,
      reviews: 48,
      capacity: '15 Orang',
      price: 25000,
      badge: 'POPULER',
      image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=700&q=80',
      description: 'Ruang rapat kedap suara lengkap dengan WiFi kencang, stopkontak pribadi, dan layar presentasi.',
    },
    {
      id: '2',
      code: 'MOKLET-01',
      title: 'PUNTADEWA - Moklet Hub Coworking',
      type: 'private_office',
      typeLabel: 'Private Office',
      rating: 4.9,
      reviews: 32,
      capacity: '12313 Orang',
      price: 1231232,
      badge: 'TERLARIS',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80',
      description: 'Ruang kerja privat modern dengan teknologi smart space dan fasilitas lengkap.',
    },
    {
      id: '3',
      code: 'MOKLET-02',
      title: 'PUNTADEWA - Moklet Hub Coworking',
      type: 'private_office',
      typeLabel: 'Private Office',
      rating: 4.8,
      reviews: 21,
      capacity: '50 Orang',
      price: 500,
      badge: 'BARU',
      image: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=700&q=80',
      description: 'Tempat meeting kapasitas besar dengan perlengkapan rapat dan presentasi lengkap.',
    },
    {
      id: '4',
      code: 'LIDAP-02',
      title: 'Personal Focus Desk - LIDAP Workspace',
      type: 'desk',
      typeLabel: 'Personal Desk',
      rating: 4.7,
      reviews: 19,
      capacity: '1 Orang',
      price: 20000,
      badge: 'HEMAT',
      image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=700&q=80',
      description: 'Bilik pod kedap suara untuk sepasang rekan kerja atau podcast & call tanpa gangguan.',
    },
    {
      id: '5',
      code: 'MOKLET-03',
      title: 'Agora Townhall & Event Hall',
      type: 'event_space',
      typeLabel: 'Event Space',
      rating: 4.9,
      reviews: 54,
      capacity: '40 Orang',
      price: 450000,
      badge: 'PREMIUM',
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=700&q=80',
      description: 'Aula serbaguna dengan panggung proyektor 4K dan sound system untuk workshop & meetup.',
    },
  ];

  const filteredSpaces = spaces.filter((item) => {
    const matchType = selectedCategory === 'all' || item.type === selectedCategory;
    const matchQuery =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchQuery;
  });

  return (
    <div className="min-h-screen bg-[#F8F8F7] text-[#1E211A] font-sans selection:bg-[#2D3328] selection:text-white">

      {/* ==================== TOP NAVIGATION & MOBILE SIDEBAR ==================== */}
      <Navbar />

      {/* ==================== MAIN PAGE CONTAINER ==================== */}
      <main className="mx-auto max-w-7xl px-5 md:px-10 pt-6 space-y-12">

        {/* ==================== HERO SECTION (Persis Desain Banner Besar AeroStep) ==================== */}
        <section className="relative overflow-hidden rounded-[2.5rem] bg-[#EAECE6] border border-[#DFE2DA] p-7 sm:p-12 transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left Content */}
            <div className="lg:col-span-7 space-y-5 z-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-black/5 px-4 py-1 text-[11px] font-black uppercase tracking-wider text-[#474C3E]">
                PREMIUM WORKSPACE COLLECTION
              </span>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-[#1E211A] leading-[1.08]">
                RUANG KERJA UNTUK RITME, KENYAMANAN DAN FOKUS MAKSIMAL
              </h1>

              <p className="text-xs sm:text-sm md:text-base font-medium text-[#4D5344] leading-relaxed max-w-xl">
                Teknologi pintar, kursi ergonomis, dan privasi penuh untuk produktivitas tim dan individu di setiap jam kerja. Pilih workstation ideal untuk ritme Anda.
              </p>

              {/* Dual Hero Buttons matching AeroStep */}
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <Link
                  href="/member/spaces"
                  className="rounded-full bg-[#2D3328] px-8 py-3.5 text-xs sm:text-sm font-black text-white hover:bg-black transition active:scale-95 shadow-md inline-flex items-center gap-2"
                >
                  <span>Jelajahi Katalog</span>
                  <span>→</span>
                </Link>

                <button
                  onClick={() => {
                    const el = document.getElementById('featured-grid');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="rounded-full bg-white/90 border border-black/10 px-6 py-3.5 text-xs sm:text-sm font-bold text-[#2D3328] hover:bg-white transition active:scale-95"
                >
                  Hit Ruangan Populer
                </button>
              </div>

              {/* Social Proof / Clients Badge */}
              <div className="pt-6 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                    alt="User 1"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                    alt="User 2"
                  />
                  <img
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover"
                    src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80"
                    alt="User 3"
                  />
                </div>
                <div>
                  <span className="block text-xs font-black text-[#1E211A] leading-tight">
                    10.000+ Member Terdaftar
                  </span>
                  <span className="text-[11px] font-bold text-[#6E745F]">
                    Rating 4.9 Kepuasan Member
                  </span>
                </div>
              </div>
            </div>

            {/* Right Hero Image with Floating Feature Badges */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md h-80 sm:h-[400px] rounded-[2rem] overflow-hidden shadow-lg border border-white/60">
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80"
                  alt="Modern Coworking Space People"
                  className="w-full h-full object-cover"
                />

                {/* Overlaid Badges */}
                <div className="absolute top-4 right-4 rounded-2xl bg-white/90 backdrop-blur-md p-3 border border-white/80 shadow-md">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#2D3328] block leading-tight">
                      WiFi 100 Mbps
                    </span>
                    <span className="text-[9px] font-medium text-neutral-500">
                      Dedicated Fiber LAN
                    </span>
                  </div>
                </div>

                <div className="absolute top-20 right-4 rounded-2xl bg-white/90 backdrop-blur-md p-3 border border-white/80 shadow-md">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#2D3328] block leading-tight">
                      Ergonomic Seats
                    </span>
                    <span className="text-[9px] font-medium text-neutral-500">
                      Herman Miller Style
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 rounded-2xl bg-white/90 backdrop-blur-md p-3 border border-white/80 shadow-md">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#2D3328] block leading-tight">
                      RFID & QR Check-in
                    </span>
                    <span className="text-[9px] font-medium text-neutral-500">
                      Verifikasi Instan 24/7
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ==================== SEARCH BAR & CATEGORY PILLS ==================== */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3.5">

            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari model meja, meeting room, private studio..."
                className="w-full rounded-full border border-[#E6E8E2] bg-white py-3.5 pl-12 pr-12 text-xs sm:text-sm font-semibold text-[#1E211A] placeholder-neutral-400 outline-none transition focus:border-[#2D3328] shadow-xs"
              />
              <button
                type="button"
                onClick={() => setFilterModalOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-[#2D3328] text-white flex items-center justify-center hover:bg-black transition cursor-pointer"
                title="Filter Ruangan"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none no-scrollbar">
              {[
                { id: 'all', label: 'Semua Ruangan' },
                { id: 'desk', label: 'Personal Desk' },
                { id: 'meeting_room', label: 'Meeting Room' },
                { id: 'private_office', label: 'Private Office' },
                { id: 'event_space', label: 'Event Hall' },
              ].map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all border whitespace-nowrap cursor-pointer flex items-center ${active
                      ? 'bg-[#2D3328] text-white border-[#2D3328] shadow-sm'
                      : 'bg-white text-[#555A4C] border-[#E6E8E2] hover:border-neutral-400'
                      }`}
                  >
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

          </div>
        </section>

        {/* ==================== HIT RUANGAN POPULER (Persis Section ХИТЫ ПРОДАЖ) ==================== */}
        <section id="featured-grid" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1E211A]">
              HIT RUANGAN POPULER
            </h2>
            <Link
              href="/member/spaces"
              className="text-xs font-bold text-[#555A4C] hover:text-[#1E211A] transition flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
            {filteredSpaces.map((item) => {
              const isSaved = savedSpaces.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="group rounded-3xl bg-white p-4 border border-[#E6E8E2] shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Image Area */}
                    <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-[#F2F3EF]">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                      />

                      {/* Badge Top Left */}
                      <span className="absolute top-2.5 left-2.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#2D3328] shadow-xs">
                        {item.badge}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-3.5 space-y-1">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-neutral-400">
                        {item.code}
                      </span>
                      <h3 className="text-sm font-black text-[#1E211A] line-clamp-1 group-hover:text-[#6E745F] transition">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-neutral-500 font-medium">
                        {item.capacity} Orang
                      </p>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-4 pt-3 border-t border-[#F2F3EF] flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-[#1E211A] block leading-none">
                        Rp {item.price.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[10px] font-medium text-neutral-400">/ jam</span>
                    </div>

                    <Link
                      href={`/member/spaces/${item.id}`}
                      className="h-8 w-8 rounded-full bg-[#EAECE6] group-hover:bg-[#2D3328] text-[#2D3328] group-hover:text-white flex items-center justify-center transition shadow-xs"
                      title="Pesan Meja"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================== 4 CATEGORY LIFESTYLE BANNERS (Persis 4 Card di Referensi) ==================== */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Card 1: PERSONAL DESK */}
          <div className="relative overflow-hidden rounded-3xl bg-[#ECEEE8] p-6 sm:p-8 flex items-center justify-between border border-[#E0E3DB] group">
            <div className="max-w-[55%] space-y-2.5 z-10">
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-[#1E211A] tracking-tight">
                PERSONAL DESK
              </h3>
              <p className="text-xs text-[#555A4C] leading-relaxed">
                Meja kerja fokus individual, hening, kursi ergonomis, dan free refill kopi barista.
              </p>
              <Link
                href="/member/spaces?tipe=desk"
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#2D3328] group-hover:underline pt-1"
              >
                <span>Lihat Ruangan</span>
                <span>→</span>
              </Link>
            </div>
            <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-md -mr-2">
              <img
                src="https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=400&q=80"
                alt="Personal Desk"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          </div>

          {/* Card 2: MEETING ROOM */}
          <div className="relative overflow-hidden rounded-3xl bg-[#ECEEE8] p-6 sm:p-8 flex items-center justify-between border border-[#E0E3DB] group">
            <div className="max-w-[55%] space-y-2.5 z-10">
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-[#1E211A] tracking-tight">
                MEETING ROOM
              </h3>
              <p className="text-xs text-[#555A4C] leading-relaxed">
                Ruang rapat kedap suara 8-12 orang dengan Smart TV 55", soundbar & whiteboard.
              </p>
              <Link
                href="/member/spaces?tipe=meeting_room"
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#2D3328] group-hover:underline pt-1"
              >
                <span>Lihat Ruangan</span>
                <span>→</span>
              </Link>
            </div>
            <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-md -mr-2">
              <img
                src="https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=400&q=80"
                alt="Meeting Room"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          </div>

          {/* Card 3: PRIVATE OFFICE */}
          <div className="relative overflow-hidden rounded-3xl bg-[#ECEEE8] p-6 sm:p-8 flex items-center justify-between border border-[#E0E3DB] group">
            <div className="max-w-[55%] space-y-2.5 z-10">
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-[#1E211A] tracking-tight">
                PRIVATE OFFICE
              </h3>
              <p className="text-xs text-[#555A4C] leading-relaxed">
                Studio kantor eksklusif dengan privasi penuh, smart lock RFID, dan pantry privat.
              </p>
              <Link
                href="/member/spaces?tipe=private_office"
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#2D3328] group-hover:underline pt-1"
              >
                <span>Lihat Ruangan</span>
                <span>→</span>
              </Link>
            </div>
            <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-md -mr-2">
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80"
                alt="Private Office"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          </div>

          {/* Card 4: EVENT SPACE */}
          <div className="relative overflow-hidden rounded-3xl bg-[#ECEEE8] p-6 sm:p-8 flex items-center justify-between border border-[#E0E3DB] group">
            <div className="max-w-[55%] space-y-2.5 z-10">
              <h3 className="text-2xl sm:text-3xl font-black uppercase text-[#1E211A] tracking-tight">
                EVENT SPACE
              </h3>
              <p className="text-xs text-[#555A4C] leading-relaxed">
                Aula seminar, tech workshop, dan networking berkapasitas hingga 50 peserta.
              </p>
              <Link
                href="/member/spaces?tipe=event_space"
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#2D3328] group-hover:underline pt-1"
              >
                <span>Lihat Ruangan</span>
                <span>→</span>
              </Link>
            </div>
            <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-md -mr-2">
              <img
                src="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400&q=80"
                alt="Event Space"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          </div>

        </section>

        {/* ==================== 6 TEKNOLOGI & FASILITAS KERJA (Persis 6 Kotak Ikon di Referensi) ==================== */}
        <section id="tech-features" className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1E211A]">
            TEKNOLOGI & FASILITAS UNTUK PRODUKTIVITAS ANDA
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {[
              {
                title: 'FIBER 100MBPS',
                desc: 'Koneksi ultra-cepat Wi-Fi 6 & dedicated LAN tanpa lag.',
              },
              {
                title: 'ERGONOMICS',
                desc: 'Kursi lumbar support dan meja hidrolik dapat disesuaikan.',
              },
              {
                title: 'SOUNDPROOF',
                desc: 'Peredam akustik ruangan hening optimal untuk panggilan suara.',
              },
              {
                title: 'FREE PANTRY',
                desc: 'Refill kopi espresso, teh artisan & air mineral sepuasnya.',
              },
              {
                title: 'QR ACCESS',
                desc: 'Akses masuk pintu & meja instan via QR e-ticket smartphone.',
              },
              {
                title: 'AIR FILTER HEPA',
                desc: 'Sirkulasi udara bersih sejuk dan tanaman hias menenangkan.',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-4 border border-[#E6E8E2] text-center space-y-1.5 shadow-xs hover:border-[#2D3328] transition"
              >
                <h4 className="text-[11px] font-black uppercase text-[#1E211A] tracking-wider">
                  {f.title}
                </h4>
                <p className="text-[10px] text-neutral-500 leading-snug">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== VIP CLUB MEMBERSHIP CARD BANNER (Persis Banner Kartu di Referensi) ==================== */}
        <section className="rounded-[2.5rem] bg-[#EAECE6] border border-[#DFE2DA] p-6 sm:p-9 shadow-xs">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">

            {/* Visual Kartu Metallic Olive AeroStep */}
            <div className="w-full lg:w-72 h-44 rounded-2xl bg-gradient-to-tr from-[#2D3328] to-[#454B3B] p-5 text-white shadow-xl flex flex-col justify-between flex-shrink-0 relative overflow-hidden border border-white/20">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#EAECE6]/70">
                    VIP PASS
                  </span>
                  <p className="text-base font-black tracking-wider uppercase mt-0.5">
                    SmartSpace
                  </p>
                </div>
                <span className="text-xs font-black text-[#EAECE6]">CLUB</span>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[9px] text-white/50 block">MEMBER ID</span>
                  <span className="font-mono text-xs font-black text-white">#VIP-9942</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-white/80">
                  <span>••••</span>
                  <span>4821</span>
                </div>
              </div>

              {/* Shimmer line */}
              <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
            </div>

            {/* Middle Benefit Texts */}
            <div className="flex-1 space-y-3 text-center lg:text-left">
              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1E211A]">
                Bergabung dengan SmartSpace Club
              </h3>
              <p className="text-xs sm:text-sm text-[#555A4C] leading-relaxed max-w-xl">
                Dapatkan diskon otomatis 20% setiap reservasi, prioritas booking ruang meeting, cashback point, dan akses fasilitas workstation lengkap.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="text-left">
                  <span className="text-xs font-black text-[#2D3328] block">Diskon 20%</span>
                  <span className="text-[10px] text-neutral-500">Otomatis tiap booking</span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-black text-[#2D3328] block">Prioritas</span>
                  <span className="text-[10px] text-neutral-500">Reservasi meja favorit</span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-black text-[#2D3328] block">Free Drink</span>
                  <span className="text-[10px] text-neutral-500">Spesial menu barista</span>
                </div>
                <div className="text-left">
                  <span className="text-xs font-black text-[#2D3328] block">E-Pass</span>
                  <span className="text-[10px] text-neutral-500">Check-in tanpa antre</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <Link
              href="/Auth/register"
              className="rounded-full bg-[#2D3328] px-8 py-4 text-xs sm:text-sm font-black text-white hover:bg-black transition active:scale-95 shadow-md flex-shrink-0 cursor-pointer"
            >
              Daftar Member VIP
            </Link>

          </div>
        </section>

        {/* ==================== 4 TRUST BADGES (Persis di Bawah Kartu di Referensi) ==================== */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-y border-[#E6E8E2]">
          <div className="flex items-center gap-3">
            <div>
              <h5 className="text-xs font-black text-[#1E211A]">Konfirmasi Instan</h5>
              <p className="text-[10px] text-neutral-500">E-Ticket diterbitkan langsung</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <h5 className="text-xs font-black text-[#1E211A]">Bebas Reschedule</h5>
              <p className="text-[10px] text-neutral-500">Ubah jadwal tanpa penalti</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <h5 className="text-xs font-black text-[#1E211A]">Jaminan Meja Tersedia</h5>
              <p className="text-[10px] text-neutral-500">Meja terkunci atas nama Anda</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <h5 className="text-xs font-black text-[#1E211A]">Dukungan 24/7</h5>
              <p className="text-[10px] text-neutral-500">Respon bantuan cepat</p>
            </div>
          </div>
        </section>

      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="mt-16 bg-white border-t border-[#E6E8E2] pt-12 pb-16">
        <div className="mx-auto max-w-7xl px-5 md:px-10 grid grid-cols-1 md:grid-cols-4 gap-8">

          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden shadow-xs bg-white border border-[#EAECE6]">
                <Image
                  src="/icon.jpg"
                  alt="SmartSpace Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-base font-black tracking-wider uppercase text-[#1E211A]">
                SmartSpace
              </span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Ruang kerja fleksibel modern untuk profesional, startup, dan mahasiswa dengan koneksi cepat dan fasilitas lengkap.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase text-[#1E211A] tracking-wider mb-3">
              Katalog Ruangan
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-neutral-500">
              <li><Link href="/member/spaces?tipe=desk" className="hover:text-black">Personal Desk Flexi</Link></li>
              <li><Link href="/member/spaces?tipe=meeting_room" className="hover:text-black">Creative Meeting Room</Link></li>
              <li><Link href="/member/spaces?tipe=private_office" className="hover:text-black">Executive Office Suite</Link></li>
              <li><Link href="/member/spaces?tipe=event_space" className="hover:text-black">Workshop & Townhall</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase text-[#1E211A] tracking-wider mb-3">
              Bantuan & Panduan
            </h4>
            <ul className="space-y-2 text-xs font-semibold text-neutral-500">
              <li><button onClick={() => setQrModalOpen(true)} className="hover:text-black cursor-pointer">Cara Check-in QR Code</button></li>
              <li><Link href="/member/reservasi" className="hover:text-black">Lihat Tiket Saya</Link></li>
              <li><Link href="/Auth/registeradmin" className="hover:text-black">Daftarkan Space Anda</Link></li>
              <li><a href="#" className="hover:text-black">Syarat & Ketentuan</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase text-[#1E211A] tracking-wider mb-3">
              Lokasi & Kontak
            </h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Jl. Danau Ranau No. 1, Sawojajar, Malang, Jawa Timur
            </p>
            <p className="text-xs font-bold text-[#2D3328] mt-2">
              +62 812-3456-7890
            </p>
            <p className="text-xs text-neutral-500">
              Buka Setiap Hari: 08:00 - 22:00
            </p>
          </div>

        </div>

        <div className="mx-auto max-w-7xl px-5 md:px-10 mt-10 pt-6 border-t border-[#F2F3EF] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-400">
          <p>© 2026 SmartSpace. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Kebijakan Privasi</a>
            <a href="#" className="hover:underline">Syarat Penggunaan</a>
          </div>
        </div>
      </footer>

      {/* ==================== MODAL: SCAN QR CODE ==================== */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[2.5rem] bg-white p-7 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setQrModalOpen(false);
                  setScanSuccess(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 font-bold transition"
              >
                ✕
              </button>
              <h3 className="text-base font-black uppercase tracking-wider text-[#1E211A]">
                Scan QR Code
              </h3>
              <div className="w-8" />
            </div>

            <div className="relative mx-auto w-60 h-60 flex items-center justify-center bg-[#F2F3EF] rounded-3xl border border-[#DFE2DA] overflow-hidden">
              <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-[#2D3328] rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-[#2D3328] rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-[#2D3328] rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-[#2D3328] rounded-br-lg" />
              <div className="absolute left-6 right-6 h-0.5 bg-[#6E745F] shadow-[0_0_10px_#6E745F] animate-scan pointer-events-none z-10" />

              <svg className="w-32 h-32 text-[#2D3328]" viewBox="0 0 100 100" fill="currentColor">
                <path d="M10 10h30v30h-30z M16 16v18h18v-18z M22 22h6v6h-6z" />
                <path d="M60 10h30v30h-30z M66 16v18h18v-18z M72 22h6v6h-6z" />
                <path d="M10 60h30v30h-30z M16 66v18h18v-18z M22 72h6v6h-6z" />
                <rect x="46" y="12" width="6" height="6" />
                <rect x="46" y="24" width="6" height="6" />
                <rect x="46" y="36" width="6" height="6" />
                <rect x="12" y="46" width="6" height="6" />
                <rect x="24" y="46" width="6" height="6" />
                <rect x="36" y="46" width="6" height="6" />
                <rect x="60" y="48" width="8" height="8" />
                <rect x="74" y="48" width="6" height="6" />
                <rect x="86" y="48" width="6" height="6" />
                <rect x="48" y="62" width="8" height="8" />
                <rect x="62" y="62" width="6" height="6" />
                <rect x="76" y="62" width="10" height="6" />
                <rect x="48" y="76" width="10" height="6" />
                <rect x="64" y="76" width="8" height="8" />
                <rect x="78" y="76" width="8" height="8" />
              </svg>
            </div>

            <div className="text-center space-y-2">
              {scanSuccess ? (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-700">
                  Check-in Berhasil! Akses workstation telah aktif.
                </div>
              ) : (
                <p className="text-xs text-neutral-500 font-medium">
                  Arahkan kamera ke QR Code di meja untuk verifikasi check-in
                </p>
              )}
            </div>

            <button
              onClick={() => setScanSuccess(true)}
              className="w-full rounded-full bg-[#2D3328] py-3.5 text-xs font-black text-white hover:bg-black transition active:scale-95 cursor-pointer"
            >
              {scanSuccess ? 'Selesai' : 'Simulasi Scan QR'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODAL: FILTER SEARCH ==================== */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] bg-white p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6E8E2] pb-3">
              <h3 className="text-lg font-black uppercase tracking-wider text-[#1E211A]">
                Filter Ruangan
              </h3>
              <button
                onClick={() => setFilterModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Rating */}
            <div>
              <label className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider">
                Rating Minimal
              </label>
              <div className="mt-2 flex items-center justify-between gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = selectedRating === star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(active ? null : star)}
                      className={`flex-1 rounded-2xl py-2 text-xs font-bold transition flex items-center justify-center gap-1 border ${active
                        ? 'bg-[#2D3328] text-white border-[#2D3328]'
                        : 'bg-white text-neutral-700 border-[#E6E8E2]'
                        }`}
                    >
                      <span>{star}</span>
                      <span className="text-[10px]">Bintang</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Tier */}
            <div>
              <label className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider">
                Kisaran Tarif
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {['$', '$$', '$$$'].map((tier) => {
                  const active = selectedPriceTier === tier;
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedPriceTier(tier)}
                      className={`rounded-2xl py-2.5 text-xs font-bold transition border ${active
                        ? 'bg-[#2D3328] text-white border-[#2D3328]'
                        : 'bg-white text-neutral-700 border-[#E6E8E2]'
                        }`}
                    >
                      {tier}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider">
                  Durasi Penggunaan
                </label>
                <span className="text-xs font-black text-[#1E211A]">
                  {durationHours} Jam
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="mt-2 w-full accent-[#2D3328] cursor-pointer"
              />
            </div>

            {/* Amenities */}
            <div>
              <label className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider">
                Fasilitas Ruangan
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  'WiFi 100Mbps',
                  'Stopkontak',
                  'AC Dingin',
                  'Smart TV',
                  'Refill Kopi',
                  'Whiteboard',
                ].map((item) => {
                  const active = selectedAmenities.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAmenity(item)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition border ${active
                        ? 'bg-[#2D3328] text-white border-[#2D3328]'
                        : 'bg-white text-neutral-600 border-[#E6E8E2]'
                        }`}
                    >
                      {item} {active && '✓'}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFilterModalOpen(false)}
              className="w-full rounded-full bg-[#2D3328] py-3.5 text-xs font-black text-white hover:bg-black transition shadow-md active:scale-95 cursor-pointer"
            >
              Terapkan Filter ({filteredSpaces.length} Hasil)
            </button>
          </div>
        </div>
      )}

      {/* ==================== MODAL: MY ORDER TICKET ==================== */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] bg-white p-7 shadow-2xl space-y-5">




            <div className="flex gap-2">
              <Link
                href="/member/reservasi/1"
                className="flex-1 rounded-full bg-[#2D3328] py-3 text-xs font-black text-white hover:bg-black transition active:scale-95 text-center"
              >
                Buka E-Ticket Lengkap
              </Link>
              <button
                onClick={() => setOrderModalOpen(false)}
                className="rounded-full border border-[#E6E8E2] px-5 py-3 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}