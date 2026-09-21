'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/authcontext';
import { getPhotoUrl } from '@/services/auth.services';

export default function Navbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [imageError, setImageError] = useState(false);

    // State avatar
    const [adminAvatar, setAdminAvatar] = useState<string | null>(null);
    const [memberAvatar, setMemberAvatar] = useState<string | null>(null);

    const isMember = user?.role === 'member';
    const isAdmin = user?.role === 'admin_space';
    const isLoggedIn = Boolean(user);

    // Sinkronisasi avatar Admin
    useEffect(() => {
        if (!user || user.role !== 'admin_space') {
            setAdminAvatar(null);
            return;
        }

        const loadAdminAvatar = () => {
            if (typeof window !== 'undefined' && user?.username) {
                const override = localStorage.getItem(`admin_avatar_override_${user.username.toLowerCase()}`);
                setAdminAvatar(override || user.space_owner?.foto || null);
            }
        };

        loadAdminAvatar();
        window.addEventListener('admin_avatar_updated', loadAdminAvatar);
        return () => {
            window.removeEventListener('admin_avatar_updated', loadAdminAvatar);
        };
    }, [user]);

    // Sinkronisasi avatar Member
    useEffect(() => {
        if (!user || user.role !== 'member') {
            setMemberAvatar(null);
            return;
        }

        const loadMemberAvatar = () => {
            if (typeof window !== 'undefined' && user?.username) {
                const override = localStorage.getItem(`member_avatar_override_${user.username.toLowerCase()}`);
                setMemberAvatar(override || user.member?.foto || null);
            }
        };

        loadMemberAvatar();
        window.addEventListener('member_avatar_updated', loadMemberAvatar);
        window.addEventListener('profile_updated', loadMemberAvatar);
        return () => {
            window.removeEventListener('member_avatar_updated', loadMemberAvatar);
            window.removeEventListener('profile_updated', loadMemberAvatar);
        };
    }, [user]);

    // Tutup sidebar otomatis setiap kali rute URL berpindah
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    // Kunci scroll body saat mobile drawer aktif
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSidebarOpen(false);
            }
        };

        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [sidebarOpen]);

    const displayName = isMember
        ? (user?.member?.nama_member || user?.username || 'Member')
        : isAdmin
            ? (user?.space_owner?.nama_pemilik || user?.username || 'Admin Space')
            : (user?.username || 'Pengguna');

    const userInitial = displayName.charAt(0).toUpperCase();

    const memberPhotoUrl = getPhotoUrl(memberAvatar || user?.member?.foto);
    const adminPhotoUrl = getPhotoUrl(adminAvatar || user?.space_owner?.foto);
    const userAvatarUrl = isMember ? memberPhotoUrl : (isAdmin ? adminPhotoUrl : null);

    // Reset status error gambar setiap kali avatar berubah
    useEffect(() => {
        setImageError(false);
    }, [userAvatarUrl, user?.member?.foto, user?.space_owner?.foto, adminAvatar, memberAvatar]);

    return (
        <>
            {/* TOP HEADER BAR */}
            <header className="sticky top-0 z-40 bg-[#F8F8F7]/95 backdrop-blur-md border-b border-[#EAECE6] transition-all">
                <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 py-3.5 flex items-center justify-between">

                    {/* BRAND LOGO */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className="h-8 w-8 rounded-xl overflow-hidden shadow-2xs group-hover:scale-105 transition flex items-center justify-center bg-white border border-[#EAECE6]">
                                <Image
                                    src="/icon.jpg"
                                    alt="SmartSpace Logo"
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                    priority
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm sm:text-base font-black tracking-tight text-[#2D3328] leading-none">
                                    SmartSpace
                                </span>
                                <span className="text-[7.5px] font-bold tracking-[0.22em] text-[#7C816C] uppercase">
                                    COWORKING HUB
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* DESKTOP NAVIGATION */}
                    <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#6E745F]">
                        {isMember ? (
                            <>
                                <Link
                                    href="/member/spaces"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname.startsWith('/member/spaces') ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Katalog Ruangan
                                </Link>
                                <Link
                                    href="/member/reservasi"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/member/reservasi' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Status Pemesanan
                                </Link>
                                <Link
                                    href="/member/histori"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/member/histori' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Histori Bulanan
                                </Link>
                            </>
                        ) : isAdmin ? (
                            <>
                                <Link
                                    href="/admin/dashboard"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/admin/dashboard' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Pusat Kendali
                                </Link>
                                <Link
                                    href="/admin/reservasi"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/admin/reservasi' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Reservasi
                                </Link>
                                <Link
                                    href="/admin/spaces"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/admin/spaces' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Ruangan
                                </Link>
                                <Link
                                    href="/admin/diskon"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/admin/diskon' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Diskon
                                </Link>
                                <Link
                                    href="/admin/members"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/admin/members' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Member
                                </Link>
                                <Link
                                    href="/admin/profile"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/admin/profile' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Profil
                                </Link>
                                <Link
                                    href="/member/spaces"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname.startsWith('/member/spaces') ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Pratinjau
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname === '/' ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Beranda
                                </Link>
                                <Link
                                    href="/member/spaces"
                                    prefetch={false}
                                    className={`transition py-1 ${pathname.startsWith('/member/spaces') ? 'text-[#2D3328] font-bold border-b-2 border-[#2D3328]' : 'hover:text-[#2D3328]'}`}
                                >
                                    Katalog Ruangan
                                </Link>
                                <Link href="/#kategori" prefetch={false} className="hover:text-[#2D3328] transition py-1">
                                    Kategori
                                </Link>
                                <Link href="/#teknologi" prefetch={false} className="hover:text-[#2D3328] transition py-1">
                                    Fasilitas
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* DESKTOP ACTIONS */}
                    <div className="hidden md:flex items-center gap-3">
                        {isLoggedIn ? (
                            <>
                                <Link
                                    href={isMember ? "/member/profile" : "/admin/profile"}
                                    className={`flex items-center gap-2.5 bg-white border px-3 py-1.5 rounded-full shadow-2xs hover:border-[#2D3328] hover:bg-[#F4F5F2] transition cursor-pointer group ${pathname === (isMember ? '/member/profile' : '/admin/profile') ? 'border-[#2D3328] ring-1 ring-[#2D3328]' : 'border-[#EAECE6]'}`}
                                    title={isMember ? "Lihat Profil Member" : "Profil Coworking Space"}
                                >
                                    <div className="w-7 h-7 rounded-full bg-[#2D3328] text-white flex items-center justify-center text-[11px] font-bold group-hover:scale-105 transition overflow-hidden">
                                        {!imageError && userAvatarUrl ? (
                                            <img
                                                src={userAvatarUrl}
                                                alt={displayName}
                                                className="w-full h-full object-cover"
                                                onError={() => setImageError(true)}
                                            />
                                        ) : (
                                            <span>{userInitial}</span>
                                        )}
                                    </div>
                                    <div className="text-left leading-tight pr-1">
                                        <span className="block text-[11px] font-bold text-[#2D3328] truncate max-w-[120px] group-hover:text-black">
                                            {displayName}
                                        </span>
                                        <span className="text-[8.5px] font-mono font-semibold text-[#7C816C] uppercase">
                                            {isAdmin ? 'ADMIN SPACE' : 'MEMBER'}
                                        </span>
                                    </div>
                                </Link>

                                <button
                                    onClick={logout}
                                    className="rounded-full bg-[#EAECE6] text-[#2D3328] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-transparent px-4 py-2 text-xs font-bold transition active:scale-95 cursor-pointer"
                                    title="Keluar dari akun"
                                >
                                    Keluar
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/Auth/login"
                                    className="text-xs font-bold text-[#6E745F] hover:text-[#2D3328] px-3 py-2 transition"
                                >
                                    Masuk
                                </Link>
                                <Link
                                    href="/Auth/register"
                                    className="rounded-full bg-[#2D3328] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[#3E4538] transition active:scale-95 shadow-xs"
                                >
                                    Daftar Member
                                </Link>
                            </>
                        )}
                    </div>

                    {/* MOBILE TOGGLE BUTTON */}
                    <div className="flex md:hidden items-center gap-2">
                        {isLoggedIn && isMember && (
                            <Link
                                href="/member/reservasi"
                                className="rounded-full bg-[#2D3328] text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider active:scale-95 transition"
                            >
                                Pesanan
                            </Link>
                        )}

                        {isLoggedIn && isAdmin && (
                            <Link
                                href="/admin/dashboard"
                                className="rounded-full bg-[#2D3328] text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider active:scale-95 transition"
                            >
                                Admin
                            </Link>
                        )}

                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAECE6] text-[#2D3328] hover:bg-[#2D3328] hover:text-white transition active:scale-90 cursor-pointer"
                            aria-label="Buka Menu Navigasi"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>

                </div>
            </header>

            {/* MOBILE DRAWER */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />

                    <div className="relative ml-auto w-[85%] max-w-sm h-full bg-[#F8F8F7] border-l border-[#EAECE6] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div>
                            <div className="flex items-center justify-between pb-5 border-b border-[#EAECE6]">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-7 w-7 rounded-xl overflow-hidden shadow-2xs flex items-center justify-center bg-white border border-[#EAECE6]">
                                        <Image
                                            src="/icon.jpg"
                                            alt="SmartSpace Logo"
                                            width={28}
                                            height={28}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black uppercase tracking-tight text-[#2D3328] leading-none">
                                            SmartSpace
                                        </span>
                                        <span className="text-[7px] font-bold tracking-[0.2em] text-[#7C816C] uppercase">
                                            {isAdmin ? 'ADMINISTRATION' : 'COWORKING HUB'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAECE6] text-[#2D3328] hover:bg-[#2D3328] hover:text-white transition active:scale-90 cursor-pointer"
                                    aria-label="Tutup Menu"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* User Account Info Card */}
                            {isLoggedIn && (
                                <Link
                                    href={isMember ? "/member/profile" : "/admin/profile"}
                                    onClick={() => setSidebarOpen(false)}
                                    className="mt-5 p-4 rounded-2xl bg-white border border-[#EAECE6] shadow-2xs block hover:border-[#2D3328] transition group cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#2D3328] text-white flex items-center justify-center text-sm font-black group-hover:scale-105 transition overflow-hidden">
                                            {!imageError && userAvatarUrl ? (
                                                <img
                                                    src={userAvatarUrl}
                                                    alt={displayName}
                                                    className="w-full h-full object-cover"
                                                    onError={() => setImageError(true)}
                                                />
                                            ) : (
                                                <span>{userInitial}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAECE6] text-[#2D3328] mb-0.5">
                                                {isAdmin ? 'PENGELOLA SPACE' : 'MEMBER RESMI'}
                                            </span>
                                            <p className="text-sm font-black text-[#2D3328] truncate">
                                                {displayName}
                                            </p>
                                            <p className="text-[11px] text-[#7C816C] truncate">
                                                @{user?.username} • {user?.member?.instansi || user?.space_owner?.nama_coworking || 'Aktif'}
                                            </p>
                                        </div>
                                        <svg className="w-4 h-4 text-[#7C816C] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </Link>
                            )}

                            {/* Navigation Links */}
                            <div className="mt-6 space-y-2">
                                <span className="block text-[9px] font-black uppercase tracking-widest text-[#7C816C] mb-2 px-1">
                                    {isAdmin ? 'Navigasi Pengelola' : isMember ? 'Navigasi Member' : 'Menu Utama'}
                                </span>

                                {isMember ? (
                                    <>
                                        <Link
                                            href="/member/spaces"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname.startsWith('/member/spaces') ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Katalog Ruangan</span>
                                        </Link>
                                        <Link
                                            href="/member/reservasi"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/member/reservasi' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Status Pemesanan</span>
                                        </Link>
                                        <Link
                                            href="/member/histori"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/member/histori' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Histori Bulanan</span>
                                        </Link>
                                        <Link
                                            href="/member/profile"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/member/profile' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Profil Akun</span>
                                        </Link>
                                    </>
                                ) : isAdmin ? (
                                    <>
                                        <Link
                                            href="/admin/dashboard"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/admin/dashboard' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Pusat Kendali</span>
                                        </Link>
                                        <Link
                                            href="/admin/reservasi"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/admin/reservasi' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Kelola Reservasi</span>
                                        </Link>
                                        <Link
                                            href="/admin/spaces"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/admin/spaces' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Katalog Ruangan</span>
                                        </Link>
                                        <Link
                                            href="/admin/diskon"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/admin/diskon' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Kode Diskon / Promo</span>
                                        </Link>
                                        <Link
                                            href="/admin/members"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/admin/members' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Data Member / Pelanggan</span>
                                        </Link>
                                        <Link
                                            href="/admin/profile"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/admin/profile' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Profil Coworking Space</span>
                                        </Link>
                                        <Link
                                            href="/member/spaces"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname.startsWith('/member/spaces') ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Pratinjau Ruangan Publik</span>
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname === '/' ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Beranda</span>
                                        </Link>
                                        <Link
                                            href="/member/spaces"
                                            prefetch={false}
                                            className={`flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition ${pathname.startsWith('/member/spaces') ? 'bg-[#2D3328] text-white shadow-xs' : 'text-[#2D3328] hover:bg-[#EAECE6]'}`}
                                        >
                                            <span>Katalog Ruangan</span>
                                        </Link>
                                        <Link
                                            href="/Auth/login"
                                            prefetch={false}
                                            className="flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-[#2D3328] hover:bg-[#EAECE6] transition"
                                        >
                                            <span>Masuk ke Akun</span>
                                        </Link>
                                        <Link
                                            href="/Auth/register"
                                            prefetch={false}
                                            className="flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-[#2D3328] hover:bg-[#EAECE6] transition"
                                        >
                                            <span>Daftar Member</span>
                                        </Link>
                                        <Link
                                            href="/Auth/registeradmin"
                                            prefetch={false}
                                            className="flex items-center justify-between p-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider text-[#7C816C] hover:bg-[#EAECE6] transition"
                                        >
                                            <span>Daftar Mitra Pengelola</span>
                                        </Link>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-6 border-t border-[#EAECE6] space-y-3">
                            {isLoggedIn ? (
                                <>
                                    {isMember && (
                                        <Link
                                            href="/member/spaces"
                                            className="w-full py-3 rounded-full bg-[#2D3328] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#3E4538] transition flex items-center justify-center gap-2 shadow-xs active:scale-95"
                                        >
                                            <span>Pesan Ruangan</span>
                                        </Link>
                                    )}
                                    <button
                                        onClick={logout}
                                        className="w-full py-3 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider hover:bg-rose-100 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <span>Keluar dari Akun</span>
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/Auth/login"
                                    className="w-full py-3 rounded-full bg-[#2D3328] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#3E4538] transition flex items-center justify-center gap-2 shadow-xs active:scale-95"
                                >
                                    <span>Masuk ke Akun</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}