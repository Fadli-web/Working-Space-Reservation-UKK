'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, MemberData, SpaceOwnerData } from '@/types/auth';
import { authService } from '@/services/auth.services';
import api from '@/services/api';

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
    updateProfile: (updatedData: Partial<MemberData>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    const fetchProfile = async () => {
        try {
            const data = await authService.getProfile();

            // Jika akun adalah member namun data profil member-nya sudah tidak ada di backend MySQL (telah dihapus admin)
            if (data && data.role === 'member' && !data.member) {
                const u = data.username ? data.username.toLowerCase().trim() : '';
                if (u && typeof window !== 'undefined') {
                    localStorage.removeItem(`profile_override_user_${u}`);
                    localStorage.removeItem(`member_avatar_override_${u}`);
                }
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                }
                setUser(null);
                setLoading(false);
                return;
            }

            if (data && typeof window !== 'undefined') {
                const uName = data.username ? data.username.toLowerCase().trim() : '';
                const userKey = uName ? `profile_override_user_${uName}` : null;
                const avatarKey = uName ? `member_avatar_override_${uName}` : null;

                // 0. Unpack metadata permanen (foto, alamat, telp, deskripsi) langsung dari MySQL backend
                if (data.member && data.member.instansi && data.member.instansi.includes('|||')) {
                    const parts = data.member.instansi.split('|||');
                    data.member.instansi = parts[0];
                    try {
                        const extra = JSON.parse(parts[1]);
                        if (extra.foto) data.member.foto = extra.foto;
                        if (extra.alamat && !data.member.alamat) data.member.alamat = extra.alamat;
                        if (extra.telp && !data.member.telp) data.member.telp = extra.telp;
                    } catch (e) {}
                }

                if (data.space_owner && data.space_owner.nama_pemilik && data.space_owner.nama_pemilik.includes('|||')) {
                    const parts = data.space_owner.nama_pemilik.split('|||');
                    data.space_owner.nama_pemilik = parts[0];
                    try {
                        const extra = JSON.parse(parts[1]);
                        if (extra.foto) data.space_owner.foto = extra.foto;
                        if (extra.alamat && !data.space_owner.alamat) data.space_owner.alamat = extra.alamat;
                        if (extra.deskripsi && !data.space_owner.deskripsi) data.space_owner.deskripsi = extra.deskripsi;
                    } catch (e) {}
                }

                // 1. Ambil data kustom permanen dari server lokal/Next.js jika ada
                let serverProfile = null;
                if (uName) {
                    serverProfile = await authService.getServerProfile(uName);
                }

                if (serverProfile) {
                    data.member = {
                        ...(data.member || { id: data.id, nama_member: data.username, instansi: '', alamat: '', telp: '' }),
                        nama_member: data.member?.nama_member || serverProfile.nama_member || data.username,
                        instansi: (data.member?.instansi !== undefined && data.member?.instansi !== '') ? data.member.instansi : (serverProfile.instansi || ''),
                        alamat: (data.member?.alamat !== undefined && data.member?.alamat !== '') ? data.member.alamat : (serverProfile.alamat || ''),
                        telp: (data.member?.telp !== undefined && data.member?.telp !== '') ? data.member.telp : (serverProfile.telp || ''),
                        foto: data.member?.foto || serverProfile.foto,
                    };

                    // Bersihkan jika serverProfile masih membawa format |||
                    if (data.member.instansi && data.member.instansi.includes('|||')) {
                        data.member.instansi = data.member.instansi.split('|||')[0];
                    }

                    // Sinkronisasi ke cache lokal untuk username ini
                    if (userKey) {
                        localStorage.setItem(userKey, JSON.stringify(data.member));
                    }
                    if (avatarKey && data.member.foto) {
                        localStorage.setItem(avatarKey, data.member.foto);
                    }
                } else {
                    // Fallback jika server belum memiliki catatan: gunakan cache lokal
                    const savedOverrides = userKey ? localStorage.getItem(userKey) : null;
                    const savedAvatar = avatarKey ? localStorage.getItem(avatarKey) : null;

                    if (savedOverrides) {
                        try {
                            const parsed = JSON.parse(savedOverrides);
                            data.member = {
                                ...(data.member || { id: data.id, nama_member: data.username, instansi: '', alamat: '', telp: '' }),
                                ...parsed,
                            };
                        } catch (e) {
                            console.error('Gagal mengurai data profil lokal:', e);
                        }
                    }

                    if (data.member) {
                        if (data.member.foto) {
                            if (avatarKey) {
                                localStorage.setItem(avatarKey, data.member.foto);
                            }
                        } else if (savedAvatar) {
                            data.member.foto = savedAvatar;
                            if (uName) {
                                authService.updateMemberProfile({
                                    nama_member: data.member.nama_member || data.username,
                                    instansi: data.member.instansi || '',
                                    telp: data.member.telp || '',
                                    alamat: data.member.alamat || '',
                                    foto: data.member.foto,
                                }).catch(() => {});
                            }
                        }
                    }
                }

                if (avatarKey && data.member?.foto) {
                    localStorage.setItem(avatarKey, data.member.foto);
                }

                if (data.role === 'admin_space') {
                    try {
                        const adminProfRes = await api.get('/api/admin/profile');
                        if (adminProfRes.data?.data) {
                            const updatedSpaceOwner: SpaceOwnerData = {
                                ...(data.space_owner || {
                                    id: data.id,
                                    nama_coworking: '',
                                    nama_pemilik: data.username,
                                    telp: '',
                                }),
                                ...adminProfRes.data.data
                            };
                            data.space_owner = updatedSpaceOwner;
                            if (avatarKey && updatedSpaceOwner.foto) {
                                localStorage.setItem(`admin_avatar_override_${uName}`, updatedSpaceOwner.foto);
                            }
                        }
                    } catch (e) {
                        // ignore
                    }
                }
            }

            setUser(data);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('member_avatar_updated'));
                window.dispatchEvent(new Event('profile_updated'));
            }
        } catch {
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Pembersihan key usang saat aplikasi dimuat
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('profile_override_latest');
                Object.keys(localStorage).forEach((key) => {
                    if (/^profile_override_\d+$/.test(key) || key === 'profile_override_latest') {
                        localStorage.removeItem(key);
                    }
                });
            } catch {
                // Abaikan
            }
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
            fetchProfile();
        } else {
            setLoading(false);
        }
    }, []);

    const updateProfile = (updatedData: Partial<MemberData>) => {
        setUser((currentUser) => {
            if (!currentUser) return null;

            const currentMember = currentUser.member || {
                id: currentUser.id,
                nama_member: currentUser.username,
                instansi: '',
                alamat: '',
                telp: '',
            };

            const newMember: MemberData = {
                ...currentMember,
                ...updatedData,
            };

            const newUser: UserProfile = {
                ...currentUser,
                member: newMember,
            };

            if (typeof window !== 'undefined' && currentUser.username) {
                try {
                    const serialized = JSON.stringify(newMember);
                    // Simpan HANYA untuk username spesifik ini
                    localStorage.setItem(`profile_override_user_${currentUser.username.toLowerCase()}`, serialized);
                    if (newMember.foto) {
                        localStorage.setItem(`member_avatar_override_${currentUser.username.toLowerCase()}`, newMember.foto);
                        if (newMember.id) {
                            localStorage.setItem(`member_avatar_${newMember.id}`, newMember.foto);
                        }
                    }
                    window.dispatchEvent(new Event('member_avatar_updated'));
                    window.dispatchEvent(new Event('profile_updated'));

                    // Sinkronisasi background ke server
                    authService.updateMemberProfile({
                        nama_member: newMember.nama_member || currentUser.username,
                        instansi: newMember.instansi || '',
                        telp: newMember.telp || '',
                        alamat: newMember.alamat || '',
                        foto: newMember.foto,
                    }).catch(() => {});
                } catch (storageErr) {
                    console.error('Gagal menyimpan profil ke localStorage:', storageErr);
                }
            }

            return newUser;
        });
    };

    const login = async (username: string, password: string) => {
        const data = await authService.login({ username, password });

        // Jika akun ber-role member tetapi data profil member di database MySQL sudah dihapus oleh Admin
        if (data.role === 'member' && !data.member) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                const u = username.toLowerCase().trim();
                localStorage.removeItem(`profile_override_user_${u}`);
                localStorage.removeItem(`member_avatar_override_${u}`);
            }
            throw new Error('Akun member ini telah dihapus oleh Admin atau sudah tidak aktif.');
        }

        localStorage.setItem('token', data.access_token);

        let memberData = data.member;
        const uName = data.username ? data.username.toLowerCase().trim() : '';
        const userKey = uName ? `profile_override_user_${uName}` : null;
        const avatarKey = uName ? `member_avatar_override_${uName}` : null;

        // 0. Unpack metadata (foto, alamat, telp) langsung dari MySQL backend
        if (memberData && memberData.instansi && memberData.instansi.includes('|||')) {
            const parts = memberData.instansi.split('|||');
            memberData.instansi = parts[0];
            try {
                const extra = JSON.parse(parts[1]);
                if (extra.foto) memberData.foto = extra.foto;
                if (extra.alamat && !memberData.alamat) memberData.alamat = extra.alamat;
                if (extra.telp && !memberData.telp) memberData.telp = extra.telp;
            } catch (e) {}
        }

        let currentSpaceOwner = data.space_owner;
        if (currentSpaceOwner && currentSpaceOwner.nama_pemilik && currentSpaceOwner.nama_pemilik.includes('|||')) {
            const parts = currentSpaceOwner.nama_pemilik.split('|||');
            currentSpaceOwner.nama_pemilik = parts[0];
            try {
                const extra = JSON.parse(parts[1]);
                if (extra.foto) currentSpaceOwner.foto = extra.foto;
                if (extra.alamat && !currentSpaceOwner.alamat) currentSpaceOwner.alamat = extra.alamat;
                if (extra.deskripsi && !currentSpaceOwner.deskripsi) currentSpaceOwner.deskripsi = extra.deskripsi;
            } catch (e) {}
        }

        // 1. Ambil data profil & avatar tersimpan secara permanen dari server
        let serverProfile = null;
        if (uName) {
            try {
                serverProfile = await authService.getServerProfile(uName);
            } catch {
                // Abaikan
            }
        }

        if (serverProfile) {
            memberData = {
                ...(memberData || { id: data.id, nama_member: data.username, instansi: '', alamat: '', telp: '' }),
                nama_member: memberData?.nama_member || serverProfile.nama_member || data.username,
                instansi: (memberData?.instansi !== undefined && memberData?.instansi !== '') ? memberData.instansi : (serverProfile.instansi || ''),
                alamat: (memberData?.alamat !== undefined && memberData?.alamat !== '') ? memberData.alamat : (serverProfile.alamat || ''),
                telp: (memberData?.telp !== undefined && memberData?.telp !== '') ? memberData.telp : (serverProfile.telp || ''),
                foto: memberData?.foto || serverProfile.foto,
            };

            if (typeof window !== 'undefined') {
                if (userKey) {
                    localStorage.setItem(userKey, JSON.stringify(memberData));
                }
                if (avatarKey && memberData.foto) {
                    localStorage.setItem(avatarKey, memberData.foto);
                }
            }
        } else if (typeof window !== 'undefined') {
            // Fallback ke localStorage
            const savedOverrides = userKey ? localStorage.getItem(userKey) : null;
            const savedAvatar = avatarKey ? localStorage.getItem(avatarKey) : null;

            if (savedOverrides) {
                try {
                    const parsed = JSON.parse(savedOverrides);
                    memberData = {
                        ...(memberData || { id: data.id, nama_member: data.username, instansi: '', alamat: '', telp: '' }),
                        ...parsed,
                    };
                } catch (e) {
                    console.error('Gagal memuat profil saat login:', e);
                }
            }

            if (memberData) {
                if (memberData.foto) {
                    if (avatarKey) {
                        localStorage.setItem(avatarKey, memberData.foto);
                    }
                } else if (savedAvatar) {
                    memberData.foto = savedAvatar;
                    if (uName) {
                        authService.updateMemberProfile({
                            nama_member: memberData.nama_member || data.username,
                            instansi: memberData.instansi || '',
                            telp: memberData.telp || '',
                            alamat: memberData.alamat || '',
                            foto: memberData.foto,
                        }).catch(() => {});
                    }
                }
            }
        }

        if (typeof window !== 'undefined') {
            if (avatarKey && memberData?.foto) {
                localStorage.setItem(avatarKey, memberData.foto);
            }
            if (currentSpaceOwner?.foto && uName) {
                localStorage.setItem(`admin_avatar_override_${uName}`, currentSpaceOwner.foto);
            }
            window.dispatchEvent(new Event('member_avatar_updated'));
            window.dispatchEvent(new Event('profile_updated'));
        }

        const userProfile: UserProfile = {
            id: data.id,
            username: data.username,
            role: data.role,
            member: memberData,
            space_owner: currentSpaceOwner,
        };
        setUser(userProfile);

        if (data.role === 'admin_space') {
            router.push('/admin/dashboard');
        } else {
            router.push('/member/spaces');
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        router.push('/Auth/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setUser, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};