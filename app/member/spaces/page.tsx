'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import api from '@/services/api';
import Navbar from '@/components/Navbar';

function SpacesCatalogContent() {
    const searchParams = useSearchParams();
    const initialType = searchParams.get('tipe') || 'all';
    const initialSearch = searchParams.get('search') || '';

    const [spaces, setSpaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState(initialType);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [spaceTypes, setSpaceTypes] = useState<any[]>([]);

    // Kontrak API no. 12: GET /api/spaces/types (Daftar Tipe Space)
    useEffect(() => {
        const fetchTypes = async () => {
            try {
                const res = await api.get('/api/spaces/types');
                if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
                    setSpaceTypes(res.data.data);
                }
            } catch (error) {
                console.warn('Gagal mengambil types dari API:', error);
            }
        };
        fetchTypes();
    }, []);

    // Helper resolusi URL foto ruangan dari backend API
    const getSpacePhotoUrl = (space: any) => {
        const rawFoto = space.foto;
        const rawUrl = space.foto_url;
        const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'https://learn.smktelkom-mlg.sch.id/coworking').replace(/\/$/, '');

        // 1. Jika nama file gambar ada di database
        if (rawFoto) {
            if (rawFoto.startsWith('http://') || rawFoto.startsWith('https://') || rawFoto.startsWith('data:')) {
                return rawFoto;
            }
            return `${baseUrl}/uploads/spaces/${rawFoto}`;
        }

        // 2. Jika foto_url ada namun format URL-nya perlu disesuaikan dengan endpoint uploads
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

        // 3. Fallback foto estetik sesuai tipe ruangan
        if (space.tipe === 'private_office') {
            return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80';
        }
        if (space.tipe === 'meeting_room') {
            return 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80';
        }
        return 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80';
    };

    // Fallback data jika server sedang offline
    const fallbackSpaces = [
        {
            id: '1',
            nama_space: 'Meeting Room',
            nama_coworking: 'LIDAP Workspace',
            tipe: 'meeting_room',
            kapasitas: 15,
            harga_per_jam: 25000,
            foto_url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
            deskripsi: 'Dilengkapi WiFi, Stop Kontak',
        },
        {
            id: '2',
            nama_space: 'PUNTADEWA',
            nama_coworking: 'Moklet Hub Coworking',
            tipe: 'private_office',
            kapasitas: 12313,
            harga_per_jam: 1231232,
            foto_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
            deskripsi: '12312',
        },
        {
            id: '3',
            nama_space: 'PUNTADEWA',
            nama_coworking: 'Moklet Hub Coworking',
            tipe: 'private_office',
            kapasitas: 50,
            harga_per_jam: 500,
            foto_url: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
            deskripsi: 'Tempat meeting',
        },
        {
            id: '4',
            nama_space: 'Personal Focus Desk',
            nama_coworking: 'LIDAP Workspace',
            tipe: 'desk',
            kapasitas: 1,
            harga_per_jam: 20000,
            foto_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
            deskripsi: 'Meja kerja individual hening dengan koneksi internet cepat dan colokan listrik stabil.',
        },
    ];

    // Fetch data langsung dari API backend (GET /api/spaces)
    useEffect(() => {
        const fetchSpaces = async () => {
            setLoading(true);
            try {
                let url = '/api/spaces';
                const params = new URLSearchParams();
                if (selectedType !== 'all') params.append('tipe', selectedType);
                if (searchQuery.trim()) params.append('search', searchQuery.trim());

                if (params.toString()) url += `?${params.toString()}`;

                const res = await api.get(url);
                if (Array.isArray(res.data?.data)) {
                    setSpaces(res.data.data);
                } else {
                    setSpaces([]);
                }
            } catch (error) {
                console.warn('Gagal mengambil data space dari API:', error);
                setSpaces([]);
            } finally {
                setLoading(false);
            }
        };

        fetchSpaces();
    }, [selectedType, searchQuery]);

    const categories = [
        { id: 'all', label: 'Semua Ruangan' },
        ...(spaceTypes.length > 0
            ? spaceTypes.map((t: any) => ({ id: t.tipe, label: t.label || t.tipe }))
            : [
                { id: 'desk', label: 'Personal Desk' },
                { id: 'meeting_room', label: 'Meeting Room' },
                { id: 'private_office', label: 'Private Office' },
            ]),
    ];

    return (
        <div className="min-h-screen bg-[#F8F8F7] text-[#2D3328] pb-24 md:pb-16 font-sans selection:bg-[#7C816C] selection:text-white">
            <Navbar />

            {/* MAIN CATALOG */}
            <main className="mx-auto w-full max-w-7xl px-5 sm:px-8 pt-8 sm:pt-10 space-y-7">

                {/* HEADER TITLE */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#EAECE6] pb-6">
                    <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#7C816C] bg-[#EAECE6] px-3 py-1 rounded-full inline-block mb-2.5">
                            KETERSEDIAAN SPACE
                        </span>
                        <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#2D3328]">
                            Katalog Ruang Kerja
                        </h1>
                        <p className="text-xs sm:text-sm text-[#6E745F] font-medium mt-1 max-w-xl">
                            Pilih jenis workstation yang sesuai kebutuhan Anda: Personal Desk, Meeting Room, atau Private Office.
                        </p>
                    </div>

                    <div className="text-xs font-bold text-[#7C816C]">
                        Menampilkan <span className="text-[#2D3328] font-black">{spaces.length}</span> ruangan
                    </div>
                </div>

                {/* SEARCH BAR & CATEGORY PILLS (NO ICONS) */}
                <div className="space-y-3.5">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama ruangan, tipe, atau spesifikasi fasilitas..."
                            className="w-full rounded-full border border-[#EAECE6] bg-white py-3.5 pl-6 pr-24 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none shadow-xs transition focus:border-[#2D3328]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-14 text-xs font-bold text-neutral-400 hover:text-black cursor-pointer"
                            >
                                Reset
                            </button>
                        )}
                        <button
                            type="button"
                            className="absolute right-1.5 px-5 py-2 rounded-full bg-[#2D3328] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#3E4538] transition cursor-pointer"
                        >
                            Cari
                        </button>
                    </div>

                    {/* Category Filter Pills (NO EMOJIS) */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedType(cat.id)}
                                className={`whitespace-nowrap rounded-full px-5 py-2 text-xs font-bold transition border cursor-pointer ${
                                    selectedType === cat.id
                                        ? 'bg-[#2D3328] text-white border-[#2D3328] shadow-xs'
                                        : 'bg-white text-[#6E745F] border-[#EAECE6] hover:border-[#2D3328] hover:text-[#2D3328]'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SPACES GRID */}
                {loading ? (
                    <div className="text-center py-24 text-xs font-bold uppercase tracking-widest text-[#7C816C] animate-pulse">
                        Menyiapkan katalog ruangan...
                    </div>
                ) : spaces.length === 0 ? (
                    <div className="text-center py-20 rounded-3xl bg-white border border-[#EAECE6] p-8 space-y-3">
                        <h3 className="text-base font-black uppercase text-[#2D3328]">Ruangan Tidak Ditemukan</h3>
                        <p className="text-xs text-[#6E745F]">Coba gunakan kata kunci pencarian lain atau ubah filter tipe ruangan.</p>
                        <button
                            onClick={() => {
                                setSelectedType('all');
                                setSearchQuery('');
                            }}
                            className="mt-2 rounded-full bg-[#2D3328] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#3E4538] transition cursor-pointer"
                        >
                            Reset Filter
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {spaces.map((space) => {
                            const spaceTitle = space.nama_space || space.nama || 'Ruang Kerja';
                            const coworkingName = space.owner?.nama_coworking || space.coworking_space?.nama || space.nama_coworking || 'SmartSpace Hub';
                            const tipeLabel = space.tipe === 'meeting_room' ? 'Meeting Room' : space.tipe === 'private_office' ? 'Private Office' : 'Personal Desk';
                            const kapasitasCount = space.kapasitas || 1;

                            return (
                                <div
                                    key={space.id}
                                    className="group rounded-3xl bg-white p-4 border border-[#EAECE6] hover:border-[#D0D4C7] hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-[#EBECE7]">
                                            <img
                                                src={getSpacePhotoUrl(space)}
                                                alt={spaceTitle}
                                                className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src =
                                                        space.tipe === 'private_office'
                                                            ? 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=700&q=80'
                                                            : space.tipe === 'meeting_room'
                                                            ? 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=700&q=80'
                                                            : 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=700&q=80';
                                                }}
                                            />

                                            {/* Tipe Badge over Image (Top Left) */}
                                            <span className="absolute top-3 left-3 rounded-full bg-[#2D3328]/85 backdrop-blur-xs text-white px-3 py-1 text-[10px] font-bold">
                                                {tipeLabel}
                                            </span>

                                            {/* Kapasitas Badge over Image (Bottom Right) */}
                                            <div className="absolute bottom-3 right-3 rounded-full bg-white/90 backdrop-blur-xs px-3 py-1 text-[10px] font-semibold text-[#2D3328] shadow-xs flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-[#7C816C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                <span>Kapasitas: {kapasitasCount} Orang</span>
                                            </div>
                                        </div>

                                        <div className="mt-3.5 space-y-1">
                                            <h3 className="text-base font-black text-[#2D3328] tracking-tight group-hover:text-[#7C816C] transition">
                                                {spaceTitle}
                                            </h3>

                                            {/* Coworking Space Name from Database */}
                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6050]">
                                                <svg className="w-3.5 h-3.5 text-[#7C816C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span>{coworkingName}</span>
                                            </div>

                                            <p className="text-xs text-[#6E745F] line-clamp-2 leading-relaxed pt-0.5">
                                                {space.deskripsi || 'Fasilitas kerja lengkap.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-3.5 border-t border-[#EAECE6] flex items-center justify-between">
                                        <div>
                                            <div className="text-[9px] font-black uppercase tracking-wider text-[#7C816C]">
                                                TARIF
                                            </div>
                                            <div className="text-base font-black text-[#2D3328]">
                                                Rp {Number(space.harga_per_jam || 0).toLocaleString('id-ID')}
                                                <span className="text-[11px] font-normal text-[#6E745F]"> / jam</span>
                                            </div>
                                        </div>

                                        <Link
                                            href={`/member/spaces/${space.id}`}
                                            className="inline-flex items-center gap-2 rounded-full bg-[#2D3328] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#3E4538] transition active:scale-95 shadow-xs"
                                        >
                                            <span>Pesan</span>
                                            <span>→</span>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* BOTTOM SPECIFICATION TILES (NO EMOJIS) */}
                <div className="mt-14 pt-8 border-t border-[#EAECE6] grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3.5 rounded-xl bg-white border border-[#EAECE6]">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#7C816C]">Konfirmasi</div>
                        <div className="text-xs font-black text-[#2D3328] mt-0.5">E-Ticket Instan</div>
                        <div className="text-[10px] text-[#6E745F]">QR Code terbit langsung</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white border border-[#EAECE6]">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#7C816C]">Fleksibilitas</div>
                        <div className="text-xs font-black text-[#2D3328] mt-0.5">Bebas Reschedule</div>
                        <div className="text-[10px] text-[#6E745F]">Hingga 2 jam sebelum mulai</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white border border-[#EAECE6]">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#7C816C]">Fasilitas</div>
                        <div className="text-xs font-black text-[#2D3328] mt-0.5">Free Flow Minum</div>
                        <div className="text-[10px] text-[#6E745F]">Espresso & teh artisan</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white border border-[#EAECE6]">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#7C816C]">Konektivitas</div>
                        <div className="text-xs font-black text-[#2D3328] mt-0.5">Garansi WiFi 100M</div>
                        <div className="text-[10px] text-[#6E745F]">Koneksi stabil tanpa putus</div>
                    </div>
                </div>

            </main>
        </div>
    );
}

export default function SpacesCatalogPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#F8F8F7] flex items-center justify-center font-bold text-xs uppercase tracking-widest text-[#7C816C]">
                    Menyiapkan katalog ruangan...
                </div>
            }
        >
            <SpacesCatalogContent />
        </Suspense>
    );
}