'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, MemberData } from '@/types/auth';
import { authService } from '@/services/auth.services';

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

            if (data && typeof window !== 'undefined') {
                const uName = data.username ? data.username.toLowerCase().trim() : '';
                const userKey = uName ? `profile_override_user_${uName}` : null;
                const avatarKey = uName ? `member_avatar_override_${uName}` : null;

                // 1. Ambil data kustom permanen dari server
                let serverProfile = null;
                if (uName) {
                    serverProfile = await authService.getServerProfile(uName);
                }

                if (serverProfile) {
                    data.member = {
                        ...(data.member || { id: data.id, nama_member: data.username, instansi: '', alamat: '', telp: '' }),
                        nama_member: serverProfile.nama_member || data.member?.nama_member || data.username,
                        instansi: serverProfile.instansi !== undefined ? serverProfile.instansi : (data.member?.instansi || ''),
                        alamat: serverProfile.alamat !== undefined ? serverProfile.alamat : (data.member?.alamat || ''),
                        telp: serverProfile.telp !== undefined ? serverProfile.telp : (data.member?.telp || ''),
                        foto: serverProfile.foto || data.member?.foto,
                    };

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
                        if (savedAvatar) {
                            data.member.foto = savedAvatar;
                        } else if (data.member.foto && avatarKey) {
                            localStorage.setItem(avatarKey, data.member.foto);
                        }

                        // Auto-migrasi ke server jika ada data lokal yang belum tersimpan permanen
                        if ((data.member.foto || savedOverrides) && uName) {
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

                if (data.role === 'admin_space') {
                    try {
                        const adminProfRes = await api.get('/api/admin/profile');
                        if (adminProfRes.data?.data) {
                            data.space_owner = {
                                ...data.space_owner,
                                ...adminProfRes.data.data
                            };
                            if (avatarKey && data.space_owner.foto) {
                                localStorage.setItem(`admin_avatar_override_${uName}`, data.space_owner.foto);
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
        localStorage.setItem('token', data.access_token);

        let memberData = data.member;
        const uName = data.username ? data.username.toLowerCase().trim() : '';
        const userKey = uName ? `profile_override_user_${uName}` : null;
        const avatarKey = uName ? `member_avatar_override_${uName}` : null;

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
                nama_member: serverProfile.nama_member || memberData?.nama_member || data.username,
                instansi: serverProfile.instansi !== undefined ? serverProfile.instansi : (memberData?.instansi || ''),
                alamat: serverProfile.alamat !== undefined ? serverProfile.alamat : (memberData?.alamat || ''),
                telp: serverProfile.telp !== undefined ? serverProfile.telp : (memberData?.telp || ''),
                foto: serverProfile.foto || memberData?.foto,
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

            if (savedAvatar && memberData) {
                memberData.foto = savedAvatar;
            } else if (memberData?.foto && avatarKey) {
                localStorage.setItem(avatarKey, memberData.foto);
            }

            // Migrasikan data lokal ke server secara permanen
            if (memberData && uName) {
                authService.updateMemberProfile({
                    nama_member: memberData.nama_member || data.username,
                    instansi: memberData.instansi || '',
                    telp: memberData.telp || '',
                    alamat: memberData.alamat || '',
                    foto: memberData.foto,
                }).catch(() => {});
            }
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('member_avatar_updated'));
            window.dispatchEvent(new Event('profile_updated'));
        }

        const userProfile: UserProfile = {
            id: data.id,
            username: data.username,
            role: data.role,
            member: memberData,
            space_owner: data.space_owner,
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