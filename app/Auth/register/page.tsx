'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService, getPhotoUrl } from '@/services/auth.services';

export default function RegisterMemberPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        username: '',
        password: '',
        nama_member: '',
        instansi: '',
        alamat: '',
        telp: '',
        foto: '',
    });

    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Photo avatar state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const [errorMsg, setErrorMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // Handle foto avatar selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validasi tipe & ukuran (max 3MB)
        if (!file.type.startsWith('image/')) {
            setErrorMsg('Format file harus berupa gambar (.jpg, .jpeg, .png, .webp)');
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            setErrorMsg('Ukuran file foto maksimal 3MB');
            return;
        }

        setErrorMsg('');
        setSelectedFile(file);

        // Preview langsung
        const reader = new FileReader();
        reader.onloadend = () => {
            setPhotoPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedFile(null);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        // Validasi DTO UKK (Hal. 8 DTO 3)
        if (form.password.length < 6) {
            setErrorMsg('Password akun member minimal 6 karakter!');
            return;
        }

        if (form.password !== confirmPassword) {
            setErrorMsg('Konfirmasi password tidak cocok! Pastikan sandi yang dimasukkan sama.');
            return;
        }

        if (!form.username.trim() || !form.nama_member.trim() || !form.instansi.trim() || !form.telp.trim() || !form.alamat.trim()) {
            setErrorMsg('Harap lengkapi semua kolom pendaftaran yang wajib diisi.');
            return;
        }

        setIsSubmitting(true);

        try {
            let uploadedFilename = '';

            // 1. Upload Foto jika ada (Endpoint No. 50: POST /api/upload/members)
            if (selectedFile) {
                try {
                    const uploadRes = await authService.uploadMemberPhoto(selectedFile);
                    if (uploadRes?.filename) {
                        uploadedFilename = uploadRes.filename;
                    }
                } catch (uploadErr) {
                    console.warn('Upload foto ke server gagal, registrasi dilanjutkan dengan foto lokal:', uploadErr);
                }
            }

            // 2. Submit Data Member (Endpoint No. 8: POST /api/auth/register/member)
            let baseInstansi = form.instansi.trim() || 'Member';
            let packedInstansi = baseInstansi;
            const photoUrl = uploadedFilename ? getPhotoUrl(uploadedFilename) : photoPreview;
            if (photoUrl) {
                packedInstansi = `${baseInstansi}|||${JSON.stringify({ foto: photoUrl })}`;
            }

            const payload = {
                ...form,
                instansi: packedInstansi,
                foto: uploadedFilename || (selectedFile ? selectedFile.name : ''),
            };

            await authService.registerMember(payload);

            // Simpan foto preview ke localStorage agar langsung tampil saat member login
            if (photoPreview && typeof window !== 'undefined') {
                try {
                    const userKey = `profile_override_user_${form.username.trim().toLowerCase()}`;
                    const avatarKey = `member_avatar_override_${form.username.trim().toLowerCase()}`;
                    localStorage.setItem(avatarKey, photoPreview);
                    localStorage.setItem(
                        userKey,
                        JSON.stringify({
                            nama_member: form.nama_member,
                            instansi: form.instansi,
                            alamat: form.alamat,
                            telp: form.telp,
                            foto: photoPreview,
                        })
                    );
                } catch (storageErr) {
                    console.error('Gagal menyimpan cache profil lokal:', storageErr);
                }
            }

            alert('Registrasi member berhasil! Silakan masuk ke akun Anda.');
            router.push('/Auth/login');
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Registrasi gagal. Silakan coba kembali.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8F8F7] px-4 py-12 text-[#2D3328] selection:bg-[#7C816C] selection:text-white font-sans">

            {/* Container Card */}
            <div className="w-full max-w-lg rounded-3xl bg-white p-8 sm:p-10 border border-[#EAECE6] shadow-sm">

                {/* Header */}
                <div className="text-center space-y-2 mb-6">
                    <Link href="/" className="inline-flex items-center gap-2.5 mb-2 group">
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
                        Daftar Akun Member
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6E745F] font-medium">
                        Lengkapi profil Anda untuk memesan workstation, meeting room & kantor privat
                    </p>
                </div>

                {/* Avatar Photo Picker (Sesuai Wireframe Hal. 42 Layar 1) */}
                <div className="flex flex-col items-center justify-center mb-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group h-24 w-24 rounded-full border-2 border-dashed border-[#BCC2B0] hover:border-[#2D3328] bg-[#F4F5F2] flex flex-col items-center justify-center cursor-pointer overflow-hidden transition shadow-xs"
                        title="Klik untuk memilih foto profil"
                    >
                        {photoPreview ? (
                            <>
                                <img
                                    src={photoPreview}
                                    alt="Preview Foto Profil"
                                    className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                                    Ganti Foto
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center text-[#7C816C] group-hover:text-[#2D3328] transition p-2 text-center">
                                <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-[9px] font-bold leading-tight">Upload Foto</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[11px] font-bold text-[#7C816C] hover:text-[#2D3328] transition cursor-pointer"
                        >
                            {photoPreview ? 'Ganti Foto Profil' : '+ Tambah Foto Profil (Opsional)'}
                        </button>
                        {photoPreview && (
                            <button
                                type="button"
                                onClick={handleRemovePhoto}
                                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                            >
                                Hapus
                            </button>
                        )}
                    </div>
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                                Nama Lengkap <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nama_member"
                                required
                                value={form.nama_member}
                                onChange={handleChange}
                                placeholder="mis. John Doe"
                                className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-5 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                                Instansi / Perusahaan <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="instansi"
                                required
                                value={form.instansi}
                                onChange={handleChange}
                                placeholder="mis. Universitas Indonesia"
                                className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-5 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                                Nomor Telepon / HP <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="tel"
                                name="telp"
                                required
                                value={form.telp}
                                onChange={handleChange}
                                placeholder="mis. 081234567890"
                                className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-5 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                                Username <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="username"
                                required
                                value={form.username}
                                onChange={handleChange}
                                placeholder="mis. johndoe"
                                className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] px-5 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                            Alamat Domisili <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            name="alamat"
                            required
                            rows={2}
                            value={form.alamat}
                            onChange={handleChange}
                            placeholder="Alamat domisili lengkap pelanggan..."
                            className="w-full rounded-2xl border border-[#EAECE6] bg-[#F4F5F2] px-5 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white resize-none"
                        />
                    </div>

                    {/* Password & Konfirmasi Password (Sesuai Wireframe Hal. 42 Layar 1) */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                                    Password <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[9.5px] font-bold text-[#9AA08F]">
                                    Min. 6 Karakter
                                </span>
                            </div>
                            <div className="relative flex items-center">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] pl-5 pr-11 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white"
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

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-extrabold uppercase text-[#7C816C] tracking-wider">
                                    Konfirmasi Password <span className="text-rose-500">*</span>
                                </label>
                                <span className="text-[9.5px] font-bold text-[#9AA08F]">
                                    Harus sesuai
                                </span>
                            </div>
                            <div className="relative flex items-center">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full rounded-full border border-[#EAECE6] bg-[#F4F5F2] pl-5 pr-11 py-3 text-xs sm:text-sm font-medium text-[#2D3328] placeholder-[#9AA08F] outline-none transition focus:border-[#2D3328] focus:bg-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3.5 text-[#7C816C] hover:text-[#2D3328] transition cursor-pointer p-1"
                                    title={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
                                >
                                    {showConfirmPassword ? (
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
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full rounded-full bg-[#2D3328] py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-white transition hover:bg-[#3E4538] active:scale-95 disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 mt-4 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                                <span>Mendaftarkan Akun...</span>
                            </>
                        ) : (
                            <span>Daftar Sekarang →</span>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-7 pt-6 border-t border-[#EAECE6] space-y-2 text-center text-xs text-[#6E745F] font-medium">
                    <p>
                        Sudah memiliki akun member?{' '}
                        <Link href="/Auth/login" className="font-bold text-[#2D3328] hover:text-[#7C816C] transition underline">
                            Masuk di Sini
                        </Link>
                    </p>
                    <div>
                        <Link href="/" className="text-[11px] font-bold text-[#7C816C] hover:text-[#2D3328] transition">
                            ← Kembali ke Beranda
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    );
}