'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/authcontext';

export default function LoginPage() {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!username.trim()) {
            setErrorMsg('Harap masukkan username Anda.');
            return;
        }

        if (!password) {
            setErrorMsg('Harap masukkan kata sandi Anda.');
            return;
        }

        setIsSubmitting(true);

        try {
            await login(username.trim(), password);
        } catch (err: any) {
            setErrorMsg(
                err.response?.data?.message || err.message || 'Login gagal. Periksa kembali username dan password Anda.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8F8F7] px-4 py-12 text-[#2D3328] selection:bg-[#7C816C] selection:text-white font-sans">

            {/* Container Card */}
            <div className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10 border border-[#EAECE6] shadow-sm">

                {/* Header with SmartSpace Brand Logo */}
                <div className="text-center space-y-2 mb-8">
                    <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
                        <div className="h-9 w-9 rounded-xl overflow-hidden shadow-2xs group-hover:scale-105 transition flex items-center justify-center bg-white border border-[#EAECE6]">
                            <Image
                                src="/icon.jpg"
                                alt="SmartSpace Logo"
                                width={36}
                                height={36}
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-sm sm:text-base font-black tracking-tight text-[#2D3328] leading-none">
                                SmartSpace
                            </span>
                            <span className="text-[7.5px] font-bold tracking-[0.22em] text-[#7C816C] uppercase">
                                COWORKING HUB
                            </span>
                        </div>
                    </Link>

                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#2D3328]">
                        Selamat Datang!
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6E745F] font-medium">
                        Silakan login untuk memesan workstation & ruangan
                    </p>
                </div>

                {/* Error Alert */}
                {errorMsg && (
                    <div className="mb-5 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 animate-in fade-in flex items-start gap-2">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Form (Sesuai Wireframe Hal. 42 Layar 2) */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                            Username
                        </label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-5 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white"
                            placeholder="Masukkan username Anda"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                                Password
                            </label>
                            <span className="text-[10px] font-bold text-[#9AA08F]">
                                Min. 6 Karakter
                            </span>
                        </div>
                        <div className="relative flex items-center">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] pl-5 pr-11 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 text-[#7C816C] hover:text-[#2D3328] transition cursor-pointer p-1"
                                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                            >
                                {showPassword ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-[#2D3328] py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition hover:bg-[#3E4538] active:scale-95 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 mt-4 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                                <span>Memproses Masuk...</span>
                            </>
                        ) : (
                            <span>Masuk ke Akun →</span>
                        )}
                    </button>
                </form>

                {/* Footer Navigation */}
                <div className="mt-8 pt-6 border-t border-[#EAECE6] space-y-2 text-center text-xs text-[#6E745F] font-medium">
                    <p>
                        Belum memiliki akun member?{' '}
                        <Link href="/Auth/register" className="font-bold text-[#2D3328] hover:text-[#7C816C] transition underline">
                            Daftar Sekarang
                        </Link>
                    </p>
                    <p>
                        Kelola Coworking Space Anda?{' '}
                        <Link href="/Auth/registeradmin" className="font-bold text-[#7C816C] hover:text-[#2D3328] transition">
                            Daftar sebagai Pengelola
                        </Link>
                    </p>
                    <div className="pt-2">
                        <Link href="/" className="text-[11px] font-bold text-[#7C816C] hover:text-[#2D3328] transition">
                            ← Kembali ke Beranda
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}