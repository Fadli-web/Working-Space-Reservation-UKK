'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/authcontext';
import api from '@/services/api';
import { authService, getPhotoUrl } from '@/services/auth.services';
import Navbar from '@/components/Navbar';

export default function MemberProfilePage() {
    const router = useRouter();
    const { user, loading, logout, updateProfile } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // State Ubah Password Member
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const [form, setForm] = useState({
        nama_member: '',
        instansi: '',
        telp: '',
        alamat: '',
        foto: '',
    });

    useEffect(() => {
        if (user?.member && !isEditing) {
            const cachedAvatar =
                (typeof window !== 'undefined' && user.username
                    ? localStorage.getItem(`member_avatar_override_${user.username.toLowerCase()}`)
                    : null) || user.member.foto || '';

            setForm({
                nama_member: user.member.nama_member || user.username || '',
                instansi: user.member.instansi || '',
                telp: user.member.telp || '',
                alamat: user.member.alamat || '',
                foto: cachedAvatar,
            });
        }
    }, [user, isEditing]);

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new window.Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 400;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height = Math.round((height * MAX_SIZE) / width);
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width = Math.round((width * MAX_SIZE) / height);
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    } else {
                        resolve((event.target?.result as string) || '');
                    }
                };
                img.onerror = () => resolve((event.target?.result as string) || '');
                img.src = (event.target?.result as string) || '';
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const base64Data = await compressImage(file);
            if (!base64Data) throw new Error('Gagal memproses file foto.');

            let finalPhoto = base64Data;

            // Unggah ke backend endpoint /api/upload/members
            try {
                const uploadRes = await authService.uploadMemberPhoto(file);
                if (uploadRes?.filename || uploadRes?.url) {
                    const resolved = getPhotoUrl(uploadRes.url || uploadRes.filename);
                    if (resolved) {
                        finalPhoto = resolved;
                    }
                }
            } catch (uploadErr) {
                console.warn('Upload API tidak merespons, foto disimpan menggunakan format lokal.');
            }

            setForm((prev) => ({ ...prev, foto: finalPhoto }));

            // Simpan langsung ke state aplikasi & localStorage
            updateProfile({ foto: finalPhoto });
            if (typeof window !== 'undefined' && user?.username) {
                localStorage.setItem(`member_avatar_override_${user.username.toLowerCase()}`, finalPhoto);
                if (user.member?.id) {
                    localStorage.setItem(`member_avatar_${user.member.id}`, finalPhoto);
                }
                window.dispatchEvent(new Event('member_avatar_updated'));
                window.dispatchEvent(new Event('profile_updated'));
            }

            // Simpan permanen ke server database & file store
            try {
                await authService.updateMemberProfile({
                    nama_member: form.nama_member || user?.member?.nama_member || user?.username || '',
                    instansi: form.instansi || user?.member?.instansi || '',
                    telp: form.telp || user?.member?.telp || '',
                    alamat: form.alamat || user?.member?.alamat || '',
                    foto: finalPhoto,
                });
            } catch (syncErr) {
                console.warn('Sinkronisasi foto ke server:', syncErr);
            }

            alert('Foto profil berhasil diperbarui!');
        } catch (err: any) {
            setErrorMessage('Gagal memproses file foto.');
        } finally {
            setUploadingPhoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrorMessage('');

        const payload = {
            nama_member: form.nama_member.trim(),
            instansi: form.instansi.trim(),
            telp: form.telp.trim(),
            alamat: form.alamat.trim(),
            foto: form.foto || undefined,
        };

        try {
            // Simpan ke database backend via route server
            await authService.updateMemberProfile(payload);

            // Simpan ke AuthContext & state aplikasi
            updateProfile(payload);

            if (typeof window !== 'undefined' && user?.username) {
                if (form.foto) {
                    localStorage.setItem(`member_avatar_override_${user.username.toLowerCase()}`, form.foto);
                    const memberId = user?.member?.id || user?.id;
                    if (memberId) {
                        localStorage.setItem(`member_avatar_${memberId}`, form.foto);
                    }
                }
                window.dispatchEvent(new Event('member_avatar_updated'));
                window.dispatchEvent(new Event('profile_updated'));
            }

            setForm((prev) => ({
                ...prev,
                ...payload,
                foto: payload.foto || prev.foto,
            }));

            setIsEditing(false);
            alert('Profil member berhasil diperbarui!');
            router.push('/member/spaces');
        } catch (err: any) {
            console.error('Gagal menyimpan profil:', err);
            setErrorMessage(err.response?.data?.message || 'Terjadi kesalahan saat menyimpan perubahan.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (user?.member) {
            const cachedAvatar =
                (typeof window !== 'undefined' && user.username
                    ? localStorage.getItem(`member_avatar_override_${user.username.toLowerCase()}`)
                    : null) || user.member.foto || '';

            setForm({
                nama_member: user.member.nama_member || user.username || '',
                instansi: user.member.instansi || '',
                telp: user.member.telp || '',
                alamat: user.member.alamat || '',
                foto: cachedAvatar,
            });
        }
        setErrorMessage('');
        setIsEditing(false);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordForm.newPassword.length < 6) {
            setPasswordError('Kata sandi baru minimal 6 karakter!');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('Konfirmasi kata sandi baru tidak cocok!');
            return;
        }

        setSavingPassword(true);

        try {
            const res = await api.post('/api/member/change-password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });

            setPasswordSuccess(res.data?.message || 'Kata sandi berhasil diperbarui!');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });

            setTimeout(() => {
                setShowPasswordSection(false);
            }, 2500);
        } catch (err: any) {
            setPasswordError(err.response?.data?.message || 'Gagal mengubah kata sandi akun.');
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center text-xs font-bold uppercase tracking-widest text-[#737373]">
                Memuat Profil...
            </div>
        );
    }

    if (!user || user.role !== 'member') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[#2D3328]">
                    Sesi Tidak Ditemukan
                </p>
                <Link
                    href="/Auth/login"
                    className="px-6 py-2.5 bg-[#2D3328] text-white text-xs font-bold uppercase tracking-widest rounded-full"
                >
                    Masuk Akun
                </Link>
            </div>
        );
    }

    const currentFoto =
        form.foto ||
        (typeof window !== 'undefined' && user.username
            ? localStorage.getItem(`member_avatar_override_${user.username.toLowerCase()}`)
            : null) ||
        user.member?.foto;

    return (
        <div className="min-h-screen bg-[#FBFBF9] text-[#2D3328] font-sans pb-24 md:pb-16 selection:bg-[#7C816C] selection:text-white">
            <Navbar />

            <main className="max-w-4xl mx-auto px-6 pt-12">
                <div className="mb-8">
                    <span className="inline-block px-3 py-1 bg-[#F0F1ED] text-[10px] font-bold tracking-widest uppercase rounded-md text-[#6E745F]">
                        AKUN PENGGUNA
                    </span>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-[#2D3328] mt-3">
                        PROFIL MEMBER
                    </h1>
                    <p className="text-xs text-[#6E745F] font-medium mt-1">
                        Informasi data diri terdaftar, foto avatar resmi, dan pengaturan keamanan akun.
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-rose-700">
                        {errorMessage}
                    </div>
                )}

                <div className="rounded-[2rem] bg-white border border-[#EAECE6] shadow-sm overflow-hidden p-8 md:p-10 mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-[#F0F1ED]">
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-2xl bg-[#F0F1ED] border border-[#EAECE6] overflow-hidden flex items-center justify-center text-xl font-black text-[#2D3328]">
                                    {currentFoto ? (
                                        <img
                                            src={getPhotoUrl(currentFoto) || ''}
                                            alt={form.nama_member || user.username}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLElement).style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <span>{(form.nama_member || user.member?.nama_member || user.username || 'M').charAt(0).toUpperCase()}</span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                    className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition cursor-pointer"
                                    title="Pilih foto baru"
                                >
                                    {uploadingPhoto ? 'Memproses...' : 'Ganti Foto'}
                                </button>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handlePhotoUpload}
                                    accept="image/png, image/jpeg, image/jpg, image/webp"
                                    className="hidden"
                                />
                            </div>

                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#2D3328]">
                                        {user.member?.nama_member || form.nama_member || user.username}
                                    </h2>
                                    <span className="px-3 py-1 bg-[#F0F1ED] text-[10px] font-bold uppercase tracking-wider rounded-full text-[#6E745F]">
                                        AKTIF
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-[#6E745F] mt-1">
                                    @{user.username} • {user.member?.instansi || form.instansi || 'Member Terdaftar'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingPhoto}
                                className="px-4 py-2.5 bg-[#F0F1ED] text-[#2D3328] text-[10px] font-bold uppercase tracking-wider rounded-full hover:bg-[#D5D8CF] transition cursor-pointer"
                            >
                                {uploadingPhoto ? 'Mengunggah...' : 'Unggah Foto'}
                            </button>
                            {!isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="px-5 py-2.5 border border-[#D5D8CF] text-[11px] font-bold uppercase tracking-widest rounded-full hover:bg-[#2D3328] hover:text-white transition cursor-pointer"
                                >
                                    EDIT PROFIL
                                </button>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <form onSubmit={handleSaveProfile} className="pt-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        NAMA LENGKAP
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.nama_member}
                                        onChange={(e) => setForm({ ...form, nama_member: e.target.value })}
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        INSTANSI / ORGANISASI
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.instansi}
                                        onChange={(e) => setForm({ ...form, instansi: e.target.value })}
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        NOMOR TELEPON
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={form.telp}
                                        onChange={(e) => setForm({ ...form, telp: e.target.value })}
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        ALAMAT DOMISILI
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.alamat}
                                        onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 flex items-center justify-end gap-3 border-t border-[#F0F1ED]">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="px-6 py-3 border border-[#D5D8CF] text-[10px] font-bold uppercase tracking-widest rounded-full text-[#6E745F] hover:bg-[#F0F1ED] transition cursor-pointer"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || uploadingPhoto}
                                    className="px-8 py-3 bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-black transition disabled:opacity-50 cursor-pointer"
                                >
                                    {saving ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="pt-8 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-[#F8F9F7] p-5 rounded-2xl border border-[#F0F1ED]">
                                    <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8F9485] mb-1">
                                        INSTANSI / ORGANISASI
                                    </span>
                                    <p className="text-sm font-black uppercase text-[#2D3328]">
                                        {user.member?.instansi || form.instansi || '-'}
                                    </p>
                                </div>

                                <div className="bg-[#F8F9F7] p-5 rounded-2xl border border-[#F0F1ED]">
                                    <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8F9485] mb-1">
                                        NOMOR TELEPON
                                    </span>
                                    <p className="text-sm font-black text-[#2D3328]">
                                        {user.member?.telp || form.telp || '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-[#F8F9F7] p-5 rounded-2xl border border-[#F0F1ED]">
                                <span className="block text-[9px] font-bold uppercase tracking-widest text-[#8F9485] mb-1">
                                    ALAMAT DOMISILI
                                </span>
                                <p className="text-sm font-black uppercase text-[#2D3328]">
                                    {user.member?.alamat || form.alamat || '-'}
                                </p>
                            </div>

                            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#F0F1ED]">
                                <button
                                    onClick={logout}
                                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-red-50 text-red-700 text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition cursor-pointer"
                                >
                                    KELUAR AKUN
                                </button>

                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordSection(!showPasswordSection)}
                                        className="w-full sm:w-auto px-6 py-3 rounded-full border border-[#D5D8CF] text-[10px] font-bold uppercase tracking-widest hover:bg-[#F0F1ED] transition text-center cursor-pointer"
                                    >
                                        {showPasswordSection ? 'TUTUP PENGATURAN SANDI' : 'UBAH KATA SANDI'}
                                    </button>
                                    <Link
                                        href="/member/spaces"
                                        className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition text-center cursor-pointer"
                                    >
                                        PESAN RUANGAN SEKARANG
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* --- KARTU UBAH KATA SANDI MEMBER --- */}
                {showPasswordSection && (
                    <div className="rounded-[2rem] bg-white border border-[#EAECE6] shadow-sm overflow-hidden p-8 md:p-10 animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6 pb-6 border-b border-[#F0F1ED]">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#7C816C]">
                                KEAMANAN AKUN
                            </span>
                            <h2 className="text-xl font-black uppercase tracking-tight text-[#2D3328] mt-1">
                                UBAH KATA SANDI AKUN
                            </h2>
                            <p className="text-xs text-[#6E745F] mt-1">
                                Pastikan kata sandi baru Anda memiliki panjang minimal 6 karakter demi keamanan akun Anda.
                            </p>
                        </div>

                        {passwordError && (
                            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                                {passwordError}
                            </div>
                        )}
                        {passwordSuccess && (
                            <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-200 text-xs font-bold text-green-700">
                                {passwordSuccess}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-5 max-w-xl">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                    KATA SANDI SAAT INI (OPSIONAL / JIKA DIMINTA)
                                </label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    placeholder="Masukkan kata sandi saat ini"
                                    className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        KATA SANDI BARU *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPasswords ? 'text' : 'password'}
                                            required
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            placeholder="Minimal 6 karakter"
                                            className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 pr-11 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8F9485] hover:text-[#2D3328] p-1"
                                        >
                                            {showPasswords ? (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6E745F] mb-2">
                                        KONFIRMASI KATA SANDI BARU *
                                    </label>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        required
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        placeholder="Ketik ulang kata sandi baru"
                                        className="w-full bg-[#FBFBF9] border border-[#D5D8CF] rounded-xl px-4 py-3.5 text-xs font-bold text-[#2D3328] outline-none focus:border-[#2D3328] transition"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordSection(false)}
                                    className="px-6 py-3 rounded-full border border-[#D5D8CF] text-[10px] font-bold uppercase tracking-widest text-[#6E745F] hover:bg-[#F0F1ED] transition cursor-pointer"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="px-8 py-3 rounded-full bg-[#2D3328] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition disabled:opacity-50 cursor-pointer"
                                >
                                    {savingPassword ? 'MEMPERBARUI...' : 'SIMPAN KATA SANDI BARU'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}